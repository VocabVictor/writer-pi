/**
 * Long-form support (长文支持) shared by the genre configs and the program checker.
 * 字数口径（8 语言）、长文检测与规则注入（结构/节奏/线索）、长文程序检查（过长段落、
 * 跨段近似重复、等长段落、待补残留）都只在这里定义一份；checker.ts 依赖本模块，
 * 避免口径和阈值出现两个来源。
 */

import { splitParagraphs } from "../project.ts";
import type { GenreChecks, GenreConfig } from "./types.ts";

// ===========================================================================
// 字数口径（8 语言：中/英/日/法/西/韩/俄/阿拉伯）
// ===========================================================================

const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/g;
const KANA_RE = /[ぁ-ヿ]/g;
const HANGUL_RE = /[가-힣]/g;
const LETTER_RUN_RE = /[\p{L}\p{M}]+/gu;
const DIGIT_GROUP_RE = /\d+/g;

export interface WordCounts {
	wordCount: number;
	cjkChars: number;
	kanaChars: number;
	hangulChars: number;
	latinWords: number;
	digitGroups: number;
	totalCharsNoWhitespace: number;
}

/**
 * 字数统计口径（写清楚，供 brief 长度目标使用）：
 * - 表意/音节文字（汉字、日语假名、韩语谚文）按字符计——不用空格分词，字符即意义单位；
 * - 字母文字（拉丁、西里尔、阿拉伯文）按词计——连续字母段算一个词，变音符号（é、ّ）并入词内；
 * - 数字按组计。口径对齐 Word 对中英混排文本的“字数”。
 */
export function countWords(text: string): WordCounts {
	const cjkChars = (text.match(CJK_RE) ?? []).length;
	const kanaChars = (text.match(KANA_RE) ?? []).length;
	const hangulChars = (text.match(HANGUL_RE) ?? []).length;
	let latinWords = 0;
	for (const run of text.matchAll(LETTER_RUN_RE)) {
		// 表意/音节文字已按字符统计，从词段中剔除避免重复计。
		if (run[0].replace(CJK_RE, "").replace(KANA_RE, "").replace(HANGUL_RE, "").length > 0) latinWords += 1;
	}
	const digitGroups = (text.match(DIGIT_GROUP_RE) ?? []).length;
	const totalCharsNoWhitespace = text.replace(/\s/g, "").length;
	return {
		wordCount: cjkChars + kanaChars + hangulChars + latinWords + digitGroups,
		cjkChars,
		kanaChars,
		hangulChars,
		latinWords,
		digitGroups,
		totalCharsNoWhitespace,
	};
}

// ===========================================================================
// 长文检测与规则注入
// ===========================================================================

const LONG_FORM_BRIEF_RE = /(长文|长篇|中篇|连载|多章|系列文章|数千字|上万?字)/;

/** 字数达到体裁阈值，或 brief 明确要求长文/长篇时视为长文。 */
export function isLongForm(genre: GenreConfig, wordCount: number, briefText?: string | null): boolean {
	const rules = genre.longForm;
	if (!rules) return false;
	if (briefText && LONG_FORM_BRIEF_RE.test(briefText)) return true;
	return wordCount >= rules.threshold;
}

/** 语义检查的长文维度（模型判断），非长文返回空数组，由流程代码并入 reviewFocus。 */
export function longFormFocus(genre: GenreConfig, wordCount: number, briefText?: string | null): string[] {
	if (!isLongForm(genre, wordCount, briefText)) return [];
	const rules = genre.longForm!;
	return [
		...rules.structure.map((line) => `【长文·结构】${line}`),
		...rules.pacing.map((line) => `【长文·节奏】${line}`),
		...rules.tracking.map((line) => `【长文·线索】${line}`),
	];
}

/** 起草指令的长文规则块，非长文返回空串，由流程代码按需注入。 */
export function renderLongFormRules(genre: GenreConfig, wordCount: number, briefText?: string | null): string {
	if (!isLongForm(genre, wordCount, briefText)) return "";
	const rules = genre.longForm!;
	const groups: [string, string[]][] = [
		["结构", rules.structure],
		["节奏", rules.pacing],
		["线索", rules.tracking],
	];
	const body = groups
		.filter(([, lines]) => lines.length > 0)
		.map(([label, lines]) => `- ${label}：\n${lines.map((line) => `  - ${line}`).join("\n")}`)
		.join("\n");
	return `## 长文规则（本篇约 ${wordCount} 字）\n\n以下规则只约束长文的组织、节奏与线索；与用户当轮要求冲突时以用户要求为准。\n\n${body}`;
}

