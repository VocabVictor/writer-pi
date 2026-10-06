/**
 * AI-tone detection (AI 味检测). 词表 + 结构正则的加权打分，按次/千字归一化到 0-100，
 * 作为语义检查的线索（模型核实后才决定是否列入 issues），不是写作质量的判决。
 *
 * 实测依据：lieflat 283 万字对照语料（成立/推翻清单见研究报告）。第二节推翻的特征
 * （句长均匀度、被动句、正文"首先其次"）不写进通用规则；burstiness 是分场景特征，
 * 只对适用体裁（学术摘要）开。词表是中文的，按语言门控：非中文文本跳过中文词表，
 * 语言无关的特征（工具痕迹）始终检测。
 */

import { splitParagraphs } from "../project.ts";
import type { ReviewIssue } from "../types.ts";
import { WORD_GROUPS } from "./lexicon.ts";
import { countOccurrences, countWords, splitSentences } from "./longform.ts";
import type { GenreChecks } from "./types.ts";

// ===========================================================================
// 结构正则（中文；段首零主语评论按段计，其余按出现次数）
// ===========================================================================

interface StructureGroup {
	category: string;
	weight: number;
	re: RegExp;
}

const STRUCTURE_GROUPS: StructureGroup[] = [
	// 提示性冒号：空转句引列表，实测 9.4×/3.8×。
	{
		category: "提示性冒号",
		weight: 2,
		re: /(一句话总结|简单说|说白了|总结|结论|核心是|关键在于|重点|原因如下|本质|换句话说|也就是说)[：:]/g,
	},
	// 翻案腔："不是 A，而是 B"（常见形式中间有逗号），实测 3.4×；正常对照也用，按密度计。
	{ category: "翻案腔", weight: 1, re: /不是[^。]{1,15}而是/g },
	// 套话开头：时代帽子开头。
	{
		category: "套话开头",
		weight: 1,
		re: /(随着[^。]{1,20}的不断(?:发展|推进|深化)|在当今[^。]{1,15}背景下|作为[^。]{1,15}的重要(?:组成部分|环节))/g,
	},
	// 升级排比。
	{ category: "升级排比", weight: 1, re: /(?:不仅[^。]{1,20}而且[^。]{1,20}更|不仅仅是|不只是[^。]{1,15}更是)/g },
	// 翻译腔轻动词："对…进行了…""受到…的…"。
	{ category: "翻译腔轻动词", weight: 1, re: /(?:对[^。]{1,12}进行了|受到[^。]{1,12}的(?:关注|影响|重视))/g },
];

// 段首零主语评论（实测 4.4×，段级分母）：段首评价语且不接回指词。
const ZERO_SUBJECT_RE =
	/^(?:听起来|看起来|说白了|说到底|换句话说|意味着|值得注意的是|不难看出|问题在于|原因在于|结果是|有意思的是|更重要的是|关键在于|真正的)(?!这|那|其|此|它|但|不过|所以|因此|而)/;

// 段首三段式：连续段落以序数连接词起头。正文句内的"首先…其次"实测与人类无差别，不计。
const ORDINAL_LEAD_RE = /^(?:首先|其次|再次|最后|第一|第二|第三|其一|其二|其三|一方面|另一方面)[、，,]/;
const MIN_FORMULAIC_PARAGRAPHS = 3;

// ===========================================================================
// 工具痕迹（语言无关，一眼铁证，始终检测）
// ===========================================================================

const TOOL_TRACE_GROUPS: { label: string; re: RegExp }[] = [
	{ label: "对话工具链接（utm_source）", re: /utm_source=(?:chatgpt|openai|grok|claude|perplexity)/g },
	{ label: "搜索引用残留（turn0search/citeturn）", re: /(?:turn0search|turn0news|citeturn)\d+/g },
	{
		label: "对话残留（好的，以下是…）",
		re: /好的[，,]以下是|希望这(?:对您|对你)有帮助|如有(?:其他|进一步)(?:问题|需要)请(?:告诉我|联系我)/g,
	},
	{ label: "模板占位符（[产品名称]/XX 公司）", re: /\[(?:产品名称|产品名|公司名)\]|XX公司|某某公司/g },
	{ label: "零宽字符", re: /(?:\u200b|\u200c|\u200d|\u2060|\ufeff)/g },
];

// ===========================================================================
// 打分与结果
// ===========================================================================

export type AitoneLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";

export interface AitoneChecks {
	/** 加权词密度分值（0-100）：加权命中次数/千字 × 5，分母下限 500 字。 */
	score: number;
	level: AitoneLevel;
	/** 分值达到体裁阈值。 */
	flagged: boolean;
	/** 命中明细（类别 + 标签 + 次数）。 */
	hits: { category: string; label: string; count: number }[];
	/** 工具痕迹片段（铁证，单独成线索）。 */
	toolTraces: string[];
}

const DEFAULT_THRESHOLD = 25;
const CHINESE_DENSITY = 0.25;
const MAX_TOOL_TRACES = 10;
const MIN_BURSTINESS_SENTENCE_CHARS = 8;
const MIN_BURSTINESS_SENTENCES = 5;
const BURSTINESS_CV = 0.35;

