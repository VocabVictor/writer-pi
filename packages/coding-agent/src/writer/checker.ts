/**
 * Programmatic checks (检查机制 A). These are deterministic hints computed from the draft
 * text — they are leads for the semantic review, not a verdict on writing quality.
 *
 * Word-count convention (中文优先): 字数 = CJK characters + latin words + digit groups.
 * A run of latin letters counts as one word (like Word's "字数" for mixed text), a run of
 * digits counts as one group. totalCharsNoWhitespace is also reported for transparency.
 */

import type { ProgramCheckResult, ReviewIssue } from "./types.ts";
import { splitParagraphs } from "./project.ts";

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD_RE = /[A-Za-z]+/g;
const DIGIT_GROUP_RE = /\d+/g;

export interface WordCounts {
	wordCount: number;
	cjkChars: number;
	latinWords: number;
	digitGroups: number;
	totalCharsNoWhitespace: number;
}

export function countWords(text: string): WordCounts {
	const cjkChars = (text.match(CJK_RE) ?? []).length;
	const latinWords = (text.match(LATIN_WORD_RE) ?? []).length;
	const digitGroups = (text.match(DIGIT_GROUP_RE) ?? []).length;
	const totalCharsNoWhitespace = text.replace(/\s/g, "").length;
	return { wordCount: cjkChars + latinWords + digitGroups, cjkChars, latinWords, digitGroups, totalCharsNoWhitespace };
}

/** Parse a length target from the brief, e.g. "长度：500-800字", "300 字以内", "约 300 字". */
export function parseLengthTarget(briefText: string): { min: number | null; max: number | null; raw: string } | null {
	for (const line of briefText.split(/\r?\n/)) {
		const trimmed = line.trim().replace(/^[-*]\s*/, "");
		if (!/(长度|字数|篇幅|字)/.test(trimmed)) continue;
		const range = /(\d+)\s*[-~～—至到]\s*(\d+)\s*字/.exec(trimmed);
		if (range) return { min: Number(range[1]), max: Number(range[2]), raw: trimmed };
		const atMost = /(?:不超过|最多|≤)\s*(\d+)\s*字/.exec(trimmed) ?? /(\d+)\s*字\s*(?:以内|之内)/.exec(trimmed);
		if (atMost) return { min: null, max: Number(atMost[1]), raw: trimmed };
		const approx = /(?:约|大约|左右)\s*(\d+)\s*字/.exec(trimmed);
		if (approx) {
			const n = Number(approx[1]);
			return { min: Math.floor(n * 0.8), max: Math.ceil(n * 1.2), raw: trimmed };
		}
		const exact = /(\d+)\s*字/.exec(trimmed);
		if (exact) {
			const n = Number(exact[1]);
			return { min: Math.floor(n * 0.8), max: Math.ceil(n * 1.2), raw: trimmed };
		}
	}
	return null;
}

/** Extract banned words from the brief: a line starting with 禁用词/禁词/不要使用, split by 、 , ， ; ； */
export function extractBannedWords(briefText: string): string[] {
	for (const line of briefText.split(/\r?\n/)) {
		const trimmed = line.trim().replace(/^[-*]\s*/, "");
		const m = /^(?:禁用词|禁词|避免使用的词|不要使用)\s*[:：]\s*(.+)$/.exec(trimmed);
		if (!m) continue;
		return m[1]
			.split(/[、,，;；]/)
			.map((w) => w.trim())
			.filter((w) => w.length > 0);
	}
	return [];
}

export function checkBannedWords(text: string, words: string[]): { word: string; count: number }[] {
	const hits: { word: string; count: number }[] = [];
	for (const word of words) {
		let count = 0;
		let idx = text.indexOf(word);
		while (idx !== -1) {
			count += 1;
			idx = text.indexOf(word, idx + word.length);
		}
		if (count > 0) hits.push({ word, count });
	}
	return hits;
}

