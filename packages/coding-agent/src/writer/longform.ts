/**
 * Long-form (分节写作) helpers: routing, outline/section file IO and stage instructions.
 * 提纲与小节落在 sections/（工作区，可覆盖；新流程开始时重置）——与 drafts/ 版本链
 * （从不覆盖）并存不冲突；组装出的完整文稿才走 save_draft 版本链。
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseLengthTarget } from "./checker.ts";

export const SECTIONS_DIR = "sections";
export const OUTLINE_FILE = "outline.md";
/** 长文路由阈值：brief/要求里的长度目标达到这个字数就路由到分节流程。 */
export const LONG_FORM_MIN_TARGET = 1000;
/** 一节正文的最短字符数（用纯字符数而不是字数口径，避免非中文脚本被误判为空节）。 */
export const MIN_SECTION_CHARS = 60;
/** 上一节结尾注入下一节指令的长度（衔接用，不必完整重发上一节）。 */
const PREVIOUS_TAIL_CHARS = 600;

export function outlinePath(): string {
	return `${SECTIONS_DIR}/${OUTLINE_FILE}`;
}

export function sectionPathFor(index: number): string {
	return `${SECTIONS_DIR}/section-${String(index).padStart(3, "0")}.md`;
}

/** 长文路由：显式要求 > brief 长度目标 > 本次要求里的长度目标。 */
export function looksLikeLongForm(briefText: string | null, request: string, explicit?: boolean): boolean {
	if (explicit) return true;
	for (const text of [briefText ?? "", request]) {
		const target = text ? parseLengthTarget(text) : null;
		if (target && target.max !== null && target.max >= LONG_FORM_MIN_TARGET) return true;
	}
	return false;
}

export interface SectionPlan {
	title: string;
	points: string[];
}

