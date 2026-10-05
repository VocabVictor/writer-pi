/**
 * Writing project layout on disk. The user's current working directory IS the writing project.
 *
 *   brief.md      — 写作要求（目标读者、用途、长度、语气、限制、禁用词）
 *   sources/      — 用户提供的事实、素材和已有稿件
 *   voice/        — 用户提供文风样本
 *   locked.md     — 明确要求保留的原句与判断
 *   drafts/       — 每一轮完整文稿（draft-001.md …，从不覆盖）
 *   reviews/      — 检查意见与修改摘要（review-001.json …）
 *   state.json    — 当前草稿版本、任务阶段等状态
 */

import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import type { WriterState } from "./types.ts";

/** Re-exported for flow.ts to write project files with the same conventions. */
export { writeFile };

export const BRIEF_FILE = "brief.md";
export const LOCKED_FILE = "locked.md";
export const SOURCES_DIR = "sources";
export const VOICE_DIR = "voice";
export const DRAFTS_DIR = "drafts";
export const REVIEWS_DIR = "reviews";
export const STATE_FILE = "state.json";

const STATE_VERSION = 1;

export interface SourceFile {
	/** Path relative to the project root. */
	path: string;
	name: string;
}

export function initialState(): WriterState {
	return {
		version: STATE_VERSION,
		stage: "idle",
		mode: null,
		currentDraft: null,
		draftCount: 0,
		reviewCount: 0,
		revisionRounds: 0,
		genre: null,
		voice: null,
		lastRequest: null,
		updatedAt: new Date().toISOString(),
	};
}

const BRIEF_TEMPLATE = `# 写作要求

<!-- 在这里描述：目标读者、用途、长度（如 500-800 字）、语气、禁用词及其他限制。
     示例：
     - 目标读者：同事
     - 用途：邮件
     - 长度：300 字以内
     - 语气：礼貌但明确
     - 禁用词：赋能、抓手
-->

# 长度

# 禁用词
`;

const LOCKED_TEMPLATE = `# 锁定原句

<!-- 每行一条。这些句子必须原样保留在文稿中，含义不得改变。
     示例：
     - 我当时不想答应，只是怕直接拒绝让场面难看。
-->
`;

export async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/** Create the project skeleton for missing pieces. Existing files are never touched. Returns created paths. */
export async function ensureProject(root: string): Promise<string[]> {
	const created: string[] = [];
	const dirs = [SOURCES_DIR, VOICE_DIR, DRAFTS_DIR, REVIEWS_DIR];
	for (const dir of dirs) {
		const p = join(root, dir);
		if (!(await fileExists(p))) {
			await mkdir(p, { recursive: true });
			created.push(dir + "/");
		}
	}
	for (const [file, template] of [
		[BRIEF_FILE, BRIEF_TEMPLATE],
		[LOCKED_FILE, LOCKED_TEMPLATE],
	] as const) {
		const p = join(root, file);
		if (!(await fileExists(p))) {
			await writeFile(p, template, "utf-8");
			created.push(file);
		}
	}
	const statePath = join(root, STATE_FILE);
	if (!(await fileExists(statePath))) {
		await writeState(root, initialState());
		created.push(STATE_FILE);
	}
	return created;
}

export async function readState(root: string): Promise<WriterState> {
	const p = join(root, STATE_FILE);
	try {
		const raw = await readFile(p, "utf-8");
		const parsed = JSON.parse(raw) as Partial<WriterState>;
		if (parsed.version !== STATE_VERSION) return initialState();
		return { ...initialState(), ...parsed, version: STATE_VERSION };
	} catch {
		return initialState();
	}
}

export async function writeState(root: string, state: WriterState): Promise<void> {
	state.updatedAt = new Date().toISOString();
	await writeFile(join(root, STATE_FILE), JSON.stringify(state, null, "\t") + "\n", "utf-8");
}

export async function readBrief(root: string): Promise<string | null> {
	try {
		return await readFile(join(root, BRIEF_FILE), "utf-8");
	} catch {
		return null;
	}
}

/** List text files directly inside sources/ or voice/ (no recursion, keeps things predictable). */
export async function listTextFiles(root: string, dir: string): Promise<SourceFile[]> {
	const abs = join(root, dir);
	if (!(await fileExists(abs))) return [];
	const entries = await readdir(abs, { withFileTypes: true });
	const files: SourceFile[] = [];
	for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (!e.isFile()) continue;
		if (!/\.(md|markdown|txt)$/i.test(e.name)) continue;
		files.push({ path: `${dir}/${e.name}`, name: e.name });
	}
	return files;
}

export async function readProjectFile(root: string, relPath: string): Promise<string | null> {
	try {
		return await readFile(join(root, relPath), "utf-8");
	} catch {
		return null;
	}
}

/**
 * locked.md → locked sentences. One sentence per line; "- " / "* " / "1. " list markers are
 * stripped; markdown headings and HTML comment blocks (<!-- … -->) are ignored.
 * Empty lines are skipped.
 */
export function parseLockedSentences(lockedText: string): string[] {
	const sentences: string[] = [];
	let inComment = false;
	for (const rawLine of lockedText.split(/\r?\n/)) {
		let line = rawLine.trim();
		// Strip HTML comments, including multi-line blocks.
		while (true) {
			if (inComment) {
				const end = line.indexOf("-->");
				if (end === -1) {
					line = "";
					break;
				}
				line = line.slice(end + 3).trim();
				inComment = false;
				continue;
			}
			const start = line.indexOf("<!--");
			if (start === -1) break;
			const rest = line.slice(start + 4);
			const end = rest.indexOf("-->");
			if (end === -1) {
				line = line.slice(0, start);
				inComment = true;
				break;
			}
			line = (line.slice(0, start) + rest.slice(end + 3)).trim();
		}
		if (!line || line.startsWith("#")) continue;
		const stripped = line.replace(/^(?:[-*]|\d+\.)\s+/, "").trim();
		if (stripped) sentences.push(stripped);
	}
	return sentences;
}

/** Split a document into paragraphs the same way every stage does (blank-line separated). */
export function splitParagraphs(text: string): string[] {
	return text
		.replace(/\r\n/g, "\n")
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}
