/**
 * AI 味检测（genres/aitone.ts）：词表/结构正则命中与不命中、千字归一化阈值、
 * 分场景开关（burstiness）、语言门控与工具痕迹。checker.test.ts 超 300 行，用例落这里。
 */
import { describe, expect, test } from "vitest";
import { aitoneLeads, aitoneSummaryLine, runAitoneChecks } from "../../src/writer/genres/aitone.ts";

const base = { length: false, bannedWords: false, duplicates: "off" as const, locked: true, citations: false };
const ai = (aitone: Record<string, unknown>) =>
	({ ...base, aitone: { enabled: true, ...aitone } }) as Parameters<typeof runAitoneChecks>[1];

describe("runAitoneChecks（词表与千字归一化）", () => {
	test("词表命中加权计入分值；干净文本分值 0 不触发", () => {
		const bad = "综上所述，这项工作具有重要意义。综上所述，它标志着新的起点。综上所述，体现了协同增效。";
		const result = runAitoneChecks(bad, ai({ threshold: 25 }));
		expect(result.flagged).toBe(true);
		expect(result.level).toBe("VERY HIGH");
		expect(result.hits.length).toBeGreaterThan(3);
		const clean = "他把窗台上的那盆绿萝搬进屋里，顺手关掉了亮了一下午的台灯。";
		expect(runAitoneChecks(clean, ai({})).score).toBe(0);
		expect(runAitoneChecks(clean, ai({})).flagged).toBe(false);
	});

	test("阈值按体裁条件化：30 分在阈值 25 时触发、阈值 40 时不触发", () => {
		const text = "这项工作具有重要意义，值得肯定。"; // 空洞拔高词 ×3
		expect(runAitoneChecks(text, ai({ threshold: 25 })).flagged).toBe(true);
		expect(runAitoneChecks(text, ai({ threshold: 40 })).flagged).toBe(false);
	});

	test("学术措辞在正常论文里用更高的体裁阈值避免误报", () => {
		const text = "本文旨在分析这一现象，研究表明这一方法有效。";
		// 2 个学术措辞（加权 4）→ 短文分母下限 500 → 分值 40；学术体裁阈值 60 不误报
		expect(runAitoneChecks(text, ai({ threshold: 25 })).flagged).toBe(true);
		expect(runAitoneChecks(text, ai({ threshold: 60 })).flagged).toBe(false);
	});

	test("小说指纹词只在文学类（fingerprint）检测，应用类不开", () => {
		const text = "他淡淡地说，眼中闪过一丝疲惫。";
		expect(runAitoneChecks(text, ai({ fingerprint: true })).hits.length).toBeGreaterThan(0);
		expect(runAitoneChecks(text, ai({})).hits).toEqual([]);
	});
});

describe("runAitoneChecks（结构正则）", () => {
	test("提示性冒号与翻案腔命中；未命中的正则不误报", () => {
		const colon = "一句话总结：这个方案很好。".repeat(10); // 提示性冒号 ×10
		expect(runAitoneChecks(colon, ai({})).hits.some((h) => h.category === "提示性冒号")).toBe(true);
		const reversal = "不是不想答应，而是不敢答应。".repeat(10);
		expect(runAitoneChecks(reversal, ai({})).hits.some((h) => h.category === "翻案腔")).toBe(true);
		const clean = "他把生锈的铁门推开，走廊里堆满了废弃的课桌椅。".repeat(10);
		expect(runAitoneChecks(clean, ai({})).hits).toEqual([]);
	});

	test("段首三段式：连续 3 段以序数连接词起头才命中；正文句内的首先其次不计", () => {
		const p = (label: string) => `${label}这一段展开具体的内容，长度足够长，不会被重复检查误报。`;
		const run = [p("第一，"), p("第二，"), p("第三，")].join("\n\n");
		expect(runAitoneChecks(run, ai({})).hits.some((h) => h.category === "段首三段式")).toBe(true);
		const tooShort = [p("第一，"), p("第二，")].join("\n\n");
		expect(runAitoneChecks(tooShort, ai({})).hits.some((h) => h.category === "段首三段式")).toBe(false);
		const inSentence = "他先说了第一点，接着是第二点，最后是第三点，说得清楚。".repeat(10);
		expect(runAitoneChecks(inSentence, ai({})).hits.some((h) => h.category === "段首三段式")).toBe(false);
	});
});

describe("runAitoneChecks（分场景开关与语言门控）", () => {
	test("burstiness 只在开启时检查句长方差", () => {
		const uniform = [
			"这句话的长度差不多是十二个字。",
			"那句话的长度也差不多十二个字。",
			"另一句的长度还是很像十二个字。",
			"再来一句的长度差不多十二个字。",
			"最后一句的长度也是十二个字左右。",
		].join("");
		expect(runAitoneChecks(uniform, ai({ burstiness: true })).hits.some((h) => h.category === "句长方差")).toBe(true);
		expect(runAitoneChecks(uniform, ai({})).hits.some((h) => h.category === "句长方差")).toBe(false);
	});

	test("非中文文本跳过中文词表；工具痕迹仍检测", () => {
		const en = "In summary, this approach works well and the data is clear.";
		const result = runAitoneChecks(en, ai({}));
		expect(result.hits).toEqual([]); // 中文词表按语言门控，英文文本不计
		expect(result.toolTraces).toEqual([]);
	});
});

describe("工具痕迹与线索（aitoneLeads / aitoneSummaryLine）", () => {
	test("工具痕迹是铁证，逐条成为线索（quote 为逐字片段）", () => {
		const text = "好的，以下是您要的文章。utm_source=chatgpt\nciteturn0news1\n【产品名称】XX公司";
		const checks = runAitoneChecks(text, ai({}));
		expect(checks.toolTraces.length).toBeGreaterThanOrEqual(4);
		const leads = aitoneLeads(checks);
		expect(leads.some((l) => l.quote === "utm_source=chatgpt")).toBe(true);
		expect(leads.every((l) => l.kind === "other")).toBe(true);
	});

	test("汇总线索只在达到阈值时出现，带分级与命中明细", () => {
		const bad = "综上所述，这项工作具有重要意义。综上所述，它标志着新的起点。综上所述，体现了协同增效。";
		const flagged = runAitoneChecks(bad, ai({ threshold: 25 }));
		expect(aitoneSummaryLine(flagged)).toContain("程序检查：AI 味分值");
		expect(aitoneSummaryLine(flagged)).toContain("综上所述");
		const clean = runAitoneChecks("他把窗台上的那盆绿萝搬进屋里。", ai({}));
		expect(aitoneSummaryLine(clean)).toBeNull();
	});
});
