/**
 * 17 档长度目标的解析与 withinTarget 判定、长文程序检查（过长段落/跨段近似重复/
 * 等长段落/待补残留）及其在大文本上的行为。checker.test.ts 超 300 行，长度与长文用例落这里。
 */
import { describe, expect, test } from "vitest";
import {
	formatProgramSummary,
	parseLengthTarget,
	programIssuesAsLeads,
	runProgramChecks,
} from "../../src/writer/checker.ts";
import {
	checkLongParagraphs,
	checkNearDuplicateSentences,
	checkPendingMarkers,
	checkUniformParagraphs,
	runLongFormChecks,
} from "../../src/writer/genres/longform.ts";

const LENGTH_TIERS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 800, 1000, 3000, 5000, 6000, 8000, 10000];

describe("17 档长度目标（parseLengthTarget 解析）", () => {
	test("exact format parses every tier to ±20%", () => {
		for (const n of LENGTH_TIERS) {
			const t = parseLengthTarget(`长度：${n}字`);
			expect(t?.min, `${n} min`).toBe(Math.floor(n * 0.8));
			expect(t?.max, `${n} max`).toBe(Math.ceil(n * 1.2));
		}
	});

	test("range format parses at tier pairs", () => {
		for (const n of [50, 200, 500, 1000, 3000, 10000]) {
			const brief = `长度：${n}-${n * 2}字`;
			expect(parseLengthTarget(brief)).toEqual({ min: n, max: n * 2, raw: brief });
		}
	});

	test("at-most format parses every tier", () => {
		for (const n of LENGTH_TIERS) {
			const brief = `${n} 字以内`;
			expect(parseLengthTarget(brief)).toEqual({ min: null, max: n, raw: brief });
		}
	});

	test("approximate format expands to ±20% at tier boundaries", () => {
		for (const n of [50, 500, 3000, 10000]) {
			const t = parseLengthTarget(`约${n}字`);
			expect(t?.min, `${n} min`).toBe(Math.floor(n * 0.8));
			expect(t?.max, `${n} max`).toBe(Math.ceil(n * 1.2));
		}
	});
});

describe("17 档长度目标（withinTarget 判定与统计口径）", () => {
	test("below/within/above judged correctly at every tier", () => {
		for (const n of LENGTH_TIERS) {
			const brief = `长度：${n}字`;
			const min = Math.floor(n * 0.8);
			const max = Math.ceil(n * 1.2);
			const within = (count: number) =>
				runProgramChecks("字".repeat(count), { briefText: brief, lockedSentences: [] }).length;
			expect(within(n).withinTarget, `within ${n}`).toBe(true);
			expect(within(Math.max(0, min - 1)).withinTarget, `below ${n}`).toBe(false);
			expect(within(max + 1).withinTarget, `above ${n}`).toBe(false);
		}
	});

	test("mixed-script drafts count toward the target (假名/谚文按字符，字母词/数字按口径)", () => {
		const brief = "长度：50字";
		const mixed = `${"あ".repeat(25)}${"가".repeat(15)} word 123`; // 25 假名 + 15 谚文 + 1 词 + 1 组 = 42
		expect(runProgramChecks(mixed, { briefText: brief, lockedSentences: [] }).length.withinTarget).toBe(true);
		expect(runProgramChecks("あ".repeat(20), { briefText: brief, lockedSentences: [] }).length.withinTarget).toBe(
			false,
		);
	});
});

describe("长文程序检查（单元）", () => {
	test("checkLongParagraphs reports position and size of over-cap paragraphs", () => {
		const text = `短段。\n\n${"这一段很长".repeat(20)}。`; // 100 字
		expect(checkLongParagraphs(text, 99)).toEqual([{ paragraph: 2, chars: 100 }]);
		expect(checkLongParagraphs(text, 100)).toEqual([]);
	});

	test("checkNearDuplicateSentences flags a paraphrased repeat across paragraphs", () => {
		const first = "他推开那扇生锈的铁门，走廊里堆满了废弃的课桌椅。";
		const second = "他推开那扇生锈的铁门，走廊里堆着废弃的课桌椅。";
		const text = `第一章写到这里。${first}\n\n第三章又写了一遍。${second}`;
		const dups = checkNearDuplicateSentences(text);
		expect(dups).toHaveLength(1);
		expect(dups[0].firstParagraph).toBe(1);
		expect(dups[0].secondParagraph).toBe(2);
		expect(dups[0].similarity).toBeGreaterThanOrEqual(0.75);
	});

	test("unrelated sentences are not near-duplicates", () => {
		const text = "他把生锈的铁门推开，走廊里堆满了废弃的课桌椅。\n\n她把崭新的木门关上，院子里晒着刚洗的床单被套。";
		expect(checkNearDuplicateSentences(text)).toEqual([]);
	});

	test("checkUniformParagraphs flags runs of near-equal-length paragraphs", () => {
		const p = (n: number) => "字".repeat(n);
		const text = [p(150), p(160), p(170), p(180), "完全不同长短的短句"].join("\n\n");
		expect(checkUniformParagraphs(text)).toEqual([{ startParagraph: 1, count: 4, chars: 150 }]);
		expect(checkUniformParagraphs([p(60), p(200), p(350)].join("\n\n"))).toEqual([]);
	});

	test("checkPendingMarkers finds leftover 待补 markers with their paragraph", () => {
		const text = "第一段正常。\n\n这一处【待补：数据来源】仍空着。\n\n另一处【待补：文献】也空着。";
		expect(checkPendingMarkers(text)).toEqual([
			{ marker: "【待补：数据来源】", paragraph: 2 },
			{ marker: "【待补：文献】", paragraph: 3 },
		]);
	});
});

