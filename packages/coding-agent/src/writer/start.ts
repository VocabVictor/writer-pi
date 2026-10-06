/**
 * Flow-start helpers: resolve the three dimensions (genre / voice / operation), assemble
 * the first instruction of a /draft, /continue, /outline or /revise run
 * (project context, brief seeding, baseline draft resolution, voice samples).
 */

import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { SettingsManager } from "../core/settingsmanager.ts";
import { parseLengthTarget } from "./checker.ts";
import { formatInstruction, getFormat, OUTPUT_FORMATS } from "./formats.ts";
import { getGenre, getGenreOrFallback, inferGenre } from "./genres/index.ts";
import type { GenreConfig } from "./genres/types.ts";
import { operationGuidance, renderGenreRules } from "./instructions.ts";
import { buildOutlineInstruction, looksLikeLongForm, outlineLengthGuidance } from "./longform.ts";
import {
	BRIEF_FILE,
	CONTEXT_DIR,
	ensureProject,
	listTextFiles,
	readProjectFile,
	readState,
	updateState,
	writeFile,
} from "./project.ts";
import { buildDraftInstruction, buildReviseStartInstruction } from "./prompts.ts";
import { loadWriterContext } from "./review.ts";
import type { StartOptions, WriterOperation } from "./types.ts";
import { readDraft, saveDraft } from "./versions.ts";

const VOICE_SAMPLE_LIMIT = 8000;

export interface StartPreparation {
	instruction: string;
	toolset: string[];
	genre: GenreConfig;
	genreReason: "explicit" | "brief" | "clues" | "previous" | "fallback";
	voiceDescription: string | null;
	/** Set when a revise run resolved its baseline draft. */
	draftPath?: string;
	/** True when the run routes into the sectioned (long-form) pipeline. */
	longForm?: boolean;
}

type Notify = (message: string, type?: "info" | "warning" | "error") => void;

export async function prepareFlowStart(
	root: string,
	operation: WriterOperation,
	request: string,
	options?: StartOptions,
	notify: Notify = () => {},
): Promise<StartPreparation | null> {
	await ensureProject(root);
	const ctx = await loadWriterContext(root);
	const defaults = loadWriterDefaults(root);

	// --- 三个维度在状态锁内一次落盘（并发流程轮写方自动排队）
	const { state, genre, voiceDescription, inference } = await updateState(root, (s) => {
		// genre dimension: explicit > brief declaration > material clues > previous > settings 默认 > fallback
		const inference = inferGenre({
			explicit: options?.genre ?? null,
			briefText: ctx.briefText,
			hintText: request,
			previous: s.genre,
		});
		const genre =
			inference.reason === "fallback" && defaults.defaultGenre
				? (getGenre(defaults.defaultGenre) ?? inference.genre)
				: inference.genre;
		s.genre = genre.id;

		// voice dimension: explicit > previous setting > none ("sample" = voice/ files)
		const voiceSetting = options?.voice !== undefined ? options.voice : (s.voice ?? null);
		s.voice = voiceSetting;

		// format dimension: explicit > settings 默认 > none（未知格式告警并忽略）
		if (options?.format && !getFormat(options.format)) {
			notify(`未知输出格式：${options.format}。可用：${OUTPUT_FORMATS.map((f) => f.id).join("、")}`, "warning");
		}
		const formatSetting = options?.format ?? defaults.defaultFormat ?? null;
		s.format = getFormat(formatSetting)?.id ?? null;

		return { state: s, genre, inference, voiceDescription: resolveVoice(voiceSetting) };
	});

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

	// --- long-form routing: 长度目标达到阈值（或显式 --long）时先提纲、逐节写、最后组装
	if (looksLikeLongForm(ctx.briefText, request, options?.long)) {
		const instruction = buildOutlineInstruction({
			request,
			briefText: ctx.briefText,
			lockedSentences: ctx.lockedSentences,
			sourceFiles: ctx.sourceFiles,
			genreRules,
			lengthGuidance: outlineLengthGuidance(parseLengthTarget(ctx.briefText ?? "")),
		});
		return {
			instruction,
			toolset: ["read", ...(genre.tools.includes("update_context") ? ["update_context"] : [])],
			genre,
			genreReason: inference.reason,
			voiceDescription,
			longForm: true,
		};
	}

	const useSamples = state.voice === "sample";
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
		formatInstruction: formatInstruction(state.format),
		defaultTemplate: defaults.defaultTemplate ?? null,
	});
	return { instruction, toolset, genre, genreReason: inference.reason, voiceDescription };
}

/** Writer defaults from settings.json: project (.pi/settings.json) overrides the global ones. */
function loadWriterDefaults(root: string): { defaultGenre?: string; defaultTemplate?: string; defaultFormat?: string } {
	const { defaultGenre, defaultTemplate, defaultFormat } = SettingsManager.create(root).getSettings();
	return { defaultGenre, defaultTemplate, defaultFormat };
}

/** Voice value semantics: "sample" → voice/ samples; other text → a description; null → none. */
export function resolveVoice(voice: string | null | undefined): string | null {
	if (typeof voice === "string" && voice !== "sample" && voice.length > 0) return voice;
	return null;
}

/** Create the genre's persistent context files (never overwrites existing ones). */
export async function ensureGenreContext(root: string, genre: GenreConfig): Promise<string[]> {
	if (!genre.context) return [];
	// Projects scaffolded before context/ joined the standard layout don't have it yet.
	await mkdir(join(root, CONTEXT_DIR), { recursive: true });
	const created: string[] = [];
	for (const f of genre.context.files) {
		const abs = join(root, CONTEXT_DIR, f.file);
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

export async function loadVoiceFiles(
	root: string,
	limit = VOICE_SAMPLE_LIMIT,
): Promise<{ path: string; name: string; content: string }[]> {
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
async function resolveBaseDraft(
	root: string,
	baseDraftPath: string | undefined,
	notify: Notify,
): Promise<{ path: string; text: string } | null> {
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