function levelOf(score: number): AitoneLevel {
	if (score >= 75) return "VERY HIGH";
	if (score >= 50) return "HIGH";
	if (score >= 25) return "MEDIUM";
	return "LOW";
}

/** 句长方差（分场景）：只对 aitone.burstiness 开；通用场景实测 0.87× 不成立。 */
function isLowVariability(text: string): boolean {
	const lengths = splitSentences(text)
		.map((s) => s.replace(/\s/g, "").length)
		.filter((n) => n >= MIN_BURSTINESS_SENTENCE_CHARS);
	if (lengths.length < MIN_BURSTINESS_SENTENCES) return false;
	const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
	const variance = lengths.reduce((a, n) => a + (n - mean) ** 2, 0) / lengths.length;
	return Math.sqrt(variance) / mean < BURSTINESS_CV;
}

/** 连续 ≥3 段以序数连接词起头（段首三段式）。 */
function hasOrdinalParagraphRun(text: string): boolean {
	let streak = 0;
	for (const p of splitParagraphs(text)) {
		if (ORDINAL_LEAD_RE.test(p)) {
			streak += 1;
			if (streak >= MIN_FORMULAIC_PARAGRAPHS) return true;
		} else {
			streak = 0;
		}
	}
	return false;
}

/** Run the AI-tone checks the genre asks for; not enabled → empty result. */
export function runAitoneChecks(text: string, checks: GenreChecks): AitoneChecks {
	const aitone = checks.aitone;
	if (!aitone?.enabled) return { score: 0, level: "LOW", flagged: false, hits: [], toolTraces: [] };
	const counts = countWords(text);
	const chinese = (counts.cjkChars + counts.kanaChars) / Math.max(1, counts.totalCharsNoWhitespace) >= CHINESE_DENSITY;
	const hits: { category: string; label: string; count: number; weight: number }[] = [];
	if (chinese) {
		for (const group of WORD_GROUPS) {
			if (group.fingerprintOnly && !aitone.fingerprint) continue;
			for (const word of group.words) {
				const count = countOccurrences(text, word);
				if (count > 0) hits.push({ category: group.category, label: word, count, weight: group.weight });
			}
		}
		for (const group of STRUCTURE_GROUPS) {
			const count = (text.match(group.re) ?? []).length;
			if (count > 0) hits.push({ category: group.category, label: group.category, count, weight: group.weight });
		}
		const zeroSubjects = splitParagraphs(text).filter((p) => ZERO_SUBJECT_RE.test(p)).length;
		if (zeroSubjects > 0)
			hits.push({ category: "段首零主语评论", label: "段首零主语评论", count: zeroSubjects, weight: 2 });
		if (hasOrdinalParagraphRun(text)) {
			hits.push({ category: "段首三段式", label: "段首三段式", count: 1, weight: 1 });
		}
		if (aitone.burstiness && isLowVariability(text)) {
			hits.push({ category: "句长方差", label: "句长方差过低", count: 1, weight: 2 });
		}
	}
	const weighted = hits.reduce((sum, h) => sum + h.weight * h.count, 0);
	// 分母下限 500 字：短文的千字外推会放大单次命中（一篇短邮件里的一个连接词不是 AI 味）。
	const score = Math.min(100, Math.round((weighted * 5000) / Math.max(500, counts.wordCount)));
	const threshold = aitone.threshold ?? DEFAULT_THRESHOLD;
	const toolTraces: string[] = [];
	for (const group of TOOL_TRACE_GROUPS) {
		for (const m of text.matchAll(group.re)) {
			toolTraces.push(m[0]);
			if (toolTraces.length >= MAX_TOOL_TRACES) break;
		}
		if (toolTraces.length >= MAX_TOOL_TRACES) break;
	}
	return {
		score,
		level: levelOf(score),
		flagged: score >= threshold,
		hits: hits.map(({ category, label, count }) => ({ category, label, count })),
		toolTraces,
	};
}

/** 工具痕迹是铁证：每条单独成线索（quote 是文稿中的逐字片段）。 */
export function aitoneLeads(checks: AitoneChecks): ReviewIssue[] {
	const leads: ReviewIssue[] = [];
	for (const trace of checks.toolTraces) {
		leads.push({
			kind: "other",
			paragraph: 1,
			quote: trace,
			reason: `程序检查：发现工具痕迹「${trace}」，疑似对话工具输出残留`,
			suggestion: "删除该残留；确认正文没有同类残留",
		});
	}
	return leads;
}

const TOP_HIT_LIMIT = 4;

/** 分值达到体裁阈值时的汇总线索；未启用或未命中返回 null。 */
export function aitoneSummaryLine(checks: AitoneChecks): string | null {
	if (!checks.flagged) return null;
	const top = checks.hits
		.slice()
		.sort((a, b) => b.count - a.count)
		.slice(0, TOP_HIT_LIMIT)
		.map((h) => `${h.category}「${h.label}」×${h.count}`)
		.join("、");
	return (
		`程序检查：AI 味分值 ${checks.score}（${checks.level}）——${top}。` +
		"（程序结果只是线索：公式化表达在本篇体裁与文风里合理时不要报告）"
	);
}
