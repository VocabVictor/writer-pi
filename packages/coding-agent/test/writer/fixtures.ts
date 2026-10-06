/**
 * Shared fixtures for the sectioned-flow tests: mock FlowIO, temp project, outline/section texts.
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WritingFlow } from "../../src/writer/flow.ts";
import { ensureProject } from "../../src/writer/project.ts";
import type { FlowIO } from "../../src/writer/types.ts";

interface MockIO {
	sent: string[];
	toolSets: string[][];
	notifications: { message: string; type?: string }[];
	summaries: string[];
}

export function makeIO(): MockIO & FlowIO {
	const mock: MockIO = { sent: [], toolSets: [], notifications: [], summaries: [] };
	return {
		...mock,
		sendUserMessage(text: string) {
			mock.sent.push(text);
		},
		setActiveTools(names: string[]) {
			mock.toolSets.push(names);
		},
		notify(message: string, type?: "info" | "warning" | "error") {
			mock.notifications.push({ message, type });
		},
		summary(markdown: string) {
			mock.summaries.push(markdown);
		},
	};
}

export async function makeTempProject(brief = "# 写作要求\n\n长度：600-900 字\n"): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "writer-pi-sections-"));
	await ensureProject(root);
	await writeFile(join(root, "brief.md"), brief, "utf-8");
	return root;
}

export const OUTLINE = [
	"## 第 1 节：背景与问题",
	"",
	"- 为什么要分节写作",
	"- 单轮产出的上限在哪里",
	"",
	"## 第 2 节：流程设计",
	"",
	"- 提纲先行",
	"- 逐节推进与组装",
].join("\n");

export const SECTION1 = [
	"## 第 1 节：背景与问题",
	"",
	"长文单轮产出会撞上输出上限，结尾被截断甚至整段为空。",
	"分节写作把全文拆成小节，每节单独一轮，模型只需要产出一段可管理的正文。",
].join("\n");

export const SECTION2 = [
	"## 第 2 节：流程设计",
	"",
	"提纲先落盘，之后每一节基于提纲、前文与素材写一轮。",
	"节写完由程序组装为完整文稿，再走现有的检查与局部修改流程。",
].join("\n");

export const REQUEST = "写一篇关于分节写作的说明文";

export async function startLong(flow: WritingFlow) {
	// brief 目标 600-900 字低于阈值：显式 --long 走分节流程
	await flow.start("draft", REQUEST, { long: true });
}