// ===========================================================================
// 长文程序检查（确定性线索，按 GenreChecks.longForm 开关运行）
// ===========================================================================

const DEFAULT_MAX_PARAGRAPH_CHARS = 500;
const MIN_NEAR_DUP_CHARS = 12;
/** 字符二元组 overlap 系数（|A∩B| / min(|A|,|B|)）达到该值视为近似重复。 */
const NEAR_DUP_SIMILARITY = 0.75;
const NEAR_DUP_LENGTH_RATIO = 0.5;
const MIN_UNIFORM_PARAGRAPH_CHARS = 100;
const UNIFORM_TOLERANCE = 0.2;
const MIN_UNIFORM_RUN = 4;
const MAX_NEAR_DUP_RESULTS = 20;
const PENDING_MARKER_RE = /【待补[：:][^】]{1,40}】/g;

export interface LongFormChecks {
	/** 单段字数上限；0 = 长文程序检查未启用。 */
	maxParagraphChars: number;
	/** 超过单段上限的段落（长文节奏线索）。 */
	longParagraphs: { paragraph: number; chars: number }[];
	/** 跨段落近似重复句（跨章节冗余线索；首现段落 → 重复段落）。 */
	nearDuplicateSentences: { quote: string; firstParagraph: number; secondParagraph: number; similarity: number }[];
	/** 连续多段长度几乎一致的公式化节奏线索。 */
	uniformParagraphRuns: { startParagraph: number; count: number; chars: number }[];
	/** 残留的【待补：…】标记（材料补齐后要回收）。 */
	pendingMarkers: { marker: string; paragraph: number }[];
}

/** Run the long-form checks the genre asks for; not enabled → all empty. */
export function runLongFormChecks(text: string, checks: GenreChecks): LongFormChecks {
	if (!checks.longForm?.enabled) {
		return {
			maxParagraphChars: 0,
			longParagraphs: [],
			nearDuplicateSentences: [],
			uniformParagraphRuns: [],
			pendingMarkers: [],
		};
	}
	const maxParagraphChars = checks.longForm.maxParagraphChars ?? DEFAULT_MAX_PARAGRAPH_CHARS;
	return {
		maxParagraphChars,
		longParagraphs: checkLongParagraphs(text, maxParagraphChars),
		// 体裁对重复检测关闭（fiction/poetry）时，有意重复的意象与口头禅不进近似重复检查。
		nearDuplicateSentences: checks.duplicates === "off" ? [] : checkNearDuplicateSentences(text),
		uniformParagraphRuns: checkUniformParagraphs(text),
		pendingMarkers: checkPendingMarkers(text),
	};
}

/** 过长段落：单段字数（中文字符+英文单词+数字组）超过上限。 */
export function checkLongParagraphs(text: string, maxChars: number): { paragraph: number; chars: number }[] {
	const result: { paragraph: number; chars: number }[] = [];
	splitParagraphs(text).forEach((p, i) => {
		const chars = countWords(p).wordCount;
		if (chars > maxChars) result.push({ paragraph: i + 1, chars });
	});
	return result;
}

/** Count non-overlapping occurrences of a literal string; shared by checker 与 AI 味词表统计. */
export function countOccurrences(text: string, needle: string): number {
	let count = 0;
	let idx = text.indexOf(needle);
	while (idx !== -1) {
		count += 1;
		idx = text.indexOf(needle, idx + needle.length);
	}
	return count;
}

