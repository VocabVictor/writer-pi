import { describe, expect, test } from "vitest";
import {
	checkBannedWords,
	checkDuplicateParagraphs,
	checkDuplicateSentences,
	checkLocked,
	countWords,
	extractBannedWords,
	parseLengthTarget,
	programIssuesAsLeads,
	runProgramChecks,
} from "../../src/writer/checker.ts";
import { extractJsonObject, validateReview } from "../../src/writer/review-validate.ts";

describe("countWords（统计口径：中文字符+英文单词+数字组）", () => {
	test("pure Chinese counts per character", () => {
		const counts = countWords("这是一段十整字的话"); // 9 个汉字
		expect(counts.cjkChars).toBe(9);
		expect(counts.wordCount).toBe(9);
	});

	test("mixed text: latin words and digit groups count as one each", () => {
		const counts = countWords("hello 世界 123");
		expect(counts.latinWords).toBe(1);
		expect(counts.cjkChars).toBe(2);
		expect(counts.digitGroups).toBe(1);
		expect(counts.wordCount).toBe(4);
	});

	test("totalCharsNoWhitespace excludes whitespace", () => {
		expect(countWords("a b\n中文").totalCharsNoWhitespace).toBe(4);
	});
});

describe("parseLengthTarget", () => {
	test("range format", () => {
		expect(parseLengthTarget("- 长度：500-800字")).toEqual({ min: 500, max: 800, raw: "长度：500-800字" });
	});
	test("at-most format", () => {
		expect(parseLengthTarget("长度: 300 字以内")).toEqual({ min: null, max: 300, raw: "长度: 300 字以内" });
	});
	test("approximate format expands to ±20%", () => {
		const target = parseLengthTarget("篇幅约500字");
		expect(target?.min).toBe(400);
		expect(target?.max).toBe(600);
	});
	test("returns null when no length is specified", () => {
		expect(parseLengthTarget("# 写作要求\n\n写一封邮件")).toBeNull();
	});
});

describe("extractBannedWords / checkBannedWords", () => {
	test("extracts a comma/顿号 separated list", () => {
		expect(extractBannedWords("- 禁用词：赋能、抓手，闭环;对齐")).toEqual(["赋能", "抓手", "闭环", "对齐"]);
	});
	test("finds occurrences", () => {
		expect(checkBannedWords("这个赋能很抓手，赋能。", ["赋能", "抓手"])).toEqual([
			{ word: "赋能", count: 2 },
			{ word: "抓手", count: 1 },
		]);
	});
});

describe("duplicate detection", () => {
	test("flags fully duplicated paragraphs with their paragraph number", () => {
		const text = `${"第一段足够长的内容一二三四五。"}\n\n第二段正常的内容。\n\n${"第一段足够长的内容一二三四五。"}`;
		const dup = checkDuplicateParagraphs(text);
		expect(dup).toHaveLength(1);
		expect(dup[0].paragraph).toBe(3);
	});

	test("flags repeated sentences of at least 15 characters", () => {
		const sentence = "这句话足够长所以重复会被检测到。";
		expect(checkDuplicateSentences(`开头。${sentence}中间。${sentence}`)).toHaveLength(1);
		expect(checkDuplicateSentences("短句一。短句二。短句三。")).toHaveLength(0);
	});
});

describe("checkLocked（锁定原句检测）", () => {
	test("reports locked sentences missing from the draft", () => {
		const locked = ["我当时不想答应，只是怕直接拒绝让场面难看。"];
		expect(checkLocked("改写后的句子完全不同。", locked)).toEqual(locked);
		expect(checkLocked("背景：我当时不想答应，只是怕直接拒绝让场面难看。", locked)).toEqual([]);
	});
});