const SECTION_HEADING = /^(?:#{1,6}\s*)?第\s*\d+\s*节\s*[：:、.．]?\s*(.*)$/;
const MARKDOWN_HEADING = /^#{2,6}\s+(.+)$/;

/** 提纲 → 节计划：`## 第 n 节：标题` 起一节，其下列表行是要点；无节编号时退回任意 ## 标题。 */
export function parseOutline(text: string): SectionPlan[] {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const numbered = collectPlans(lines, SECTION_HEADING);
	if (numbered.length >= 2) return numbered;
	return collectPlans(lines, MARKDOWN_HEADING);
}

function collectPlans(lines: string[], heading: RegExp): SectionPlan[] {
	const plans: SectionPlan[] = [];
	for (const raw of lines) {
		const line = raw.trim();
		const match = heading.exec(line);
		if (match) {
			plans.push({ title: (match[1] ?? "").trim() || "未命名", points: [] });
			continue;
		}
		const point = /^(?:[-*]|\d+[.、．])\s*(.+)$/.exec(line);
		if (point && plans.length > 0) plans[plans.length - 1].points.push(point[1].trim());
	}
	return plans;
}

export async function saveOutline(root: string, text: string): Promise<string> {
	await mkdir(join(root, SECTIONS_DIR), { recursive: true });
	await writeFile(join(root, outlinePath()), `${text.trim()}\n`, "utf-8");
	return outlinePath();
}

export async function readOutline(root: string): Promise<string | null> {
	try {
		return await readFile(join(root, outlinePath()), "utf-8");
	} catch {
		return null;
	}
}

export async function saveSection(root: string, index: number, text: string): Promise<string> {
	await mkdir(join(root, SECTIONS_DIR), { recursive: true });
	await writeFile(join(root, sectionPathFor(index)), `${text.trim()}\n`, "utf-8");
	return sectionPathFor(index);
}

export async function readSection(root: string, index: number): Promise<string | null> {
	try {
		return await readFile(join(root, sectionPathFor(index)), "utf-8");
	} catch {
		return null;
	}
}

/** Reset the scratch files a sectioned flow writes (outline + sections); a NEW flow must not mix with stale ones. */
export async function resetSections(root: string, count = 64): Promise<void> {
	await rm(join(root, outlinePath()), { force: true });
	for (let i = 1; i <= count; i++) {
		await rm(join(root, sectionPathFor(i)), { force: true });
	}
}

/** Assemble the first `count` section files (numeric order) into one manuscript; null when none exist. */
export async function assembleSections(root: string, count: number): Promise<string | null> {
	const parts: string[] = [];
	for (let i = 1; i <= count; i++) {
		const text = await readSection(root, i);
		if (text === null) break;
		parts.push(text.trim());
	}
	if (parts.length === 0) return null;
	return parts.join("\n\n");
}

export interface LengthTarget {
	min: number | null;
	max: number | null;
	raw: string;
}

/** Outline instruction guidance: total target drives the section count, no per-section split yet. */
export function outlineLengthGuidance(target: LengthTarget | null): string {
	if (!target) return "brief 未指定字数口径：分 3-6 节，每节写足内容。";
	const span = `${target.min ?? 0}-${target.max ?? "不限"} 字`;
	return `全篇目标口径「${target.raw}」（${span}）：节数要与篇幅匹配，每节写足内容。`;
}

/** Section instruction guidance: the actual section count splits the total target. */
export function sectionLengthGuidance(target: LengthTarget | null, count: number): string {
	if (!target) return `全篇共 ${count} 节；本节约 400-900 字。`;
	const top = target.max ?? target.min ?? 0;
	return `全篇目标 ${target.min ?? 0}-${top} 字，共 ${count} 节；本节约 ${Math.ceil((target.min ?? 0) / count)}-${Math.ceil(top / count)} 字。`;
}

export interface OutlineContext {
	request: string;
	briefText: string | null;
	lockedSentences: string[];
	sourceFiles: { path: string; name: string }[];
	genreRules: string;
	lengthGuidance: string;
}

export function buildOutlineInstruction(ctx: OutlineContext): string {
	const parts: string[] = [];
	parts.push(`# 本次写作要求\n\n${ctx.request.trim()}`);
	if (ctx.briefText) parts.push(`# brief.md（写作要求）\n\n${ctx.briefText.trim()}`);
	parts.push(`# 体裁规则\n\n${ctx.genreRules.trim()}`);
	if (ctx.lockedSentences.length > 0) {
		parts.push(
			`# locked.md（以下句子必须逐字保留；提纲要安排它们落在某一节）\n\n${ctx.lockedSentences.map((s) => `- ${s}`).join("\n")}`,
		);
	}
	if (ctx.sourceFiles.length > 0) {
		parts.push(
			`# 素材文件（sources/，用 read 工具按需读取，不要凭空想象素材内容）\n\n${ctx.sourceFiles.map((f) => `- ${f.path}`).join("\n")}`,
		);
	} else {
		parts.push("sources/ 目录为空：素材只在本次要求和上面的 brief 中，材料不足就直接指出缺口，不要编造。");
	}
	parts.push(
		`# 你的任务（长文提纲）\n\n这篇文稿篇幅较大，按分节方式写作：先拟提纲，之后每节单独写一轮，最后由程序组装成完整文稿。\n\n${ctx.lengthGuidance.trim()}\n\n提纲要求：\n- 每节用 \`## 第 n 节：标题\` 开头（n 从 1 开始连续编号）。\n- 标题下用列表列出该节的要点、对应素材或证据、以及材料不足需要用户补充的部分。\n- 只写提纲，不写正文；不要加提纲以外的大标题。\n\n最终回复只输出提纲本身，不要调用任何工具。`,
	);
	return parts.join("\n\n");
}

export function buildOutlineRetryInstruction(plansFound: number): string {
	return `你上一次的提纲只解析出 ${plansFound} 个小节，无法按分节方式写作。

请重新输出提纲：每节用 \`## 第 n 节：标题\` 开头（至少 2 节，n 从 1 开始连续编号），标题下用列表给出该节要点。除此之外不要输出任何别的文字（不要大标题、不要正文、不要代码块围栏），不要调用任何工具。`;
}

export interface SectionContext {
	request: string;
	briefText: string | null;
	lockedSentences: string[];
	sourceFiles: { path: string; name: string }[];
	genreRules: string;
	outlineText: string;
	title: string;
	points: string[];
	index: number;
	count: number;
	previousTail: string | null;
	lengthGuidance: string;
	voiceDescription?: string | null;
	voiceFiles?: { path: string; name: string; content: string }[];
	/** 输出格式要求（formats.ts 注册表）；null 未设置。 */
	formatInstruction?: string | null;
}

export function buildSectionInstruction(ctx: SectionContext): string {
	const parts: string[] = [];
	parts.push(`# 本次写作要求\n\n${ctx.request.trim()}`);
	if (ctx.briefText) parts.push(`# brief.md（写作要求）\n\n${ctx.briefText.trim()}`);
	parts.push(`# 体裁规则\n\n${ctx.genreRules.trim()}`);
	parts.push(
		"# 语言纪律\n\n正文用本次要求的目标语言写，整篇保持同一语言：要求中文时不夹英文词（代码、命令、术语与专有名词除外）。材料或用户原话里的外语引文保留原样。",
	);
	if (ctx.lockedSentences.length > 0) {
		parts.push(`# locked.md（以下句子必须逐字保留）\n\n${ctx.lockedSentences.map((s) => `- ${s}`).join("\n")}`);
	}
	if (ctx.sourceFiles.length > 0) {
		parts.push(
			`# 素材文件（sources/，用 read 工具按需读取，不要凭空想象素材内容）\n\n${ctx.sourceFiles.map((f) => `- ${f.path}`).join("\n")}`,
		);
	}
	if (ctx.voiceFiles && ctx.voiceFiles.length > 0) {
		parts.push(
			`# 文风样本（voice/，文风样本优先于通用风格规则）\n\n${ctx.voiceFiles.map((f) => `## ${f.name}\n\n${f.content.trim()}`).join("\n\n")}`,
		);
	}
	if (ctx.voiceDescription) {
		parts.push(`# 文风要求\n\n${ctx.voiceDescription.trim()}`);
	}
	if (ctx.formatInstruction) {
		parts.push(`# 输出格式\n\n${ctx.formatInstruction.trim()}`);
	}
	parts.push(`# 全篇提纲（共 ${ctx.count} 节）\n\n${ctx.outlineText.trim()}\n\n当前要写的是第 ${ctx.index} 节。`);
	if (ctx.previousTail) {
		parts.push(`# 上一节结尾（衔接用，不要重复）\n\n${ctx.previousTail.trim()}`);
	}
	const points = ctx.points.length > 0 ? `按提纲要点写这一节：\n${ctx.points.map((p) => `- ${p}`).join("\n")}\n` : "";
	parts.push(
		`# 你的任务（第 ${ctx.index}/${ctx.count} 节：${ctx.title}）\n\n${points}${ctx.lengthGuidance.trim()}\n- 与上一节自然衔接，不要重复提纲或上一节的内容。\n- locked.md 的原句若安排在本节，逐字保留；基于素材写，不编造事实。\n- 这一节只写一轮：最终回复只输出本节正文（以 \`## 第 ${ctx.index} 节：${ctx.title}\` 开头），不要说明文字，不要调用任何工具。`,
	);
	return parts.join("\n\n");
}

export function buildSectionRetryInstruction(index: number, count: number): string {
	return `你上一条回复没有给出可用的正文。请重新写第 ${index}/${count} 节：最终回复只输出该节正文（以 \`## 第 ${index} 节：\` 开头），不要说明文字，不要调用任何工具。`;
}

/** Tail of the previous section, injected into the next section instruction for continuity. */
export function previousSectionTail(text: string | null): string | null {
	if (text === null) return null;
	const trimmed = text.trim();
	if (trimmed.length === 0) return null;
	return trimmed.slice(-PREVIOUS_TAIL_CHARS);
}
