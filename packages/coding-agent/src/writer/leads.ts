/**
 * Program findings → review leads and the user-facing summary (检查机制 A 的输出侧).
 * 长文与 AI 味的检查实现和命中明细在各自模块（longform.ts / aitone.ts），这里只做
 * 线索渲染与汇总拼装；checker.ts 依赖本模块并保持同名的导出，流程代码不受影响。
 */

import type { FullProgramChecks } from "./checker.ts";
import { aitoneLeads, aitoneSummaryLine } from "./genres/aitone.ts";
import type { LongFormChecks } from "./genres/longform.ts";
import type { ReviewIssue } from "./types.ts";

// ===========================================================================
// 长文检查结果 → 线索
// ===========================================================================

/** 长文检查结果 expressed as review leads (kind=other，段落归属已在 findings 里)。 */
export function longFormLeads(checks: LongFormChecks): ReviewIssue[] {
	const leads: ReviewIssue[] = [];
	for (const lp of checks.longParagraphs) {
		leads.push({
			kind: "other",
			paragraph: lp.paragraph,
			quote: "",
			reason: `程序检查：第 ${lp.paragraph} 段 ${lp.chars} 字，超过单段上限 ${checks.maxParagraphChars} 字（长文节奏）`,
			suggestion: "按论证步骤或场景节拍拆分该段，或删掉不再服务本段的细节",
		});
	}
	for (const dup of checks.nearDuplicateSentences) {
		leads.push({
			kind: "other",
			paragraph: dup.secondParagraph,
			quote: dup.quote,
			reason: `程序检查：该句与第 ${dup.firstParagraph} 段的句子近似重复（相似度 ${dup.similarity}），疑似跨章节复述`,
			suggestion: "合并两处表述，或删除重复的一处",
		});
	}
	for (const run of checks.uniformParagraphRuns) {
		leads.push({
			kind: "other",
			paragraph: run.startParagraph,
			quote: "",
			reason: `程序检查：第 ${run.startParagraph}-${run.startParagraph + run.count - 1} 段长度几乎一致（约 ${run.chars} 字/段），疑似公式化节奏`,
			suggestion: "调整段落详略，让节奏跟随内容而不是固定长度",
		});
	}
	for (const pending of checks.pendingMarkers) {
		leads.push({
			kind: "other",
			paragraph: pending.paragraph,
			quote: pending.marker,
			reason: `程序检查：残留待补标记 ${pending.marker}，对应缺口尚未回收`,
			suggestion: "补齐材料后回收该标记，或在交付说明中向用户列明缺口",
		});
	}
	return leads;
}

// ===========================================================================
// 全部程序检查结果 → 线索与汇总
// ===========================================================================

/** Program findings expressed as review leads (kind=other except locked violations). */
export function programIssuesAsLeads(checks: FullProgramChecks, paragraphCount: number): ReviewIssue[] {
	const issues: ReviewIssue[] = [];
	if (checks.length.withinTarget === false && checks.length.target) {
		issues.push({
			kind: "other",
			paragraph: Math.max(1, paragraphCount),
			quote: "",
			reason: `程序检查：长度口径「${checks.length.target.raw}」要求 ${checks.length.target.min ?? "≥0"}-${checks.length.target.max ?? "不限"} 字，实际 ${checks.length.wordCount} 字（字数=中文/假名/谚文字符+字母词+数字组）`,
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
	issues.push(...longFormLeads(checks), ...aitoneLeads(checks.aitone));
	for (const missing of checks.lockedMissing) {
		issues.push({
			kind: "locked_violation",
			paragraph: 1,
			quote: missing,
			reason: "程序检查：locked.md 中锁定的原句未在文稿中逐字保留",
			suggestion: "恢复该原句的原文，或与用户确认解除锁定",
		});
	}
	for (const citation of checks.citations) {
		issues.push({
			kind: "unsourced_citation",
			paragraph: 1,
			quote: citation.marker,
			reason: `程序检查：引用标记 ${citation.marker} 在 context/references.md 与 sources/ 中找不到对应`,
			suggestion: "登记该引用与来源的对应关系，或删除这个引用",
		});
	}
	return issues;
}

export function formatProgramSummary(checks: FullProgramChecks): string {
	const lines: string[] = [];
	const len = checks.length;
	const scripts = [`中文字符 ${len.cjkChars}`];
	if (len.kanaChars > 0) scripts.push(`假名 ${len.kanaChars}`);
	if (len.hangulChars > 0) scripts.push(`谚文 ${len.hangulChars}`);
	lines.push(
		`字数统计（中文/假名/谚文字符+字母词+数字组）：${len.wordCount}` +
			(len.target
				? `，口径「${len.target.raw}」要求 ${len.target.min ?? "≥0"}-${len.target.max ?? "不限"} 字 → ${len.withinTarget ? "达标" : "不达标"}`
				: "（brief 未指定口径）") +
			`；${scripts.join("、")}。`,
	);
	if (checks.maxParagraphChars > 0) {
		const found: string[] = [];
		if (checks.longParagraphs.length > 0) {
			found.push(`过长段落 ${checks.longParagraphs.length} 段（上限 ${checks.maxParagraphChars} 字）`);
		}
		if (checks.nearDuplicateSentences.length > 0)
			found.push(`跨段近似重复句 ${checks.nearDuplicateSentences.length} 处`);
		if (checks.uniformParagraphRuns.length > 0) found.push(`连续等长段落 ${checks.uniformParagraphRuns.length} 处`);
		if (checks.pendingMarkers.length > 0) found.push(`残留【待补】标记 ${checks.pendingMarkers.length} 处`);
		if (found.length > 0) lines.push(`长文检查：${found.join("、")}`);
	}
	const aiLine = aitoneSummaryLine(checks.aitone);
	if (aiLine) lines.push(aiLine);
	if (checks.bannedWords.length > 0) {
		lines.push(
			`禁用词：${checks.bannedWords.map((b: { word: string; count: number }) => `「${b.word}」×${b.count}`).join("、")}`,
		);
	}
	if (checks.lockedMissing.length > 0) {
		lines.push(`锁定原句缺失 ${checks.lockedMissing.length} 条`);
	}
	return `程序检查：${lines.join("；")}。（程序结果只是线索，不等于写作质量判断）`;
}
