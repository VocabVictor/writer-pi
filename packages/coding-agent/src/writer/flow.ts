/**
 * Writing flow state machine (写作流程的代码保证)。
 *
 *   起草/修改起始轮 → 程序检查 → 语义检查(模型, 只输出JSON) → 局部修改轮 → 复核 → …
 *
 * 保证（不依赖提示词）：
 * - 初稿先落盘再进入检查（模型没调 save_draft 时从回复兜底保存）。
 * - 每个版本与每次检查意见都作为文件保存，版本从不覆盖。
 * - 默认最多两轮局部修改，之后无条件收尾（退出条件：无有效问题 / 达到轮数上限 /
 *   检查输出两次无法解析 / 用户中止）。
 * - 修改轮只允许 revise_paragraph 工具，段落替换校验当前版本原文。
 * - 修改后重新执行锁定原句等程序检查并复核。
 *
 * IO 通过 FlowIO 注入，便于用 mock 模型驱动做自动化测试。
 */

import { formatProgramSummary } from "./checker.ts";
import { applyParagraphEdit } from "./edit.ts";
import { getGenreOrFallback } from "./genres/index.ts";
import { renderGenreRules } from "./instructions.ts";
import { LongFormFlow } from "./longflow.ts";
import { ensureProject, readState, updateState } from "./project.ts";
import { buildFormatRetryInstruction, buildReviseRoundInstruction, stripFences } from "./prompts.ts";
import { persistReviewFile, prepareReviewRound, readSourceTexts } from "./review.ts";
import { prepareFlowStart } from "./start.ts";
import type { FlowIO, StartOptions, WriterOperation, WriterStage } from "./types.ts";
import { validateReview } from "./validate.ts";
import { readDraft, saveDraft, setStage } from "./versions.ts";

export const MAX_REVISION_ROUNDS = 2;
const MIN_FALLBACK_DRAFT_CHARS = 30;

export class WritingFlow {
	readonly root: string;
	stage: WriterStage = "idle";
	operation: WriterOperation | null = null;
	genreId: string | null = null;
	mode: WriterOperation | null = null;
	request: string | null = null;
	round = 0;
	formatRetried = false;
	revisionRoundsUsed = 0;
	currentDraftPath: string | null = null;
	/** Sectioned (long-form) machine; set when a run routes into the 分节 pipeline. */
	longForm: LongFormFlow | null = null;
	private io: FlowIO;
	private startOptions: StartOptions | null = null;
	private roundStartDraftCount = 0;
	private revisionSnapshot: string | null = null;
	private snapshotDirty = false;
	private roundSummaries: string[] = [];

	constructor(root: string, io: FlowIO) {
		this.root = root;
		this.io = io;
	}

	get isActive(): boolean {
		return this.stage !== "idle";
	}

	// =========================================================================
	// Starting a flow
	// =========================================================================

	async start(operation: WriterOperation, request: string, options?: StartOptions): Promise<boolean> {
		if (this.isActive) {
			this.io.notify("已有一个写作流程在进行中。先等待它结束，或中止当前流程。", "warning");
			return false;
		}
		const trimmed = request.trim();
		if (!trimmed) {
			this.io.notify(
				"用法：/draft <要求>、/continue <要求>、/outline <要求>、/revise [文稿路径] <要求>；可用 --genre=<体裁> 与 --voice=<文风|sample> 指定维度。",
				"warning",
			);
			return false;
		}
		this.operation = operation;
		this.mode = operation;
		this.request = trimmed;
		this.startOptions = options ?? null;
		this.round = 0;
		this.formatRetried = false;
		this.revisionRoundsUsed = 0;
		this.roundSummaries = [];
		this.revisionSnapshot = null;
		this.snapshotDirty = false;
		this.longForm = null;

		const prep = await prepareFlowStart(
			this.root,
			operation,
			trimmed,
			{
				baseDraftPath: options?.baseDraftPath,
				genre: options?.genre,
				voice: options?.voice,
				long: options?.long,
				format: options?.format,
			},
			(message, type) => this.io.notify(message, type),
		);
		if (!prep) {
			this.io.notify(
				"没有可修改的文稿：项目里还没有任何版本。先用 /draft 起草，或把稿件放进 drafts/ 或 sources/ 后用 /revise <文件路径> <要求>。",
				"error",
			);
			this.stage = "idle";
			this.mode = null;
			return false;
		}
		if (prep.draftPath) this.currentDraftPath = prep.draftPath;
		this.genreId = prep.genre.id;
		if (prep.longForm) {
			// 长文：提纲轮先发（sections/ 的状态机接手后续轮次）；工作区文件重置。
			this.longForm = new LongFormFlow(this.root, this.io, this.genreId, trimmed);
			this.stage = "outlining";
			await this.longForm.begin(prep.instruction);
			await this.persistStage();
			return true;
		}
		this.stage = "drafting";
		this.io.setActiveTools(prep.toolset);
		this.io.sendUserMessage(prep.instruction);
		await this.persistStage();
		return true;
	}

