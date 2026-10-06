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
import { extractJsonObject, validateReview } from "../../src/writer/validate.ts";

describe("countWords（8 语言口径：假名/谚文按字符，字母文字按词）", () => {
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

	test("Japanese kana counts per character alongside kanji", () => {
		const counts = countWords("私は東京に行った"); // 私東京行 4 汉字 + はにった 4 假名
		expect(counts.cjkChars).toBe(4);
		expect(counts.kanaChars).toBe(4);
		expect(counts.latinWords).toBe(0);
		expect(counts.wordCount).toBe(8);
	});

	test("Korean hangul counts per character, not per space-separated word", () => {
		const counts = countWords("나는 밥을 먹었다"); // 7 个谚文字符
		expect(counts.hangulChars).toBe(7);
		expect(counts.latinWords).toBe(0);
		expect(counts.wordCount).toBe(7);
	});

	test("Cyrillic and Arabic count per word; accented letters stay inside the word", () => {
		expect(countWords("Иванов написал").latinWords).toBe(2);
		expect(countWords("الكتاب المفتوح").latinWords).toBe(2);
		expect(countWords("café García").latinWords).toBe(2);
		expect(countWords("café García").wordCount).toBe(2);
	});

	test("a latin run beside kanji counts as one word plus characters", () => {
		const counts = countWords("API 文档 v2");
		expect(counts.latinWords).toBe(2);
		expect(counts.cjkChars).toBe(2);
		expect(counts.digitGroups).toBe(1);
		expect(counts.wordCount).toBe(5);
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

	test("banned words match across scripts: Cyrillic, Arabic (RTL), kana, hangul, accents, latin", () => {
		expect(checkBannedWords("Обнаружено явление и ещё раз явление.", ["явление"])).toEqual([
			{ word: "явление", count: 2 },
		]);
		expect(checkBannedWords("هذا النص يتضمن الكلمة الممنوعة.", ["الكلمة"])).toEqual([{ word: "الكلمة", count: 1 }]);
		expect(checkBannedWords("これはテストです。テスト。", ["テスト"])).toEqual([{ word: "テスト", count: 2 }]);
		expect(checkBannedWords("한국어 문장입니다.", ["문장"])).toEqual([{ word: "문장", count: 1 }]);
		expect(checkBannedWords("C'est un mot interdit, déjà vu.", ["déjà"])).toEqual([{ word: "déjà", count: 1 }]);
		expect(checkBannedWords("This draft mentions synergy twice: synergy.", ["synergy"])).toEqual([
			{ word: "synergy", count: 2 },
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

	test("works on Japanese and Arabic text", () => {
		const jp = "彼は黄昏の巷口に立ち尽くし、売り切れた栗のことを思い出していた。";
		expect(checkDuplicateParagraphs(`${jp}\n\n${jp}`)).toHaveLength(1);
		expect(checkDuplicateSentences(`始まり。${jp}続き。${jp}`)).toHaveLength(1);
		const ar = "جملة عربية طويلة بما يكفي ليتم اكتشاف تكرارها في النص.";
		expect(checkDuplicateParagraphs(`${ar}\n\n${ar}`)).toHaveLength(1);
	});

	test("works on English, Russian and Korean text", () => {
		const en = "He pushed open the rusty iron door and walked down the corridor.";
		expect(checkDuplicateParagraphs(`${en}\n\n${en}`)).toHaveLength(1);
		expect(checkDuplicateSentences(`First. ${en} Then. ${en}`)).toHaveLength(1);
		const ru = "Предложение на русском языке достаточно длинное, чтобы его повтор был обнаружен здесь.";
		expect(checkDuplicateParagraphs(`${ru}\n\n${ru}`)).toHaveLength(1);
		const ko = "그는 녹슨 철문을 밀어 열고 복도를 걸어 내려갔다.";
		expect(checkDuplicateParagraphs(`${ko}\n\n${ko}`)).toHaveLength(1);
	});
});

describe("checkLocked（锁定原句检测）", () => {
	test("reports locked sentences missing from the draft", () => {
		const locked = ["我当时不想答应，只是怕直接拒绝让场面难看。"];
		expect(checkLocked("改写后的句子完全不同。", locked)).toEqual(locked);
		expect(checkLocked("背景：我当时不想答应，只是怕直接拒绝让场面难看。", locked)).toEqual([]);
	});

	test("locked sentences match verbatim in Japanese, Arabic, Russian and Korean", () => {
		expect(checkLocked("改写后完全不同。", ["彼は約束を守らなかった。"])).toEqual(["彼は約束を守らなかった。"]);
		expect(checkLocked("في البداية: لم أكن أريد الموافقة.", ["لم أكن أريد الموافقة."])).toEqual([]);
		expect(checkLocked("改写后不同。", ["Я не хотел соглашаться тогда."])).toEqual(["Я не хотел соглашаться тогда."]);
		expect(checkLocked("그때 나는 동의하고 싶지 않았다.", ["그때 나는 동의하고 싶지 않았다."])).toEqual([]);
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
