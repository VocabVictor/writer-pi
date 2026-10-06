import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { MAX_REVISION_ROUNDS, WritingFlow } from "../../src/writer/flow.ts";
import { ensureProject, readState } from "../../src/writer/project.ts";
import type { FlowIO } from "../../src/writer/types.ts";

interface MockIO {
	sent: string[];
	toolSets: string[][];
	notifications: { message: string; type?: string }[];
	summaries: string[];
}

function makeIO(): MockIO & FlowIO {
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

async function makeTempProject(files: Record<string, string> = {}): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "writer-pi-flow-"));
	await ensureProject(root);
	for (const [path, content] of Object.entries(files)) {
		await writeFile(join(root, path), content, "utf-8");
	}
	return root;
}

const DRAFT = "第一段：我当时不想答应，只是怕直接拒绝让场面难看。\n\n第二段：后来我婉拒了那次聚会。";

async function draftAndSave(flow: WritingFlow, text = DRAFT) {
	await flow.start("draft", "写一段拒邀的说明，200 字以内");
	await flow.toolSaveDraft(text);
	await flow.onAgentEnd("已保存 drafts/draft-001.md");
}

describe("WritingFlow（mock 模型驱动；mock 验证通过 ≠ 实际模型调用通过 ≠ 写作质量合格）", () => {
	test("起草轮兜底保存：模型没调 save_draft 时从回复保存初稿，再进入检查", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await flow.start("draft", "写一段拒邀的说明");
			await flow.onAgentEnd(DRAFT); // 模型直接回复正文，未调用工具
			expect(await readFile(join(root, "drafts", "draft-001.md"), "utf-8")).toBe(DRAFT);
			expect(flow.stage).toBe("reviewing");
			expect(io.toolSets.at(-1)).toEqual([]); // 检查轮无工具
			expect(io.sent[1]).toContain("语义检查");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("完整闭环：起草 → 检查发现问题 → 局部修改 → 复核通过，版本与检查意见都落盘", async () => {
		const root = await makeTempProject({
			"sources/context.md": "用户当时不想答应，只是怕直接拒绝让场面难看。",
		});
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow);

			const issues = JSON.stringify({
				issues: [
					{
						kind: "over_explanation",
						paragraph: 2,
						quote: "后来我婉拒了那次聚会。",
						reason: "同一意思重复解释",
						suggestion: "删掉第二段",
					},
				],
			});
			await flow.onAgentEnd(issues);
			expect(flow.stage).toBe("revising");
			expect(io.toolSets.at(-1)).toEqual(["read", "revise_paragraph"]);
			expect(io.sent.at(-1)).toContain("修改任务");
			expect(io.sent.at(-1)).toContain("后来我婉拒了那次聚会。");
			expect(await readFile(join(root, "reviews", "review-001.json"), "utf-8")).toContain("over_explanation");

			const edit = await flow.toolApplyParagraphEdit(
				"第一段：我当时不想答应，只是怕直接拒绝让场面难看。",
				"我当时不想答应，只是怕直接拒绝让场面难看。",
			);
			expect(edit.ok).toBe(true);
			const del = await flow.toolApplyParagraphEdit("第二段：后来我婉拒了那次聚会。", "");
			expect(del.ok).toBe(true);
			await flow.onAgentEnd("- 合并了重复段落");

			expect(flow.stage).toBe("reviewing");
			expect(flow.round).toBe(1);
			expect(await readFile(join(root, "drafts", "draft-002.md"), "utf-8")).toContain("我当时不想答应");
			expect(await readFile(join(root, "drafts", "draft-002.md"), "utf-8")).not.toContain("后来我婉拒了那次聚会。");

			await flow.onAgentEnd('{"issues": []}');
			expect(flow.stage).toBe("idle");
			expect(io.summaries.at(-1)).toContain("未发现问题");
			expect(io.summaries.at(-1)).toContain("drafts/draft-002.md");
			// 每轮检查意见都有文件
			expect(await readFile(join(root, "reviews", "review-002.json"), "utf-8")).toContain('"issues": []');
			const state = await readState(root);
			expect(state.currentDraft).toBe("drafts/draft-002.md");
			expect(state.draftCount).toBe(2);
			expect(state.reviewCount).toBe(2);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("无问题时保留原稿，不进入修改轮", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow);
			await flow.onAgentEnd('{"issues": []}');
			expect(flow.stage).toBe("idle");
			expect(io.summaries.join("\n")).toContain("保留原稿");
			expect(await readdir(join(root, "drafts"))).toEqual(["draft-001.md"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("两轮修改上限：第三轮检查发现问题也不再修改，明确收尾", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow);
			const issue = (n: number, quote: string) =>
				JSON.stringify({
					issues: [{ kind: "other", paragraph: 1, quote, reason: `问题${n}`, suggestion: "改" }],
				});
			// 第 1 轮（quote 必须逐字存在于当轮文稿：draft-001 含「我当时不想答应」）
			await flow.onAgentEnd(issue(1, "我当时不想答应"));
			await flow.toolApplyParagraphEdit("我当时不想答应", "我不想答应");
			await flow.onAgentEnd("- 改了一处");
			// 第 2 轮（draft-002 已不含「我当时不想答应」，但含「不想答应」）
			await flow.onAgentEnd(issue(2, "不想答应"));
			await flow.toolApplyParagraphEdit("不想答应", "没答应");
			await flow.onAgentEnd("- 又改了一处");
			// 第 3 轮检查：达到上限（draft-003 已不含「不想答应」，但含替换后的「没答应」）
			await flow.onAgentEnd(issue(3, "没答应"));
			expect(flow.round).toBe(MAX_REVISION_ROUNDS);
			expect(flow.stage).toBe("idle");
			expect(io.summaries.at(-1)).toContain("已达 2 轮修改上限");
			expect(io.sent.filter((s) => s.includes("修改任务"))).toHaveLength(2); // 只有两轮修改指令
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("无效检查 JSON：允许一次格式纠正，再次失败保留文稿并报告", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow);

			await flow.onAgentEnd("这篇文稿写得挺好的，我觉得没有问题。");
			expect(flow.stage).toBe("reviewing"); // 第一次失败：等待纠正
			expect(io.sent.at(-1)).toContain("格式");

			await flow.onAgentEnd("还是自然语言：没什么大问题。");
			expect(flow.stage).toBe("idle");
			expect(io.summaries.join("\n")).toContain("两次无法解析");
			// 文稿保留，未产生新版本
			expect(await readdir(join(root, "drafts"))).toEqual(["draft-001.md"]);
			// 原始输出与线索已存档
			const reviewRaw = await readFile(join(root, "reviews", "review-001.json"), "utf-8");
			expect(reviewRaw).toContain("rawModelOutput");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("锁定原句被破坏时，程序检查线索进入复查指令（kind=locked_violation）", async () => {
		const root = await makeTempProject({
			"locked.md": "- 我当时不想答应，只是怕直接拒绝让场面难看。\n",
		});
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow, "改写后的版本：我当时拒绝了，因为不想让场面尴尬。");
			expect(io.sent[1]).toContain("locked_violation");
			expect(io.sent[1]).toContain("我当时不想答应，只是怕直接拒绝让场面难看");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("revise_paragraph 校验：original 不存在报错，多处匹配报错，唯一匹配才替换", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			// 稿子中「我当时不想答应」出现两次，用于多处匹配测试
			const duplicated = "第一段：我当时不想答应。\n\n第二段：我当时不想答应，只是怕直接拒绝让场面难看。";
			await flow.start("draft", "写一段拒邀的说明");
			await flow.toolSaveDraft(duplicated);
			await flow.onAgentEnd("已保存 drafts/draft-001.md");
			await flow.onAgentEnd(
				JSON.stringify({
					issues: [
						{
							kind: "over_explanation",
							paragraph: 2,
							quote: "我当时不想答应，只是怕直接拒绝让场面难看。",
							reason: "r",
							suggestion: "s",
						},
					],
				}),
			);
			const missing = await flow.toolApplyParagraphEdit("这句根本不在文稿里。", "x");
			expect(missing.ok).toBe(false);
			expect(missing.message).toContain("找不到");

			const dup = await flow.toolApplyParagraphEdit("我当时不想答应", "y");
			expect(dup.ok).toBe(false);
			expect(dup.message).toContain("2 次");

			const okEdit = await flow.toolApplyParagraphEdit(
				"我当时不想答应，只是怕直接拒绝让场面难看。",
				"我当时不想答应，只是怕场面难看。",
			);
			expect(okEdit.ok).toBe(true);
			// 无效引用不会驱动修改：快照只有成功替换生效
			await flow.onAgentEnd("- 完成");
			expect(await readFile(join(root, "drafts", "draft-002.md"), "utf-8")).toContain("只是怕场面难看。");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("修改轮没有产生任何修改时，保留原稿并明确收尾", async () => {
		const root = await makeTempProject();
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await draftAndSave(flow);
			await flow.onAgentEnd(
				JSON.stringify({
					issues: [
						{
							kind: "over_explanation",
							paragraph: 2,
							quote: "后来我婉拒了那次聚会。",
							reason: "r",
							suggestion: "s",
						},
					],
				}),
			);
			await flow.onAgentEnd("检查意见不合理，我没有做修改。");
			expect(flow.stage).toBe("idle");
			expect(io.summaries.join("\n")).toContain("没有产生任何修改");
			expect(await readdir(join(root, "drafts"))).toEqual(["draft-001.md"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("/revise 无可修改文稿时报错不启动；提供 sources/ 路径时先导入为基线版本", async () => {
		const root = await makeTempProject({
			"sources/original.md": "一段个人表达原文。",
		});
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			const noDraft = await flow.start("revise", "改一下");
			expect(noDraft).toBe(false);
			expect(io.notifications.at(-1)?.type).toBe("error");

			const started = await flow.start("revise", "保留我的立场，删掉客套", { baseDraftPath: "sources/original.md" });
			expect(started).toBe(true);
			expect(await readFile(join(root, "drafts", "draft-001.md"), "utf-8")).toBe("一段个人表达原文。");
			expect(io.sent[0]).toContain("保留我的立场");
			expect(io.sent[0]).toContain("一段个人表达原文。");
			await flow.abort();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("voice 模式：指令包含文风样本全文", async () => {
		const root = await makeTempProject({
			"voice/style.md": "我喜欢短句。主语常常省略。",
		});
		try {
			const io = makeIO();
			const flow = new WritingFlow(root, io);
			await flow.start("draft", "写一段下班路上买到最后一份糖炒栗子的开心", { voice: "sample" });
			expect(io.sent[0]).toContain("文风样本");
			expect(io.sent[0]).toContain("我喜欢短句。主语常常省略。");
			await flow.abort();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