function splitSentences(text: string): string[] {
	return text
		.replace(/\r\n/g, "\n")
		.split(/(?<=[。！？!?\n])/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

const MIN_DUPLICATE_PARAGRAPH_CHARS = 10;
const MIN_DUPLICATE_SENTENCE_CHARS = 15;

export function checkDuplicateParagraphs(text: string): { paragraph: number; quote: string }[] {
	const paragraphs = splitParagraphs(text);
	const seen = new Map<string, number>();
	const duplicates: { paragraph: number; quote: string }[] = [];
	paragraphs.forEach((p, i) => {
		if (p.length < MIN_DUPLICATE_PARAGRAPH_CHARS) return;
		const first = seen.get(p);
		if (first !== undefined) {
			duplicates.push({ paragraph: i + 1, quote: p.slice(0, 80) });
		} else {
			seen.set(p, i + 1);
		}
	});
	return duplicates;
}

export function checkDuplicateSentences(text: string): { quote: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const s of splitSentences(text)) {
		if (s.length < MIN_DUPLICATE_SENTENCE_CHARS) continue;
		counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([quote, count]) => ({ quote: quote.slice(0, 80), count }));
}

/** Locked sentences that no longer appear verbatim in the draft. */
export function checkLocked(text: string, lockedSentences: string[]): string[] {
	return lockedSentences.filter((sentence) => !text.includes(sentence));
}

export function runProgramChecks(
	text: string,
	options: { briefText: string | null; lockedSentences: string[]; bannedWords?: string[] },
): ProgramCheckResult {
	const target = options.briefText ? parseLengthTarget(options.briefText) : null;
	const counts = countWords(text);
	let withinTarget: boolean | null = null;
	if (target) {
		withinTarget = true;
		if (target.min !== null && counts.wordCount < target.min) withinTarget = false;
		if (target.max !== null && counts.wordCount > target.max) withinTarget = false;
	}
	const banned = options.bannedWords ?? (options.briefText ? extractBannedWords(options.briefText) : []);
	return {
		length: {
			wordCount: counts.wordCount,
			cjkChars: counts.cjkChars,
			latinWords: counts.latinWords,
			digitGroups: counts.digitGroups,
			totalCharsNoWhitespace: counts.totalCharsNoWhitespace,
			target,
			withinTarget,
		},
		bannedWords: checkBannedWords(text, banned),
		duplicateParagraphs: checkDuplicateParagraphs(text),
		duplicateSentences: checkDuplicateSentences(text),
		lockedMissing: checkLocked(text, options.lockedSentences),
	};
}

/** Program findings expressed as review leads (kind=other except locked violations). */
export function programIssuesAsLeads(checks: ProgramCheckResult, paragraphCount: number): ReviewIssue[] {
	const issues: ReviewIssue[] = [];
	if (checks.length.withinTarget === false && checks.length.target) {
		issues.push({
			kind: "other",
			paragraph: Math.max(1, paragraphCount),
			quote: "",
			reason: `程序检查：长度口径「${checks.length.target.raw}」要求 ${checks.length.target.min ?? "≥0"}-${checks.length.target.max ?? "不限"} 字，实际 ${checks.length.wordCount} 字（字数=中文字符+英文单词+数字组）`,
			suggestion: "调整篇幅以符合要求口径",
		});
	}
	for (const hit of checks.bannedWords) {
		issues.push({
			kind: "other",
			paragraph: 1,
			quote: "",
			reason: `程序检查：禁用词「${hit.word}」出现 ${hit.count} 次`,
			suggestion: "替换或删除该禁用词",
		});
	}
	for (const dup of checks.duplicateParagraphs) {
		issues.push({
			kind: "other",
			paragraph: dup.paragraph,
			quote: dup.quote,
			reason: "程序检查：该段落与前面的段落完全重复",
			suggestion: "合并或删除重复段落",
		});
	}
	for (const dup of checks.duplicateSentences) {
		issues.push({
			kind: "other",
			paragraph: 1,
			quote: dup.quote,
			reason: `程序检查：该片段重复出现 ${dup.count} 次`,
			suggestion: "只保留一次必要的重复",
		});
	}
	for (const missing of checks.lockedMissing) {
		issues.push({
			kind: "locked_violation",
			paragraph: 1,
			quote: missing,
			reason: "程序检查：locked.md 中锁定的原句未在文稿中逐字保留",
			suggestion: "恢复该原句的原文，或与用户确认解除锁定",
		});
	}
	return issues;
}

export function formatProgramSummary(checks: ProgramCheckResult): string {
	const lines: string[] = [];
	const len = checks.length;
	lines.push(
		`字数统计（中文字符+英文单词+数字组）：${len.wordCount}` +
			(len.target
				? `，口径「${len.target.raw}」要求 ${len.target.min ?? "≥0"}-${len.target.max ?? "不限"} 字 → ${len.withinTarget ? "达标" : "不达标"}`
				: "（brief 未指定口径）") +
			`；纯中文字符 ${len.cjkChars}。`,
	);
	if (checks.bannedWords.length > 0) {
		lines.push(`禁用词：${checks.bannedWords.map((b) => `「${b.word}」×${b.count}`).join("、")}`);
	}
	if (checks.lockedMissing.length > 0) {
		lines.push(`锁定原句缺失 ${checks.lockedMissing.length} 条`);
	}
	return `程序检查：${lines.join("；")}。（程序结果只是线索，不等于写作质量判断）`;
}
