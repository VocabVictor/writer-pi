/**
 * Flow-start helpers: resolve the three dimensions (genre / voice / operation), assemble
 * the first instruction of a /draft, /continue, /outline or /revise run
 * (project context, brief seeding, baseline draft resolution, voice samples).
 */

import { stat } from "node:fs/promises";
import { ensureProject, readState, readProjectFile, listTextFiles, writeState, writeFile, BRIEF_FILE } from "./project.ts";
import { saveDraft, readDraft } from "./versions.ts";
import { loadWriterContext } from "./flow-review.ts";
import { buildDraftInstruction, buildReviseStartInstruction } from "./prompts.ts";
import { renderGenreRules, operationGuidance } from "./genre-instructions.ts";
import { getGenreOrFallback, inferGenre } from "./genres/index.ts";
import type { GenreConfig } from "./genres/types.ts";
import type { WriterOperation } from "./types.ts";

const VOICE_SAMPLE_LIMIT = 8000;

export interface StartPreparation {
	instruction: string;
	toolset: string[];
	genre: GenreConfig;
	genreReason: "explicit" | "brief" | "clues" | "previous" | "fallback";
	voiceDescription: string | null;
	/** Set when a revise run resolved its baseline draft. */
	draftPath?: string;
}

type Notify = (message: string, type?: "info" | "warning" | "error") => void;

export async function prepareFlowStart(
	root: string,
	operation: WriterOperation,
	request: string,
	options?: { baseDraftPath?: string; genre?: string; voice?: string | null },
	notify: Notify = () => {},
): Promise<StartPreparation | null> {
	await ensureProject(root);
	const state = await readState(root);
	const ctx = await loadWriterContext(root);

	// --- genre dimension: explicit > brief declaration > material clues > previous > fallback
	const inference = inferGenre({
		explicit: options?.genre ?? null,
		briefText: ctx.briefText,
		hintText: request,
		previous: state.genre,
	});
	const genre = inference.genre;
	state.genre = genre.id;
	await writeState(root, state);

	// --- voice dimension: explicit > previous setting > none ("sample" = voice/ files)
	const voiceSetting = options?.voice !== undefined ? options.voice : (state.voice ?? null);
	state.voice = voiceSetting;
	const voiceDescription = resolveVoice(voiceSetting);
	await writeState(root, state);

	// --- create the genre's persistent context files on first use (never overwrites)
	await ensureGenreContext(root, genre);

	const genreRules = renderGenreRules(genre);
	const guidance = operationGuidance(genre, operation);
	const toolset = ["read", "save_draft", ...(genre.tools.includes("update_context") ? ["update_context"] : [])];

	if (operation === "revise") {
		const base = await resolveBaseDraft(root, options?.baseDraftPath, notify);
		if (!base) return null;
		const instruction = buildReviseStartInstruction({
			request,
			draftPath: base.path,
			draftText: base.text,
			briefText: ctx.briefText,
			lockedSentences: ctx.lockedSentences,
			genreRules,
		});
		return {
			instruction,
			toolset: [...toolset, "revise_paragraph"],
			genre,
			genreReason: inference.reason,
			voiceDescription,
			draftPath: base.path,
		};
	}

	// draft / continue / outline: a brief without real content is seeded with the request
	let briefCreated = false;
	if (ctx.briefWasEmpty) {
		await writeFile(`${root}/${BRIEF_FILE}`, `# 写作要求\n\n${request}\n`);
		briefCreated = true;
		ctx.briefText = `# 写作要求\n\n${request}`;
	}
	const useSamples = voiceSetting === "sample";
	const voiceFiles = useSamples ? await loadVoiceFiles(root) : [];
	const instruction = buildDraftInstruction({
		request,
		operation,
		briefText: ctx.briefText,
		lockedSentences: ctx.lockedSentences,
		sourceFiles: ctx.sourceFiles,
		voiceFiles,
		voiceDescription,
		genreRules,
		operationGuidance: guidance,
		briefCreated,
	});
	return { instruction, toolset, genre, genreReason: inference.reason, voiceDescription };
}

/** Voice value semantics: "sample" → voice/ samples; other text → a description; null → none. */
function resolveVoice(voice: string | null | undefined): string | null {
	if (typeof voice === "string" && voice !== "sample" && voice.length > 0) return voice;
	return null;
}

/** Create the genre's persistent context files (never overwrites existing ones). */
export async function ensureGenreContext(root: string, genre: GenreConfig): Promise<string[]> {
	if (!genre.context) return [];
	const created: string[] = [];
	for (const f of genre.context.files) {
		const abs = `${root}/context/${f.file}`;
		if (await fileExists(abs)) continue;
		await writeFile(abs, f.template, "utf-8");
		created.push(abs);
	}
	return created;
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function loadVoiceFiles(root: string, limit = VOICE_SAMPLE_LIMIT): Promise<{ path: string; name: string; content: string }[]> {
	const files = await listTextFiles(root, "voice");
	const loaded: { path: string; name: string; content: string }[] = [];
	for (const f of files) {
		const content = await readProjectFile(root, f.path);
		if (content === null) continue;
		const trimmed = content.trim();
		loaded.push({
			path: f.path,
			name: f.name,
			content: trimmed.length > limit ? `${trimmed.slice(0, limit)}（截断）` : trimmed,
		});
	}
	return loaded;
}

/** Resolve the manuscript a revise flow should operate on. */
async function resolveBaseDraft(root: string, baseDraftPath: string | undefined, notify: Notify): Promise<{ path: string; text: string } | null> {
	const state = await readState(root);
	if (baseDraftPath) {
		if (!baseDraftPath.startsWith("drafts/")) {
			// Outside drafts/: import it as the baseline version (original file untouched).
			const content = await readProjectFile(root, baseDraftPath);
			if (content === null) {
				notify(`找不到文件：${baseDraftPath}（按项目根目录 ${root} 解析）`, "error");
				return null;
			}
			const saved = await saveDraft(root, content, `imported from ${baseDraftPath} as revise baseline`);
			return { path: saved.path, text: content };
		}
		const content = await readDraft(root, baseDraftPath);
		if (content === null) {
			notify(`找不到文稿：${baseDraftPath}`, "error");
			return null;
		}
		return { path: baseDraftPath, text: content };
	}
	if (state.currentDraft) {
		const content = await readDraft(root, state.currentDraft);
		if (content !== null) return { path: state.currentDraft, text: content };
	}
	return null;
}

export { getGenreOrFallback };