describe("长文程序检查（runLongFormChecks 按体裁开关）", () => {
	const base = { length: true, bannedWords: true, locked: true, citations: false };
	const longParagraph = "字".repeat(120);

	test("enabled: pacing checks run; duplicates off skips near-duplicate detection", () => {
		const text = [longParagraph, longParagraph, longParagraph, longParagraph].join("\n\n");
		const strict = runLongFormChecks(text, {
			...base,
			duplicates: "strict",
			longForm: { enabled: true, maxParagraphChars: 100 },
		});
		expect(strict.maxParagraphChars).toBe(100);
		expect(strict.longParagraphs).toHaveLength(4);
		expect(strict.nearDuplicateSentences).toHaveLength(1); // 重复的原文只报一次
		expect(strict.uniformParagraphRuns).toEqual([{ startParagraph: 1, count: 4, chars: 120 }]);
		const loose = runLongFormChecks(text, {
			...base,
			duplicates: "off",
			longForm: { enabled: true, maxParagraphChars: 100 },
		});
		expect(loose.nearDuplicateSentences).toEqual([]); // 有意重复不进检查
		expect(loose.longParagraphs).toHaveLength(4);
	});

	test("not enabled: all findings empty with maxParagraphChars 0", () => {
		const text = [longParagraph, longParagraph].join("\n\n");
		expect(runLongFormChecks(text, { ...base, duplicates: "strict" })).toEqual({
			maxParagraphChars: 0,
			longParagraphs: [],
			nearDuplicateSentences: [],
			uniformParagraphRuns: [],
			pendingMarkers: [],
		});
	});
});

describe("长文档位程序检查（3000-10000 字大文本）", () => {
	const POOL = "春夏秋冬山水日夜风雨雷电草木花鸟云霞霜雪江海湖泉石林原野星辰晨昏暖凉明暗清浊深浅";
	// 多样化占位段落：不同 seed 的字符序列两两不相交，占位文本不会被当成重复句。
	const filler = (n: number, seed: number) => {
		let text = "";
		let x = seed;
		for (let i = 0; i < n; i++) {
			x = (x * 7 + seed) % POOL.length;
			text += POOL[x];
		}
		return text;
	};

	test("issues report position-accurate leads on a long draft", () => {
		const text = [
			filler(600, 1),
			filler(200, 2),
			filler(210, 3),
			filler(220, 4),
			filler(230, 5),
			filler(400, 6),
			filler(200, 7),
			"这一处【待补：数据来源】仍空着，材料补齐后回收。",
		].join("\n\n");
		const checks = runProgramChecks(text, {
			briefText: null,
			lockedSentences: [],
			checks: {
				length: false,
				bannedWords: false,
				duplicates: "strict",
				locked: true,
				citations: false,
				longForm: { enabled: true, maxParagraphChars: 400 },
			},
		});
		expect(checks.longParagraphs).toEqual([{ paragraph: 1, chars: 600 }]);
		expect(checks.uniformParagraphRuns).toEqual([{ startParagraph: 2, count: 4, chars: 200 }]);
		expect(checks.pendingMarkers).toEqual([{ marker: "【待补：数据来源】", paragraph: 8 }]);
		expect(checks.duplicateParagraphs).toEqual([]);
		expect(checks.nearDuplicateSentences).toEqual([]);
		const leads = programIssuesAsLeads(checks, 8);
		expect(leads.some((l) => l.paragraph === 1 && l.reason.includes("超过单段上限 400"))).toBe(true);
		expect(leads.some((l) => l.reason.includes("近似重复"))).toBe(false);
		expect(leads.some((l) => l.reason.includes("待补"))).toBe(true);
	});

	test("clean 10000 字 draft: no false positives, length target met", () => {
		const paragraphs: string[] = [];
		for (let i = 0; i < 25; i++) paragraphs.push(filler(i % 2 === 0 ? 300 : 500, i + 1));
		paragraphs.push(filler(100, 27));
		const text = paragraphs.join("\n\n");
		const checks = runProgramChecks(text, {
			briefText: "长度：10000字",
			lockedSentences: [],
			checks: {
				length: true,
				bannedWords: false,
				duplicates: "strict",
				locked: true,
				citations: false,
				longForm: { enabled: true, maxParagraphChars: 500 },
			},
		});
		expect(checks.length.wordCount).toBe(10000);
		expect(checks.length.withinTarget).toBe(true);
		expect(checks.longParagraphs).toEqual([]);
		expect(checks.uniformParagraphRuns).toEqual([]);
		expect(checks.duplicateParagraphs).toEqual([]);
		expect(checks.nearDuplicateSentences).toEqual([]);
		expect(formatProgramSummary(checks)).toContain("达标");
	});
});
