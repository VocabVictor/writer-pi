/**
 * Flow-start helpers: assemble the first instruction of a /draft, /revise or /voice run
 * (project context, brief seeding, baseline draft resolution, voice samples).
 */

import { ensureProject, readState, readProjectFile, listTextFiles, writeFile, BRIEF_FILE } from "./project.ts";
import { saveDraft, readDraft } from "./versions.ts";
import { loadWriterContext } from "./flow-review.ts";
import { buildDraftInstruction, buildReviseStartInstruction } from "./prompts.ts";
import type { WriterMode } from "./types.ts";

const VOICE_SAMPLE_LIMIT = 8000;

export interface StartPreparation {
	instruction: string;
	toolset: string[];
	/** Set when a revise/voice-revise run resolved its baseline draft. */
	draftPath?: string;
	/** Set when the baseline had to be imported from outside drafts/. */
	draftCountBumped?: boolean;
}

export async function prepareFlowStart(
	root: string,
	mode: WriterMode,
	request: string,
	options?: { baseDraftPath?: string; voiceRevise?: boolean },
	notify: Notify = () => {},
): Promise<StartPreparation | null> {
	await ensureProject(root);
	const ctx = await loadWriterContext(root);

	if (mode === "revise" || (mode === "voice" && options?.voiceRevise)) {
		const base = await resolveBaseDraft(root, options?.baseDraftPath, notify);
		if (!base) return null;
		const instruction = buildReviseStartInstruction({
			request,
			draftPath: base.path,
			draftText: base.text,
			briefText: ctx.briefText,
			lockedSentences: ctx.lockedSentences,
		});
		return {
			instruction,
			toolset: ["read", "save_draft", "revise_paragraph"],
			draftPath: base.path,
			draftCountBumped: base.bumped,
		};
	}

	// draft, or voice drafting a new piece: a brief without real content is seeded with the request
	let briefCreated = false;
	if (ctx.briefWasEmpty) {
		await writeFile(`${root}/${BRIEF_FILE}`, `# 写作要求\n\n${request}\n`);
		briefCreated = true;
		ctx.briefText = `# 写作要求\n\n${request}`;
	}
	const voiceFiles = mode === "voice" ? await loadVoiceFiles(root) : [];
	const instruction = buildDraftInstruction({
		request,
		mode: mode === "voice" ? "voice" : "draft",
		briefText: ctx.briefText,
		lockedSentences: ctx.lockedSentences,
		sourceFiles: ctx.sourceFiles,
		voiceFiles,
		briefCreated,
	});
	return { instruction, toolset: ["read", "save_draft"] };
}

interface BaseDraft {
	path: string;
	text: string;
	/** True when the baseline was imported as a new version (draftCount grew). */
	bumped?: boolean;
}

/** Resolve the manuscript a revise/voice-revise flow should operate on. */
type Notify = (message: string, type?: "info" | "warning" | "error") => void;

async function resolveBaseDraft(root: string, baseDraftPath: string | undefined, notify: Notify): Promise<BaseDraft | null> {
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
			return { path: saved.path, text: content, bumped: true };
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
