import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { WritingFlow } from "../../src/writer/flow.ts";
import { readState, updateState } from "../../src/writer/project.ts";
import { makeIO, makeTempProject, OUTLINE, REQUEST, SECTION1, SECTION2, startLong } from "./fixtures.ts";

describe("分节流程中断与恢复（WritingFlow.resume / abort；mock 模型驱动）", () => {
	test("中断恢复：新实例从缺失的那一节继续到组装完成", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(SECTION1);
			// 中断：不再驱动这个实例，用新实例从 state 恢复
			const io2 = makeIO();
			const flow2 = new WritingFlow(root, io2);
			expect(await flow2.resume()).toBe(true);
			expect(flow2.stage).toBe("sectioning");
			expect(io2.sent[0]).toContain("第 2/2 节：流程设计");
			await flow2.onAgentEnd(SECTION2);
			expect(flow2.stage).toBe("reviewing");
			expect(await readFile(join(root, "drafts", "draft-001.md"), "utf-8")).toContain("节写完由程序组装为完整文稿");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("中断恢复：全部小节已在盘上时直接组装并进入检查", async () => {
		const root = await makeTempProject();
		try {
			// 模拟中断发生在最后一节落盘与组装之间
			await mkdir(join(root, "sections"), { recursive: true });
			await writeFile(join(root, "sections", "outline.md"), `${OUTLINE}\n`, "utf-8");
			await writeFile(join(root, "sections", "section-001.md"), `${SECTION1}\n`, "utf-8");
			await writeFile(join(root, "sections", "section-002.md"), `${SECTION2}\n`, "utf-8");
			await updateState(root, (state) => {
				state.stage = "sectioning";
				state.mode = "draft";
				state.lastRequest = REQUEST;
				state.longForm = { sectionCount: 2, sectionIndex: 2 };
			});

			const flow = new WritingFlow(root, makeIO());
			expect(await flow.resume()).toBe(true);
			expect(flow.stage).toBe("reviewing");
			expect(await readFile(join(root, "drafts", "draft-001.md"), "utf-8")).toContain("节写完由程序组装为完整文稿");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("非分节阶段不恢复：state 停在 drafting 时 resume 返回 false", async () => {
		const root = await makeTempProject();
		try {
			const flow = new WritingFlow(root, makeIO());
			await flow.start("draft", "写一段拒邀的说明");
			expect(await flow.resume()).toBe(false);
			expect(flow.stage).toBe("drafting");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("中止：abort 清空 longForm 状态，sections/ 文件保留", async () => {
		const root = await makeTempProject();
		try {
			const flow = new WritingFlow(root, makeIO());
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(SECTION1);
			await flow.abort();
			expect(flow.stage).toBe("idle");
			const state = await readState(root);
			expect(state.stage).toBe("idle");
			expect(state.longForm).toBeUndefined();
			expect(await readdir(join(root, "sections"))).toEqual(["outline.md", "section-001.md"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("运行被中止（stopReason=aborted）：分节轮不重试，明确收尾", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await startLong(flow);
			await flow.onAgentEnd(OUTLINE);
			await flow.onAgentEnd(undefined, { aborted: true });
			expect(flow.stage).toBe("idle");
			expect(io.summaries.at(-1)).toContain("中止");
			expect(io.sent).toHaveLength(2); // 没有重试指令
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
