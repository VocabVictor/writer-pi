import { rm } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { WritingFlow } from "../../src/writer/flow.ts";
import { LongFormFlow } from "../../src/writer/longflow.ts";
import { parseOutline } from "../../src/writer/longform.ts";
import { parseDimensionArgs } from "../../src/writer/ops.ts";
import { makeIO, makeTempProject, OUTLINE, REQUEST } from "./fixtures.ts";

describe("长文路由与提纲解析（WritingFlow + LongFormFlow；mock 模型驱动）", () => {
	test("长文路由：17 档长度全覆盖，阈值上下分界明确", async () => {
		const short = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 800];
		const long = [1000, 3000, 5000, 6000, 8000, 10000];
		for (const n of [...short, ...long]) {
			const root = await makeTempProject(`# 写作要求\n\n长度：${n} 字\n`);
			try {
				const io = makeIO();
				const flow = new WritingFlow(root, io);
				await flow.start("draft", "写一篇说明文");
				if (n >= 1000) {
					expect(flow.stage, `${n} 字应路由到分节流程`).toBe("outlining");
					expect(io.sent[0]).toContain("长文提纲");
				} else {
					expect(flow.stage, `${n} 字应走单轮起草`).toBe("drafting");
					expect(io.sent[0]).not.toContain("长文提纲");
				}
			} finally {
				await rm(root, { recursive: true, force: true });
			}
		}
	});

	test("阈值边界：brief 800 字走单轮，1000 字走分节，3000 字走分节", async () => {
		for (const [n, expected] of [
			[800, "drafting"],
			[1000, "outlining"],
			[3000, "outlining"],
		] as const) {
			const root = await makeTempProject(`# 写作要求\n\n长度：${n} 字\n`);
			try {
				const flow = new WritingFlow(root, makeIO());
				await flow.start("draft", "写一篇说明文");
				expect(flow.stage, `${n} 字`).toBe(expected);
			} finally {
				await rm(root, { recursive: true, force: true });
			}
		}
	});

	test("无长度口径时 --long 显式路由；parseDimensionArgs 解析 --long", () => {
		const { dimensions, request } = parseDimensionArgs(`--long ${REQUEST}`);
		expect(dimensions.long).toBe(true);
		expect(request).toBe(REQUEST);
	});

	describe("LongFormFlow 单元（提纲解析）", () => {
		test("parseOutline：编号节优先，无编号退回 ## 标题，无标题返回空", () => {
			expect(parseOutline(OUTLINE).map((p) => p.title)).toEqual(["背景与问题", "流程设计"]);
			expect(parseOutline(OUTLINE)[0].points).toEqual(["为什么要分节写作", "单轮产出的上限在哪里"]);
			const generic = "# 提纲\n\n## 背景\n- 要点一\n\n## 展开\n- 要点二";
			expect(parseOutline(generic).map((p) => p.title)).toEqual(["背景", "展开"]);
			expect(parseOutline("没有标题的一段提纲文字。")).toEqual([]);
		});

		test("LongFormFlow.progress 反映分节进度", async () => {
			const root = await makeTempProject();
			try {
				const io = makeIO();
				const flow = new LongFormFlow(root, io, "email", REQUEST);
				expect(flow.progress()).toEqual({ sectionCount: 0, sectionIndex: 0 });
				await flow.start();
				await flow.onAgentEnd(OUTLINE, false);
				expect(flow.progress()).toEqual({ sectionCount: 2, sectionIndex: 1 });
			} finally {
				await rm(root, { recursive: true, force: true });
			}
		});
	});
});