	// =========================================================================
	// Tool hooks (called from the core writing tools)
	// =========================================================================

	async toolSaveDraft(content: string, note?: string): Promise<{ path: string; version: number }> {
		// A direct print-mode prompt can hit this tool without ever running /draft, so the scaffold may not exist yet.
		await ensureProject(this.root);
		const saved = await saveDraft(this.root, stripFences(content), note);
		this.currentDraftPath = saved.path;
		return { path: saved.path, version: saved.version };
	}

	async toolApplyParagraphEdit(
		original: string,
		replacement: string,
	): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
		if (this.stage !== "revising" || this.revisionSnapshot === null) {
			return { ok: false, message: "revise_paragraph 只能在修改轮使用（当前没有打开的修改快照）" };
		}
		const result = applyParagraphEdit(this.revisionSnapshot, original, replacement);
		if (!result.ok) return { ok: false, message: result.message };
		this.revisionSnapshot = result.snapshot;
		this.snapshotDirty = true;
		return { ok: true, message: result.message };
	}

	// =========================================================================
	// Stage transitions
	// =========================================================================

	async onAgentEnd(assistantText: string | undefined, meta?: { aborted?: boolean }): Promise<void> {
		if (this.stage === "outlining" || this.stage === "sectioning") {
			await this.finishLongFormRound(assistantText, meta?.aborted === true);
		} else if (this.stage === "drafting") await this.finishDraftingRound(assistantText);
		else if (this.stage === "reviewing") await this.finishReviewingRound(assistantText);
		else if (this.stage === "revising") await this.finishRevisingRound(assistantText);
	}

	/** 恢复中断的分节流程；返回 false 表示没有可恢复的状态。 */
	async resume(): Promise<boolean> {
		if (this.isActive) return false;
		const state = await readState(this.root);
		if (state.stage !== "outlining" && state.stage !== "sectioning") return false;
		const lf = new LongFormFlow(this.root, this.io, state.genre, state.lastRequest);
		const outcome = await lf.resume(state);
		if (outcome === null || outcome.kind === "failed") {
			await setStage(this.root, "idle");
			this.io.notify("分节流程状态不完整，无法恢复；已重置为空闲。", "warning");
			return false;
		}
		this.longForm = lf;
		this.operation = state.mode;
		this.mode = state.mode;
		this.request = state.lastRequest;
		this.genreId = state.genre;
		if (outcome.kind === "assembled") {
			this.currentDraftPath = outcome.draftPath;
			this.stage = "reviewing";
			await this.beginReviewRound();
			return true;
		}
		this.stage = lf.stage;
		await this.persistStage();
		return true;
	}

	private async finishLongFormRound(assistantText: string | undefined, aborted: boolean): Promise<void> {
		const lf = this.longForm;
		if (!lf) {
			await this.finish("内部错误：分节状态丢失。");
			return;
		}
		const outcome = await lf.onAgentEnd(assistantText, aborted);
		if (outcome.kind === "assembled") {
			this.currentDraftPath = outcome.draftPath;
			await this.beginReviewRound();
			return;
		}
		if (outcome.kind === "failed") {
			await this.finish(outcome.summary);
			return;
		}
		if (outcome.kind === "fallback") {
			// 提纲两次无法结构化：退回单轮全文流程（沿用现有起草→检查闭环）。
			this.longForm = null;
			this.io.notify("提纲两次无法解析，退回单轮全文产出", "warning");
			const prep = await prepareFlowStart(
				this.root,
				this.operation ?? "draft",
				this.request ?? "",
				{ ...(this.startOptions ?? {}), long: false },
				(message, type) => this.io.notify(message, type),
			);
			if (!prep) {
				await this.finish("退回单轮流程失败：无法重建起草指令。");
				return;
			}
			this.stage = "drafting";
			this.io.setActiveTools(prep.toolset);
			this.io.sendUserMessage(prep.instruction);
			await this.persistStage();
			return;
		}
		// continue：下一轮指令已发出，流程阶段跟随分节状态机
		this.stage = lf.stage;
		await this.persistStage();
	}

	private async finishDraftingRound(assistantText: string | undefined): Promise<void> {
		const state = await readState(this.root);
		const savedThisRound = state.draftCount > this.roundStartDraftCount;
		if (!savedThisRound || !this.currentDraftPath) {
			const fallback = assistantText ? stripFences(assistantText) : "";
			if (fallback.length >= MIN_FALLBACK_DRAFT_CHARS) {
				const saved = await saveDraft(this.root, fallback, "fallback: 模型未调用 save_draft，已从回复中保存初稿");
				this.currentDraftPath = saved.path;
				this.io.notify(`模型未调用保存工具，已将其回复保存为 ${saved.path}`, "warning");
			} else {
				this.io.notify("起草轮没有产出可保存的文稿（模型未保存且回复过短）。流程结束，未生成新版本。", "error");
				await this.finish("起草失败：没有产出文稿。");
				return;
			}
		}
		await this.beginReviewRound();
	}

	private async beginReviewRound(): Promise<void> {
		if (!this.currentDraftPath) {
			await this.finish("内部错误：没有当前文稿。");
			return;
		}
		const genre = getGenreOrFallback(this.genreId);
		// 长文的检查轮可以直出段落替换（消灭修改轮）；短文保持修改轮闭环。
		const prep = await prepareReviewRound(this.root, this.currentDraftPath, this.round + 1, genre, {
			directEdits: this.longForm !== null,
		});
		this.stage = "reviewing";
		this.io.setActiveTools([]);
		this.io.sendUserMessage(prep.instruction);
		await this.persistStage();
	}

	private async finishReviewingRound(assistantText: string | undefined): Promise<void> {
		if (!this.currentDraftPath) {
			await this.finish("内部错误：没有当前文稿。");
			return;
		}
		const draftPath = this.currentDraftPath;
		const draftText = (await readDraft(this.root, draftPath)) ?? "";
		const genre = getGenreOrFallback(this.genreId);
		const prep = await prepareReviewRound(this.root, draftPath, this.round + 1, genre);
		const validation = validateReview(assistantText ?? "", draftText, {
			sourceTexts: await readSourceTexts(this.root),
		});

		if (!validation.ok) {
			if (!this.formatRetried) {
				this.formatRetried = true;
				this.io.notify("检查输出格式无效，允许一次格式纠正重试", "warning");
				this.io.sendUserMessage(buildFormatRetryInstruction(validation.errors));
				return;
			}
			const review = await persistReviewFile(this.root, {
				round: this.round + 1,
				draftPath,
				programChecks: prep.programChecks,
				issues: [],
				validationWarnings: validation.errors,
				rawModelOutput: (assistantText ?? "").slice(0, 8000),
			});
			await this.finish(
				`模型检查输出两次无法解析，已保留当前文稿 \`${draftPath}\`，程序检查线索与原始输出存于 \`${review}\`。\n\n${formatProgramSummary(prep.programChecks)}`,
			);
			return;
		}

		const review = await persistReviewFile(this.root, {
			round: this.round + 1,
			draftPath,
			programChecks: prep.programChecks,
			issues: validation.issues,
			validationWarnings: validation.warnings,
		});

		if (validation.issues.length === 0) {
			await this.finish(
				`第 ${this.round + 1} 轮检查未发现问题，保留原稿 \`${draftPath}\`。\n\n${formatProgramSummary(prep.programChecks)}\n检查意见：\`${review}\``,
			);
			return;
		}
		if (this.round >= MAX_REVISION_ROUNDS) {
			await this.finish(
				`已达 ${MAX_REVISION_ROUNDS} 轮修改上限，保留当前文稿 \`${draftPath}\`。\n\n${formatProgramSummary(prep.programChecks)}\n本轮检查意见：\`${review}\``,
			);
			return;
		}
		const applied = this.applyDirectEdits(draftText, validation.edits ?? []);
		if (applied > 0) {
			const saved = await saveDraft(this.root, this.revisionSnapshot ?? "", `第 ${this.round + 1} 轮检查直改`);
			this.currentDraftPath = saved.path;
			this.revisionSnapshot = null;
			this.snapshotDirty = false;
			this.round += 1;
			this.revisionRoundsUsed = this.round;
			this.io.notify(`第 ${this.round} 轮检查意见已直接应用 ${applied} 处，保存为 ${saved.path}`);
			await this.beginReviewRound();
			return;
		}
		this.revisionSnapshot = draftText;
		this.snapshotDirty = false;
		this.stage = "revising";
		this.io.setActiveTools(["read", "revise_paragraph", ...genre.tools]);
		this.io.sendUserMessage(
			buildReviseRoundInstruction({
				draftPath,
				draftText,
				issues: validation.issues,
				reviewPath: review,
				round: this.round + 1,
				genreRules: renderGenreRules(genre),
			}),
		);
		await this.persistStage();
	}

	/** B1：检查轮直出的段落替换应用到快照；返回成功应用数（无效替换逐条丢弃）。 */
	private applyDirectEdits(draftText: string, edits: { original: string; replacement: string }[]): number {
		let applied = 0;
		let snapshot = draftText;
		for (const edit of edits) {
			const result = applyParagraphEdit(snapshot, edit.original, edit.replacement);
			if (!result.ok) continue;
			snapshot = result.snapshot;
			applied += 1;
		}
		if (applied > 0) {
			this.revisionSnapshot = snapshot;
			this.snapshotDirty = true;
		}
		return applied;
	}

	private async finishRevisingRound(assistantText: string | undefined): Promise<void> {
		if (assistantText && assistantText.trim().length > 0) {
			this.roundSummaries.push(assistantText.trim().slice(0, 2000));
		}
		if (!this.snapshotDirty || this.revisionSnapshot === null) {
			await this.finish(
				`模型在第 ${this.round + 1} 轮没有产生任何修改，保留当前文稿 \`${this.currentDraftPath}\`。检查意见已保存，可自行查看后再用 /revise 处理。`,
			);
			return;
		}
		const saved = await saveDraft(this.root, this.revisionSnapshot, `第 ${this.round + 1} 轮修改`);
		this.currentDraftPath = saved.path;
		this.revisionSnapshot = null;
		this.snapshotDirty = false;
		this.round += 1;
		this.revisionRoundsUsed = this.round;
		this.io.notify(`第 ${this.round} 轮修改已保存为 ${saved.path}`);
		await this.beginReviewRound();
	}

	// =========================================================================
	// Wrap-up
	// =========================================================================

	async abort(): Promise<void> {
		if (!this.isActive) return;
		this.stage = "idle";
		this.longForm = null;
		this.revisionSnapshot = null;
		this.snapshotDirty = false;
		await this.persistStage();
		this.io.summary("写作流程已中止。已保存的版本仍保留在 drafts/ 中，可随时用 /drafts 查看。");
	}

	private async finish(summaryText: string): Promise<void> {
		this.stage = "idle";
		this.longForm = null;
		this.revisionSnapshot = null;
		this.snapshotDirty = false;
		await this.persistStage();
		const extras: string[] = [];
		if (this.roundSummaries.length > 0) {
			extras.push(`**修改摘要**\n${this.roundSummaries.map((s) => `- ${s.replace(/\n+/g, " ")}`).join("\n")}`);
		}
		extras.push(
			`当前版本：\`${this.currentDraftPath ?? "无"}\`。用 /drafts 列出全部版本，/diff 对比，/revert <版本> 回退。`,
		);
		this.io.summary([summaryText, ...extras].join("\n\n"));
	}

	private async persistStage(): Promise<void> {
		// 整个读-改-写在状态锁内完成：锁外二次写会用旧快照覆盖并发保存的 draftCount/reviewCount。
		await updateState(this.root, (state) => {
			state.stage = this.stage;
			state.mode = this.mode ?? null;
			state.lastRequest = this.request ?? null;
			state.revisionRounds = this.round;
			// 分节进度只在分节流程进行中存在；流程收尾（longForm 置空）时从 state 移除。
			if (this.longForm) state.longForm = this.longForm.progress();
			else delete state.longForm;
		});
	}
}
