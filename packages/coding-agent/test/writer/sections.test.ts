import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { WritingFlow } from "../../src/writer/flow.ts";
import { MIN_SECTION_CHARS } from "../../src/writer/longform.ts";
import { readState } from "../../src/writer/project.ts";
import { makeIO, makeTempProject, OUTLINE, REQUEST, SECTION1, SECTION2, startLong } from "./fixtures.ts";

describe("分节写作流程（LongFormFlow + WritingFlow；mock 模型驱动，mock 通过 ≠ 实际模型通过）", () => {
	test("完整闭环：提纲 → 逐节 → 组装落盘 → 检查通过，longForm 状态清空", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			expect(flow.stage).toBe("outlining");
			expect(io.toolSets[0]).toEqual(["read"]); // 提纲轮没有 save_draft
			expect(io.sent[0]).toContain("长文提纲");
			expect(io.sent[0]).toContain(REQUEST);

			await flow.onAgentEnd(OUTLINE);
			expect(await readFile(join(root, "sections", "outline.md"), "utf-8")).toBe(`${OUTLINE}\n`);
			expect(flow.stage).toBe("sectioning");
			expect(await readState(root)).toEqual(
				expect.objectContaining({ longForm: { sectionCount: 2, sectionIndex: 1 } }),
			);
			expect(io.sent[1]).toContain("第 1/2 节：背景与问题");
			expect(io.sent[1]).toContain("本节约");

			await flow.onAgentEnd(SECTION1);
			expect(await readFile(join(root, "sections", "section-001.md"), "utf-8")).toContain("分节写作把全文拆成小节");
			expect(io.sent[2]).toContain("第 2/2 节：流程设计");
			expect(io.sent[2]).toContain("上一节结尾"); // 前文衔接注入

			await flow.onAgentEnd(SECTION2);
			const assembled = await readFile(join(root, "drafts", "draft-001.md"), "utf-8");
			expect(assembled).toContain("长文单轮产出会撞上输出上限");
			expect(assembled).toContain("节写完由程序组装为完整文稿");
			expect(flow.stage).toBe("reviewing");

			await flow.onAgentEnd('{"issues": []}');
			expect(flow.stage).toBe("idle");
			const state = await readState(root);
			expect(state.longForm).toBeUndefined();
			expect(state.currentDraft).toBe("drafts/draft-001.md");
			expect(state.draftCount).toBe(1);
			expect(state.reviewCount).toBe(1);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("多节提纲（4 节）逐节写，组装只包含计划内的小节", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			const four = ["## 第 1 节：一\n- a", "## 第 2 节：二\n- b", "## 第 3 节：三\n- c", "## 第 4 节：四\n- d"].join(
				"\n\n",
			);
			await flow.onAgentEnd(four);
			expect(flow.longForm?.sectionCount).toBe(4);
			for (let i = 1; i <= 4; i++) {
				await flow.onAgentEnd(
					`## 第 ${i} 节：第${i}节正文。内容写成两段完整的说明文字，覆盖该节提纲的要点，长度足以通过最短检查。\n\n第二段补充该节的细节，保证这一节有足够的正文内容。`,
				);
			}
			expect(flow.stage).toBe("reviewing");
			// 过期的小节（section-005）不进入组装
			await writeFile(join(root, "sections", "section-005.md"), "过期内容不应出现在组装稿中。\n", "utf-8");
			expect(await readFile(join(root, "drafts", "draft-001.md"), "utf-8")).not.toContain("过期内容");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("新流程重置工作区：上次中断留下的过期小节不混入本次组装", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(SECTION1);
			await flow.abort();

			const io2 = makeIO();
			const flow2 = new WritingFlow(root, io2);
			await startLong(flow2);
			await flow2.onAgentEnd(OUTLINE);
			const fresh1 =
				"## 第 1 节：背景与问题\n\n这是新流程重写的第一节，内容与上次中断留下的过期小节完全不同，背景交代以新提纲为准。\n\n长文单轮产出不可靠，所以这一节单独写一轮，写完由程序落盘为工作区文件。";
			const fresh2 =
				"## 第 2 节：流程设计\n\n这是新流程重写的第二节，提纲先落盘再逐节推进，最后由程序组装为完整文稿并进入检查。\n\n组装只拼接计划内的小节，工作区在新流程开始时重置，过期内容不会混入。";
			await flow2.onAgentEnd(fresh1);
			await flow2.onAgentEnd(fresh2);
			expect(flow2.stage).toBe("reviewing");
			const assembled = await readFile(join(root, "drafts", "draft-001.md"), "utf-8");
			expect(assembled).toContain("这是新流程重写的第一节");
			expect(assembled).not.toContain("分节写作把全文拆成小节"); // 过期小节不混入
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("提纲无效：允许一次重试，重试成功继续分节", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd("这篇文稿我想分三个部分来写，先讲背景，再讲流程，最后讲中断恢复。");
			expect(flow.stage).toBe("outlining");
			expect(io.sent[1]).toContain("重新输出提纲");
			await flow.onAgentEnd(OUTLINE);
			expect(flow.stage).toBe("sectioning");
			expect(await readFile(join(root, "sections", "outline.md"), "utf-8")).toContain("第 1 节");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("提纲两次无效：退回单轮全文流程，不留下分节状态", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd("第一次没有分节。");
			await flow.onAgentEnd("第二次还是没有分节。");
			expect(flow.stage).toBe("drafting");
			expect(io.sent.at(-1)).toContain("save_draft");
			expect(io.toolSets.at(-1)).toContain("save_draft");
			const state = await readState(root);
			expect(state.stage).toBe("drafting");
			expect(state.longForm).toBeUndefined();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test(`小节回复过短（< ${MIN_SECTION_CHARS} 字）：允许一次重试，再次失败明确收尾`, async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd("第 1 节写完了。");
			expect(io.sent[2]).toContain("重新写第 1/2 节");
			await flow.onAgentEnd("还是没写好。");
			expect(flow.stage).toBe("idle");
			expect(io.summaries.at(-1)).toContain("第 1 节两次");
			expect(await readdir(join(root, "sections"))).toEqual(["outline.md"]);
			const state = await readState(root);
			expect(state.stage).toBe("idle");
			expect(state.longForm).toBeUndefined();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("检查轮直改：长文检查轮给出可用段落替换时直接应用，跳过修改轮", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(SECTION1);
			await flow.onAgentEnd(SECTION2);
			const quote = "分节写作把全文拆成小节，每节单独一轮，模型只需要产出一段可管理的正文。";
			await flow.onAgentEnd(
				JSON.stringify({
					issues: [{ kind: "over_explanation", paragraph: 3, quote, reason: "同一意思重复", suggestion: "压缩" }],
					edits: [{ paragraph: 3, original: quote, replacement: "分节写作把全文拆成小节，每节只产出一段正文。" }],
				}),
			);
			expect(flow.stage).toBe("reviewing"); // 直改后复核
			expect(flow.round).toBe(1);
			expect(await readFile(join(root, "drafts", "draft-002.md"), "utf-8")).toContain("每节只产出一段正文");
			expect(io.sent.filter((s) => s.includes("修改任务"))).toHaveLength(0); // 修改轮没有发生
			await flow.onAgentEnd('{"issues": []}');
			expect(flow.stage).toBe("idle");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("检查轮直改：替换无效（原文不在文稿中）时退回修改轮", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(SECTION1);
			await flow.onAgentEnd(SECTION2);
			await flow.onAgentEnd(
				JSON.stringify({
					issues: [
						{
							kind: "other",
							paragraph: 1,
							quote: "长文单轮产出会撞上输出上限，结尾被截断甚至整段为空。",
							reason: "r",
						},
					],
					edits: [{ paragraph: 1, original: "这句根本不在文稿里。", replacement: "x" }],
				}),
			);
			expect(flow.stage).toBe("revising"); // 无效替换 → 修改轮兜底
			expect(io.sent.at(-1)).toContain("修改任务");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
