/**
 * Interactive writer wiring: the runtime UI adapter (notify/select/widget) that
 * interactive mode injects at startup, and the /draft dispatch through
 * AgentSession.prompt. The model is scripted (faux provider); the writing flow,
 * project layout and widget refresh run for real.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type FauxResponseStep, fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { ensureProject, readState } from "../src/writer/project.ts";
import { writerRuntime } from "../src/writer/runtime.ts";
import { saveDraft } from "../src/writer/versions.ts";
import { createHarness, getMessageText, type Harness } from "./suite/harness.ts";

function customTypeOf(message: unknown): string | undefined {
	if (!message || typeof message !== "object" || !("customType" in message)) return undefined;
	return (message as { customType?: string }).customType;
}

/** Custom message bodies for `type`, taken from session events (both queue paths emit them). */
function customTexts(harness: Harness, type: string): string[] {
	return harness
		.eventsOfType("message_end")
		.filter((event) => customTypeOf(event.message) === type)
		.map((event) => getMessageText(event.message));
}

/** Recorded writer UI, the same surface interactive mode injects via writerRuntime.setUI. */
function writerUI(answer?: (options: string[]) => string | undefined) {
	const ui = {
		notifications: [] as { message: string; type: string }[],
		selections: [] as { title: string; options: string[] }[],
		widgets: [] as string[][],
	};
	writerRuntime.setUI({
		notify: (message, type) => {
			ui.notifications.push({ message, type: type ?? "info" });
		},
		select: async (title, options) => {
			ui.selections.push({ title, options });
			return answer?.(options);
		},
		setWidget: (lines) => {
			if (lines) ui.widgets.push(lines);
		},
	});
	return ui;
}

const ARTICLE = "各位同事：\n\n感谢聚餐邀请，这次先不参加了，下周约饭。";

/**
 * One /draft cycle: save the draft, the review finds no issues, then a reply to the summary echo.
 * The first step is delayed so the save_draft write does not race flow.start's own state.json
 * write (the runtime fires the agent run without awaiting it).
 */
function draftCycleResponses(): FauxResponseStep[] {
	return [
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			return fauxAssistantMessage(fauxToolCall("save_draft", { content: ARTICLE, note: "初稿" }), {
				stopReason: "toolUse",
			});
		},
		fauxAssistantMessage("初稿已保存。"),
		fauxAssistantMessage('{"issues": []}'),
		fauxAssistantMessage("收到。"),
	];
}

