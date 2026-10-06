/**
 * Length-tier e2e: every one of the 17 length tiers runs the real pipeline (faux provider
 * scripted model, real /draft command, real file layout). 50-800 字 route to the single-round
 * pipeline; 1000-10000 字 route to the sectioned pipeline. 断言真管线完整落盘、字数核对正确、
 * state/review 不因长内容出错。
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { countWords as countDraftWords } from "../../src/writer/checker.ts";
import { readState } from "../../src/writer/project.ts";
import { createHarness, type Harness } from "../suite/harness.ts";

interface Tier {
	n: number;
	/** Section count for the sectioned pipeline; undefined = single-round pipeline. */
	sections?: number;
}

const SINGLE_TIERS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 800];
const SECTIONED_TIERS: Tier[] = [
	{ n: 1000, sections: 2 },
	{ n: 3000, sections: 3 },
	{ n: 5000, sections: 4 },
	{ n: 6000, sections: 4 },
	{ n: 8000, sections: 5 },
	{ n: 10000, sections: 5 },
];

// 纯中文字干（无标点无数字）：拼接裁剪到目标字数后，字数统计恰好等于长度档位。
const STEMS = [
	"长文写作流程把全文分成若干小节逐节打磨",
	"每一节写完由程序落盘为工作区文件保存",
	"组装只拼接计划内的小节并保存为新版本",
	"检查环节对长文跑程序检查与语义检查",
	"中断后状态从缺失的那一节继续到组装",
	"字数统计覆盖中文字符与数字组的口径",
];

function zhText(chars: number, start: number): string {
	let out = "";
	let i = 0;
	while (out.length < chars) {
		out += STEMS[(i + start) % STEMS.length];
		i += 1;
	}
	return out.slice(0, chars);
}

function outlineFor(sections: number): string {
	return Array.from({ length: sections }, (_, i) => `## 第 ${i + 1} 节：第${i + 1}部分`).join("\n");
}

describe("长度档位 e2e（faux 脚本化模型，真管线：提示词进 → drafts/draft-NNN.md 出）", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	for (const n of SINGLE_TIERS) {
		test(`单轮档位 ${n} 字：全文一次产出，字数核对正确`, async () => {
			const harness = await createHarness();
			harnesses.push(harness);
			const article = zhText(n, 0);

			harness.setResponses([
				fauxAssistantMessage(fauxToolCall("save_draft", { content: article, note: "初稿" }), {
					stopReason: "toolUse",
				}),
				fauxAssistantMessage('{"issues": []}'),
			]);

			await harness.session.prompt(`/draft 写一篇说明文，长度：${n} 字`);

			// 全文完整落盘，不被截断
			const onDisk = await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8");
			expect(onDisk).toBe(article);
			// 字数核对：管线统计与实际文稿一致，且达到档位
			expect(countDraftWords(onDisk).wordCount).toBe(n);
			const review = JSON.parse(await readFile(join(harness.tempDir, "reviews", "review-001.json"), "utf-8"));
			expect(review.programChecks.length.wordCount).toBe(n);
			expect(review.programChecks.length.withinTarget).toBe(true);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.draftCount).toBe(1);
			expect(state.stage).toBe("idle");
		});
	}

	for (const { n, sections } of SECTIONED_TIERS) {
		test(`分节档位 ${n} 字：提纲 → ${sections} 节 → 组装，字数核对正确`, async () => {
			const harness = await createHarness();
			harnesses.push(harness);
			const per = n / (sections ?? 1);
			const sectionTexts = Array.from({ length: sections ?? 1 }, (_, i) => zhText(per, i));

			harness.setResponses([
				fauxAssistantMessage(outlineFor(sections ?? 1)),
				...sectionTexts.map((text) => fauxAssistantMessage(text)),
				fauxAssistantMessage('{"issues": []}'),
			]);

			await harness.session.prompt(`/draft 写一篇说明文，长度：${n} 字`);

			// 提纲与各节完整落盘
			const sectionDir = join(harness.tempDir, "sections");
			expect(await readFile(join(sectionDir, "outline.md"), "utf-8")).toContain(`## 第 ${sections} 节`);
			for (let i = 1; i <= (sections ?? 1); i++) {
				expect(await readFile(join(sectionDir, `section-${String(i).padStart(3, "0")}.md`), "utf-8")).toBe(
					`${sectionTexts[i - 1]}\n`,
				);
			}
			// 组装稿完整：各节按序拼接，字数恰好是档位
			const assembled = await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8");
			expect(assembled).toBe(sectionTexts.join("\n\n"));
			expect(countDraftWords(assembled).wordCount).toBe(n);
			const review = JSON.parse(await readFile(join(harness.tempDir, "reviews", "review-001.json"), "utf-8"));
			expect(review.programChecks.length.wordCount).toBe(n);
			expect(review.programChecks.length.withinTarget).toBe(true);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.draftCount).toBe(1);
			expect(state.stage).toBe("idle");
			expect(state.longForm).toBeUndefined();
		});
	}

	test("阈值分界：800 字不产生 sections/，1000 字产生 sections/", async () => {
		for (const [n, wantsSections] of [
			[800, false],
			[1000, true],
		] as const) {
			const harness = await createHarness();
			harnesses.push(harness);
			if (wantsSections) {
				harness.setResponses([
					fauxAssistantMessage(outlineFor(2)),
					fauxAssistantMessage(zhText(500, 0)),
					fauxAssistantMessage(zhText(500, 1)),
					fauxAssistantMessage('{"issues": []}'),
				]);
			} else {
				harness.setResponses([
					fauxAssistantMessage(fauxToolCall("save_draft", { content: zhText(n, 0) }), { stopReason: "toolUse" }),
					fauxAssistantMessage('{"issues": []}'),
				]);
			}
			await harness.session.prompt(`/draft 写一篇说明文，长度：${n} 字`);
			const names = await readdir(join(harness.tempDir, "sections")).catch(() => [] as string[]);
			expect(names.length > 0, `${n} 字`).toBe(wantsSections);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.stage).toBe("idle");
		}
	});
});
