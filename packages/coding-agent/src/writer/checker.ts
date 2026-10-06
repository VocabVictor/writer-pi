/**
 * Programmatic checks (检查机制 A). These are deterministic hints computed from the draft
 * text — they are leads for the semantic review, not a verdict on writing quality.
 *
 * 字数口径与长文检查（过长段落、跨段近似重复、等长段落、待补残留）在 genres/longform.ts，
 * AI 味检测（词表+结构正则加权打分）在 genres/aitone.ts，线索渲染在 leads.ts；
 * checker 依赖它们，长文与 AI 味检查按 GenreChecks.longForm / .aitone 开关运行。
 */

import { checkCitations } from "./citations.ts";
import { type AitoneChecks, runAitoneChecks } from "./genres/aitone.ts";
import {
	countOccurrences,
	countWords,
	type LongFormChecks,
	runLongFormChecks,
	splitSentences,
} from "./genres/longform.ts";
import type { GenreChecks } from "./genres/types.ts";
import { splitParagraphs } from "./project.ts";
import type { ProgramCheckResult } from "./types.ts";

export type { WordCounts } from "./genres/longform.ts";
export { countWords } from "./genres/longform.ts";

/** 字数口径扩展（假名/谚文按字符）；src/writer/types.ts 归流程 agent，字段后续合入。 */
export type LengthCounts = ProgramCheckResult["length"] & { kanaChars: number; hangulChars: number };

/** Program checks including the long-form and AI-tone findings (长文与 AI 味结果拼进口径，随 ReviewFile 落盘). */
export type FullProgramChecks = Omit<ProgramCheckResult, "length"> &
	LongFormChecks & { length: LengthCounts; aitone: AitoneChecks };

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
		const count = countOccurrences(text, word);
		if (count > 0) hits.push({ word, count });
	}
	return hits;
}

const MIN_DUPLICATE_PARAGRAPH_CHARS = 10;
const MIN_DUPLICATE_SENTENCE_CHARS = 15;

export function checkDuplicateParagraphs(text: string, loose = false): { paragraph: number; quote: string }[] {
	const paragraphs = splitParagraphs(text);
	const threshold = loose ? MIN_DUPLICATE_PARAGRAPH_CHARS * 4 : MIN_DUPLICATE_PARAGRAPH_CHARS;
	const seen = new Map<string, number>();
	const duplicates: { paragraph: number; quote: string }[] = [];
	paragraphs.forEach((p, i) => {
		if (p.length < threshold) return;
		const first = seen.get(p);
		if (first !== undefined) {
			duplicates.push({ paragraph: i + 1, quote: p.slice(0, 80) });
		} else {
			seen.set(p, i + 1);
		}
	});
	return duplicates;
}

export function checkDuplicateSentences(text: string, loose = false): { quote: string; count: number }[] {
	const threshold = loose ? MIN_DUPLICATE_SENTENCE_CHARS * 2 : MIN_DUPLICATE_SENTENCE_CHARS;
	const counts = new Map<string, number>();
	for (const s of splitSentences(text)) {
		if (s.length < threshold) continue;
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

const DEFAULT_CHECKS: GenreChecks = {
	length: true,
	bannedWords: true,
	duplicates: "strict",
	locked: true,
	citations: false,
};

/**
 * Run the program checks the CURRENT GENRE asks for. `checks` comes from the genre
 * config; poetry/fiction turn duplicate detection off, academic turns citations on.
 */
export function runProgramChecks(
	text: string,
	options: {
		briefText: string | null;
		lockedSentences: string[];
		bannedWords?: string[];
		checks?: GenreChecks;
		referenceTexts?: string[];
	},
): FullProgramChecks {
	const checks = { ...DEFAULT_CHECKS, ...(options.checks ?? {}) };
	const target = options.briefText ? parseLengthTarget(options.briefText) : null;
	const counts = countWords(text);
	let withinTarget: boolean | null = null;
	if (target && checks.length) {
		withinTarget = true;
		if (target.min !== null && counts.wordCount < target.min) withinTarget = false;
		if (target.max !== null && counts.wordCount > target.max) withinTarget = false;
	}
	const banned = options.bannedWords ?? (options.briefText ? extractBannedWords(options.briefText) : []);
	return {
		length: {
			wordCount: counts.wordCount,
			cjkChars: counts.cjkChars,
			kanaChars: counts.kanaChars,
			hangulChars: counts.hangulChars,
			latinWords: counts.latinWords,
			digitGroups: counts.digitGroups,
			totalCharsNoWhitespace: counts.totalCharsNoWhitespace,
			target,
			withinTarget,
		},
		bannedWords: checks.bannedWords ? checkBannedWords(text, banned) : [],
		duplicateParagraphs:
			checks.duplicates === "off" ? [] : checkDuplicateParagraphs(text, checks.duplicates === "loose"),
		duplicateSentences:
			checks.duplicates === "off" ? [] : checkDuplicateSentences(text, checks.duplicates === "loose"),
		lockedMissing: checks.locked ? checkLocked(text, options.lockedSentences) : [],
		citations: checks.citations ? checkCitations(text, options.referenceTexts ?? []) : [],
		...runLongFormChecks(text, checks),
		aitone: runAitoneChecks(text, checks),
	};
}

// 线索渲染与汇总在 leads.ts（长文与 AI 味的命中明细在各自模块），这里保持同名导出。
export { formatProgramSummary, programIssuesAsLeads } from "./leads.ts";