describe("interactive writer wiring（writerRuntime UI + prompt 分发）", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		// The runtime UI is a module singleton: reset it so the mock never leaks between tests.
		writerRuntime.setUI({ notify: () => {} });
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	test("/draft 分发到写作流程：指令进 agent、初稿落盘、widget 刷新", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI();
		harness.setResponses(draftCycleResponses());

		await harness.session.prompt("/draft 写一段拒邀的说明");

		// The dispatch ran the writing flow for real: scaffold on disk, draft saved, stage back to idle.
		expect(existsSync(join(harness.tempDir, "brief.md"))).toBe(true);
		expect(await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8")).toBe(ARTICLE);
		const state = await readState(harness.tempDir);
		expect(state.stage).toBe("idle");
		expect(state.currentDraft).toBe("drafts/draft-001.md");

		// The first instruction reached the agent as a writer_flow custom message.
		const flowTexts = customTexts(harness, "writer_flow");
		expect(flowTexts.length).toBeGreaterThan(0);
		expect(flowTexts[0]).toContain("写一段拒邀的说明");

		// The widget was refreshed while the flow ran and again after it settled.
		const widgets = ui.widgets.map((lines) => lines.join("\n"));
		expect(widgets.some((lines) => lines.includes("流程进行中：drafting"))).toBe(true);
		expect(widgets.at(-1)).toContain("体裁 email");
		expect(widgets.at(-1)).toContain("当前 drafts/draft-001.md");

		// The genre choice was announced to the TUI and the flow wrapped up with a summary.
		expect(
			ui.notifications.some((n) => n.message.includes("体裁：邮件与实用文本") && n.message.includes("操作：draft")),
		).toBe(true);
		expect(customTexts(harness, "writer_summary").some((s) => s.includes("未发现问题"))).toBe(true);
	});

	test("非命令文本直接进 agent：不触发 writer 命令", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI();
		harness.setResponses([fauxAssistantMessage("这是一封简短的回复。")]);

		await harness.session.prompt("写一封简短的回复邮件");

		// The agent answered the plain prompt itself.
		expect(
			harness.session.messages.some(
				(message) => message.role === "assistant" && getMessageText(message).includes("这是一封简短的回复。"),
			),
		).toBe(true);
		// No writing flow state, no writer summary, no widget or selector interaction.
		expect(existsSync(join(harness.tempDir, "state.json"))).toBe(false);
		expect(customTexts(harness, "writer_summary")).toEqual([]);
		expect(ui.widgets).toEqual([]);
		expect(ui.selections).toEqual([]);
	});

	test("/writing 输出项目状态摘要并刷新 widget", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI();

		await harness.session.prompt("/writing");

		const summaries = customTexts(harness, "writer_summary");
		expect(summaries).toHaveLength(1);
		const summary = summaries[0] ?? "";
		expect(summary).toContain("writer-pi 项目状态");
		expect(summary).toContain("阶段：idle");
		expect(summary).toContain("体裁 邮件与实用文本（email");
		expect(summary).toContain("当前文稿：无（共 0 版）");
		expect(summary).toContain("brief.md：存在");
		// /writing created the project skeleton on demand.
		expect(existsSync(join(harness.tempDir, "state.json"))).toBe(true);
		// The status command only reads the genre, so the widget still shows it as unset.
		expect(ui.widgets.at(-1)?.join("\n")).toContain("体裁 未定");
	});

	test("/drafts 无版本时提示，有版本时列出当前标记", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI();

		await harness.session.prompt("/drafts");
		expect(ui.notifications).toEqual([{ message: "drafts/ 下还没有版本。", type: "info" }]);
		expect(customTexts(harness, "writer_summary")).toEqual([]);

		// saveDraft needs the drafts/ dir, so scaffold the project first.
		await ensureProject(harness.tempDir);
		await saveDraft(harness.tempDir, "第一版正文。");
		await saveDraft(harness.tempDir, "第二版正文。");
		await harness.session.prompt("/drafts");

		const summary = customTexts(harness, "writer_summary").at(-1) ?? "";
		expect(summary).toContain("草稿版本");
		expect(summary).toContain("draft-001.md");
		expect(summary).toContain("draft-002.md");
		expect(summary).toContain("← 当前");
	});

	test("/genre 列出体裁，/genre <id> 切换并持久化", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI();

		await harness.session.prompt("/genre");
		const summary = customTexts(harness, "writer_summary").at(-1) ?? "";
		expect(summary).toContain("可用体裁");
		expect(summary).toContain("`poetry`");

		await harness.session.prompt("/genre poetry");

		expect(ui.notifications.at(-1)?.message).toContain("当前体裁已设为");
		expect((await readState(harness.tempDir)).genre).toBe("poetry");
		// The widget reflects the switched genre.
		expect(ui.widgets.at(-1)?.join("\n")).toContain("体裁 poetry");
	});

	test("体裁歧义时通过 ui.select 询问用户，选中体裁生效", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		// 散文与小说各命中一个强体裁词，分数并列：让选择器返回 essay 选项。
		const ui = writerUI((options) => options.find((option) => option.includes("essay")));
		harness.setResponses(draftCycleResponses());

		await harness.session.prompt("/draft 散文 小说");

		expect(ui.selections).toHaveLength(1);
		expect(ui.selections[0]?.title).toContain("多个体裁");
		expect(ui.selections[0]?.options).toEqual(
			expect.arrayContaining(["体裁：essay", "体裁：fiction", "用兜底体裁（实用文本）"]),
		);
		// The picked genre took effect and the flow ran to a saved draft.
		expect((await readState(harness.tempDir)).genre).toBe("essay");
		expect(await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8")).toBe(ARTICLE);
	});

	test("取消体裁选择时不启动流程", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI(() => undefined);

		await harness.session.prompt("/draft 散文 小说");

		expect(ui.selections).toHaveLength(1);
		// Nothing was written and no agent turn was started.
		expect(existsSync(join(harness.tempDir, "state.json"))).toBe(false);
		expect(harness.getPendingResponseCount()).toBe(0);
	});

	test("选择兜底体裁时流程仍以兜底体裁启动", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		const ui = writerUI((options) => options.find((option) => option.startsWith("用兜底")));
		harness.setResponses(draftCycleResponses());

		await harness.session.prompt("/draft 散文 小说");

		expect(ui.selections).toHaveLength(1);
		const state = await readState(harness.tempDir);
		expect(state.genre).toBe("email");
		expect(state.currentDraft).toBe("drafts/draft-001.md");
	});
});