describe("programIssuesAsLeads", () => {
	test("maps locked violations to locked_violation issues", () => {
		const checks = runProgramChecks("完全不同的文本。", {
			briefText: null,
			lockedSentences: ["必须逐字保留的原句甲乙丙丁。"],
		});
		expect(checks.lockedMissing).toHaveLength(1);
		const leads = programIssuesAsLeads(checks, 3);
		expect(leads.some((l) => l.kind === "locked_violation" && l.quote === "必须逐字保留的原句甲乙丙丁。")).toBe(true);
	});

	test("maps a missed length target to a lead with the statistic explained", () => {
		const checks = runProgramChecks("太短。", { briefText: "长度：500-800字", lockedSentences: [] });
		const leads = programIssuesAsLeads(checks, 1);
		expect(checks.length.withinTarget).toBe(false);
		expect(leads[0].reason).toContain("500-800");
	});
});

describe("validateReview（检查 JSON 验证）", () => {
	const draft = "第一段：我当时不想答应。\n\n第二段：只是怕直接拒绝让场面难看。";

	test("accepts valid issues", () => {
		const raw = JSON.stringify({
			issues: [
				{
					kind: "over_explanation",
					paragraph: 2,
					quote: "只是怕直接拒绝让场面难看",
					reason: "重复解释",
					suggestion: "删除",
				},
			],
		});
		const result = validateReview(raw, draft);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.issues).toHaveLength(1);
	});

	test("accepts empty issues", () => {
		const result = validateReview('{"issues": []}', draft);
		expect(result.ok).toBe(true);
	});

	test("extracts JSON wrapped in fences or prose", () => {
		expect(extractJsonObject('好的，结果如下：\n```json\n{"issues": []}\n```\n以上。')).toBe('{"issues": []}');
	});

	test("rejects output without parseable JSON", () => {
		const result = validateReview("我觉得没什么问题。", draft);
		expect(result.ok).toBe(false);
	});

	test("rejects wrong structure (missing issues array)", () => {
		const result = validateReview('{"问题": []}', draft);
		expect(result.ok).toBe(false);
	});

	test("drops unknown kind, out-of-range paragraph, and quotes not present in the draft; all-dropped → failure", () => {
		const raw = JSON.stringify({
			issues: [
				{ kind: "made_up_kind", paragraph: 1, quote: "第一段：我当时不想答应。", reason: "x" },
				{ kind: "omission", paragraph: 99, quote: "第一段：我当时不想答应。", reason: "x" },
				{ kind: "omission", paragraph: 1, quote: "文稿里根本没有这句话", reason: "x" },
			],
		});
		const result = validateReview(raw, draft);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors.join("\n")).toContain("没有任何一条有效的检查意见");
	});

	test("keeps valid issues while warning about dropped ones", () => {
		const raw = JSON.stringify({
			issues: [
				{ kind: "omission", paragraph: 5, quote: "第一段：我当时不想答应。", reason: "越界" },
				{ kind: "meaning_drift", paragraph: 1, quote: "第一段：我当时不想答应。", reason: "立场变化" },
			],
		});
		const result = validateReview(raw, draft);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].kind).toBe("meaning_drift");
			expect(result.warnings.join("\n")).toContain("越界");
		}
	});
});

describe("runProgramChecks（程序检查只是线索）", () => {
	test("length/banned/duplicates/locked are reported together", () => {
		const brief = "长度：10-20字\n禁用词：赋能";
		const longText = "赋能的重复重复重复。\n\n赋能的重复重复重复。\n\n赋能的重复重复重复。";
		const checks = runProgramChecks(longText, {
			briefText: brief,
			lockedSentences: ["被删掉的锁定句。"],
		});
		// 9 个汉字×3 段 = 27 > 上限 20 → 不达标；后两段与第一段完全重复
		expect(checks.length.withinTarget).toBe(false);
		expect(checks.bannedWords[0].word).toBe("赋能");
		expect(checks.duplicateParagraphs).toHaveLength(2);
		expect(checks.lockedMissing).toEqual(["被删掉的锁定句。"]);
	});
});
