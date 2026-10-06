/**
 * Output format / template support (输出格式/模板): --format=<格式> in the command, settings
 * defaults (defaultTemplate/defaultGenre/defaultFormat), saveDraft 的扩展名按格式定
 * （latex → .tex），.tex 版本与 .md 版本共存。faux provider 跑真管线。
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, test } from "vitest";
import { WritingFlow } from "../../src/writer/flow.ts";
import { extensionFor, formatInstruction, getFormat } from "../../src/writer/formats.ts";
import { parseDimensionArgs } from "../../src/writer/ops.ts";
import { ensureProject, readState } from "../../src/writer/project.ts";
import type { FlowIO } from "../../src/writer/types.ts";
import { diffDrafts, listDrafts, revertTo } from "../../src/writer/versions.ts";
import { createHarness, type Harness } from "../suite/harness.ts";

interface MockIO {
	sent: string[];
	notifications: { message: string; type?: string }[];
}

function makeIO(): MockIO & FlowIO {
	const mock: MockIO = { sent: [], notifications: [] };
	return {
		...mock,
		sendUserMessage(text: string) {
			mock.sent.push(text);
		},
		setActiveTools() {},
		notify(message: string, type?: "info" | "warning" | "error") {
			mock.notifications.push({ message, type });
		},
		summary() {},
	};
}

const LATEX_ARTICLE = [
	"\\documentclass{article}",
	"\\begin{document}",
	"\\section{引言}",
	"长文写作流程的输出格式由 formats 注册表决定，扩展名按格式落盘。",
	"\\section{结论}",
	"latex 格式的文稿保存为 .tex 文件，内容是 LaTeX 源码。",
	"\\end{document}",
].join("\n");

describe("输出格式/模板支持（faux 脚本化模型，真管线）", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	test("--format 解析：--format=latex 与 --format latex 两种写法", () => {
		expect(parseDimensionArgs("--format=latex 写一封信").dimensions.format).toBe("latex");
		expect(parseDimensionArgs("--format latex 写一封信").dimensions.format).toBe("latex");
		const { dimensions, request } = parseDimensionArgs("--format=markdown 写一封信");
		expect(dimensions.format).toBe("markdown");
		expect(request).toBe("写一封信");
	});

	test("formats 注册表：latex → .tex，markdown/docx → .md，未知 id 无格式", () => {
		expect(getFormat("latex")?.extension).toBe("tex");
		expect(extensionFor("latex")).toBe("tex");
		expect(extensionFor("markdown")).toBe("md");
		expect(extensionFor("docx")).toBe("md"); // 二进制转换不在本期：内容按目标格式写
		expect(extensionFor(undefined)).toBe("md");
		expect(extensionFor("nope")).toBe("md");
		expect(formatInstruction("latex")).toContain("documentclass");
		expect(formatInstruction("nope")).toBeNull();
	});

	test("faux e2e：--format=latex 产出 latex 内容落盘 .tex，state.format 记录", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		harness.setResponses([
			fauxAssistantMessage(fauxToolCall("save_draft", { content: LATEX_ARTICLE, note: "初稿" }), {
				stopReason: "toolUse",
			}),
			fauxAssistantMessage('{"issues": []}'),
			fauxAssistantMessage('{"issues": []}'),
		]);

		await harness.session.prompt("/draft --format=latex 写一篇课程作业");

		// 落盘为 .tex，内容逐字一致
		expect(await readFile(join(harness.tempDir, "drafts", "draft-001.tex"), "utf-8")).toBe(LATEX_ARTICLE);
		const state = await readState(harness.tempDir);
		expect(state.format).toBe("latex");
		expect(state.currentDraft).toBe("drafts/draft-001.tex");
		expect(state.draftCount).toBe(1);
		expect(state.stage).toBe("idle");
	});

	test("settings 默认生效：defaultFormat/defaultGenre/defaultTemplate 注入流程", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		// 项目级 settings（cwd/.pi/settings.json）：默认格式 latex、默认体裁 essay、默认模板
		await mkdir(join(harness.tempDir, ".pi"), { recursive: true });
		await writeFile(
			join(harness.tempDir, ".pi", "settings.json"),
			JSON.stringify({
				defaultFormat: "latex",
				defaultGenre: "essay",
				defaultTemplate: "第一段交代背景，第二段给出方法，第三段收束。",
			}),
		);
		harness.setResponses([
			fauxAssistantMessage(fauxToolCall("save_draft", { content: LATEX_ARTICLE }), { stopReason: "toolUse" }),
			fauxAssistantMessage('{"issues": []}'),
			fauxAssistantMessage('{"issues": []}'),
		]);

		await harness.session.prompt("/draft 写一篇课程作业");

		const state = await readState(harness.tempDir);
		expect(state.format).toBe("latex"); // settings 默认格式生效
		expect(state.genre).toBe("essay"); // settings 默认体裁生效
		expect(await readFile(join(harness.tempDir, "drafts", "draft-001.tex"), "utf-8")).toBe(LATEX_ARTICLE);
	});

	test("settings 默认模板注入起草指令；显式 --format 覆盖 settings 默认格式", async () => {
		const root = await mkdtemp(join(tmpdir(), "writer-pi-formats-"));
		try {
			await ensureProject(root);
			await mkdir(join(root, ".pi"), { recursive: true });
			await writeFile(
				join(root, ".pi", "settings.json"),
				JSON.stringify({ defaultFormat: "markdown", defaultTemplate: "先列事实，再给判断。" }),
			);
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await flow.start("draft", "写一篇课程作业");
			expect(io.sent[0]).toContain("先列事实，再给判断。");
			expect(io.sent[0]).toContain("# 输出格式");

			const flow2 = new WritingFlow(root, io);
			await flow2.start("draft", "写一篇课程作业", { format: "latex" });
			expect(io.sent[1]).toContain("documentclass");
			expect(await readState(root)).toEqual(expect.objectContaining({ format: "latex" }));
			await flow2.abort();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("未知 --format：告警并忽略，默认 .md", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		harness.setResponses([
			fauxAssistantMessage(fauxToolCall("save_draft", { content: "短文内容，格式未知时按 Markdown 落盘。" }), {
				stopReason: "toolUse",
			}),
			fauxAssistantMessage('{"issues": []}'),
			fauxAssistantMessage('{"issues": []}'),
		]);
		await harness.session.prompt("/draft --format=pages 写一封信");
		expect(await readFile(join(harness.tempDir, "drafts", "draft-001.md"), "utf-8")).toContain("短文内容");
		const state = await readState(harness.tempDir);
		expect(state.format).toBeNull();
	});

	test(".tex 版本与 .md 版本共存：listDrafts/diff/revert 都按版本号工作", async () => {
		const root = await mkdtemp(join(tmpdir(), "writer-pi-formats-"));
		try {
			await ensureProject(root);
			// latex 格式下保存 .tex，再切回 markdown 保存 .md
			const tex = await saveTex(root);
			const md = await saveMd(root);
			expect(tex.path).toBe("drafts/draft-001.tex");
			expect(md.path).toBe("drafts/draft-002.md");
			const listed = await listDrafts(root);
			expect(listed.map((d) => d.path)).toEqual(["drafts/draft-001.tex", "drafts/draft-002.md"]);
			const patch = await diffDrafts(root);
			expect(patch).toContain("---");
			expect(patch).toContain("+++");
			const reverted = await revertTo(root, 1);
			expect(reverted?.path).toBe("drafts/draft-003.md"); // 回退按当前格式（markdown）扩展名
			expect(await readFile(join(root, "drafts", "draft-003.md"), "utf-8")).toContain("documentclass");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

async function saveTex(root: string) {
	const flow = new WritingFlow(root, makeIO());
	await flow.start("draft", "写一篇课程作业", { format: "latex" });
	return flow.toolSaveDraft(LATEX_ARTICLE);
}

async function saveMd(root: string) {
	const flow = new WritingFlow(root, makeIO());
	await flow.start("draft", "写一篇课程作业", { format: "markdown" });
	return flow.toolSaveDraft("markdown 内容的文稿。");
}
