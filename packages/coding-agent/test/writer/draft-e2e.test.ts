/**
 * Draft e2e: the print-mode entry (a single prompt, no TUI) must produce a sample
 * article on disk. The model is scripted (faux provider); the agent loop, save_draft
 * tool, writing flow and file layout run for real — prompt in, drafts/draft-001.md out.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { readState } from "../../src/writer/project.ts";
import { createHarness, type Harness } from "../suite/harness.ts";

const SAMPLES = [
	{
		prompt: "写一封回复部门聚餐邀请的邮件",
		article: "各位同事：\n\n感谢聚餐邀请，这次先不参加了，下周约饭。",
	},
	{
		prompt: "写一首关于秋夜的小诗",
		article: "落叶铺满小径，\n晚风把灯吹亮。",
	},
	{
		prompt: "写一段下班路上的散文",
		article: "暮色四合，街角的糖炒栗子还冒着热气。",
	},
];

describe("draft e2e: prompt generates a sample article on disk", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	for (const { prompt, article } of SAMPLES) {
		test(`非交互提示词生成样本文章：${prompt}`, async () => {
			const harness = await createHarness();
			harnesses.push(harness);

			harness.setResponses([
				fauxAssistantMessage(fauxToolCall("save_draft", { content: article, note: "初稿" }), {
					stopReason: "toolUse",
				}),
				fauxAssistantMessage("初稿已保存。"),
			]);

			await harness.session.prompt(prompt);

			// save_draft runs for real: the article lands, version and note reach state.json
			expect(await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8")).toBe(article);
			const state = await readState(harness.tempDir);
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.draftCount).toBe(1);
			expect(state.draftNotes).toEqual({ "1": "初稿" });
		});
	}
});