/** Sentences split on terminal punctuation (含 ASCII 句号与阿拉伯问号 ؟) and line breaks; shared by both duplicate checks. */
export function splitSentences(text: string): string[] {
	return text
		.replace(/\r\n/g, "\n")
		.split(/(?<=[。！？!?.\n؟])/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

interface SentenceUnit {
	raw: string;
	normalized: string;
	paragraph: number;
}

const PUNCT_RE = /[\s\p{P}\p{S}]/gu;

function sentenceUnits(text: string): SentenceUnit[] {
	const units: SentenceUnit[] = [];
	splitParagraphs(text).forEach((p, i) => {
		for (const s of splitSentences(p)) {
			const normalized = s.replace(PUNCT_RE, "");
			if (normalized.length < MIN_NEAR_DUP_CHARS) continue;
			units.push({ raw: s, normalized, paragraph: i + 1 });
		}
	});
	return units;
}

function bigramSet(normalized: string, cache: Map<string, Set<string>>): Set<string> {
	const cached = cache.get(normalized);
	if (cached) return cached;
	const set = new Set<string>();
	for (let i = 0; i < normalized.length - 1; i++) set.add(normalized.slice(i, i + 2));
	cache.set(normalized, set);
	return set;
}

/** 字符二元组 overlap 系数：比 Jaccard 更适合「同一句话换个说法」这种长短相近的比较。 */
function bigramOverlap(a: string, b: string, cache: Map<string, Set<string>>): number {
	const A = bigramSet(a, cache);
	const B = bigramSet(b, cache);
	if (A.size === 0 && B.size === 0) return a === b ? 1 : 0;
	let shared = 0;
	for (const gram of A) if (B.has(gram)) shared += 1;
	return shared / Math.min(A.size, B.size);
}

/** 跨段落近似重复句：跨章节把同一句话换个说法再讲一遍的冗余线索。 */
export function checkNearDuplicateSentences(
	text: string,
): { quote: string; firstParagraph: number; secondParagraph: number; similarity: number }[] {
	const units = sentenceUnits(text);
	const cache = new Map<string, Set<string>>();
	const reported = new Set<string>();
	const dups: { quote: string; firstParagraph: number; secondParagraph: number; similarity: number }[] = [];
	for (let i = 0; i < units.length; i++) {
		for (let j = i + 1; j < units.length; j++) {
			const a = units[i].normalized;
			const b = units[j].normalized;
			// 长度差过大的句子对只是短语复用，不算重复。
			if (Math.min(a.length, b.length) / Math.max(a.length, b.length) < NEAR_DUP_LENGTH_RATIO) continue;
			const similarity = bigramOverlap(a, b, cache);
			if (similarity < NEAR_DUP_SIMILARITY) continue;
			const raw = units[j].raw;
			if (reported.has(raw)) continue;
			reported.add(raw);
			dups.push({
				quote: raw.slice(0, 80),
				firstParagraph: units[i].paragraph,
				secondParagraph: units[j].paragraph,
				similarity: Math.round(similarity * 100) / 100,
			});
			if (dups.length >= MAX_NEAR_DUP_RESULTS) return dups;
		}
	}
	return dups;
}

/** 连续多段长度几乎一致：公式化节奏（每段都差不多长）的线索；短段（对话/列表）不参与。 */
export function checkUniformParagraphs(text: string): { startParagraph: number; count: number; chars: number }[] {
	const counts = splitParagraphs(text).map((p) => countWords(p).wordCount);
	const runs: { startParagraph: number; count: number; chars: number }[] = [];
	let start = 0;
	while (start < counts.length) {
		if (counts[start] < MIN_UNIFORM_PARAGRAPH_CHARS) {
			start += 1;
			continue;
		}
		let end = start + 1;
		while (end < counts.length && Math.abs(counts[end] - counts[start]) <= counts[start] * UNIFORM_TOLERANCE) {
			end += 1;
		}
		if (end - start >= MIN_UNIFORM_RUN) {
			runs.push({ startParagraph: start + 1, count: end - start, chars: counts[start] });
		}
		start = end;
	}
	return runs;
}

/** 残留的【待补：…】标记：材料补齐后要回收，交付前要向用户说明。 */
export function checkPendingMarkers(text: string): { marker: string; paragraph: number }[] {
	const paragraphs = splitParagraphs(text);
	const found = new Map<string, number>();
	for (const m of text.matchAll(PENDING_MARKER_RE)) {
		if (found.has(m[0])) continue;
		const idx = paragraphs.findIndex((p) => p.includes(m[0]));
		found.set(m[0], idx === -1 ? 1 : idx + 1);
	}
	return [...found.entries()].map(([marker, paragraph]) => ({ marker, paragraph }));
}
