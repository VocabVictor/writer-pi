/**
 * Long-form (分节) state machine: 提纲轮 → 逐节轮 → 组装落盘 → 交给检查环。
 * Each section is one turn, so no single response has to carry the whole article
 * (long single responses hit max_tokens); the assembled manuscript then goes
 * through the normal review/revise loop in flow.ts.
 */

import { parseLengthTarget } from "./checker.ts";
import { formatInstruction } from "./formats.ts";
import { getGenreOrFallback } from "./genres/index.ts";
import { renderGenreRules } from "./instructions.ts";
import {
	assembleSections,
	buildOutlineInstruction,
	buildOutlineRetryInstruction,
	buildSectionInstruction,
	buildSectionRetryInstruction,
	type LengthTarget,
	MIN_SECTION_CHARS,
	outlineLengthGuidance,
	parseOutline,
	previousSectionTail,
	readOutline,
	readSection,
	resetSections,
	type SectionPlan,
	saveOutline,
	saveSection,
	sectionLengthGuidance,
} from "./longform.ts";
import { listTextFiles, parseLockedSentences, readBrief, readProjectFile, readState } from "./project.ts";
import { stripFences } from "./prompts.ts";
import { loadVoiceFiles, resolveVoice } from "./start.ts";
import type { FlowIO, LongFormProgress, WriterState } from "./types.ts";
import { saveDraft } from "./versions.ts";

export type LongFormOutcome =
	| { kind: "continue" }
	| { kind: "assembled"; draftPath: string }
	| { kind: "failed"; summary: string }
	| { kind: "fallback" };

/** Toolset for outline/section turns: reading only — the model must not write into drafts/. */
function sectionToolset(genreId: string | null): string[] {
	const genre = getGenreOrFallback(genreId);
	return ["read", ...(genre.tools.includes("update_context") ? ["update_context"] : [])];
}

interface TurnContext {
	request: string;
	briefText: string | null;
	lockedSentences: string[];
	sourceFiles: { path: string; name: string }[];
	genreRules: string;
	target: LengthTarget | null;
	outlineText: string | null;
	voiceDescription: string | null;
	voiceFiles: { path: string; name: string; content: string }[];
	toolset: string[];
	formatText: string | null;
}

export class LongFormFlow {
	stage: "outlining" | "sectioning" = "outlining";
	sectionCount = 0;
	sectionIndex = 0;
	private readonly root: string;
	private readonly io: FlowIO;
	private readonly genreId: string | null;
	private readonly request: string | null;
	private outlineRetried = false;
	private sectionRetried = false;
	private plans: SectionPlan[] = [];

	constructor(root: string, io: FlowIO, genreId: string | null, request: string | null) {
		this.root = root;
		this.io = io;
		this.genreId = genreId;
		this.request = request;
	}

	/** 分节进度（写入 state.json）。 */
	progress(): LongFormProgress {
		return { sectionCount: this.sectionCount, sectionIndex: this.sectionIndex };
	}

	/** Kick off the outline turn (WritingFlow.start 长文分支). Resets stale scratch files. */
	async begin(instruction: string): Promise<void> {
		this.stage = "outlining";
		await resetSections(this.root);
		this.io.setActiveTools(sectionToolset(this.genreId));
		this.io.sendUserMessage(instruction);
	}

	/** Rebuild the outline turn (resume 的提纲缺失分支). */
	async start(): Promise<void> {
		this.stage = "outlining";
		const ctx = await this.turnContext();
		this.io.setActiveTools(ctx.toolset);
		this.io.sendUserMessage(
			buildOutlineInstruction({
				request: ctx.request,
				briefText: ctx.briefText,
				lockedSentences: ctx.lockedSentences,
				sourceFiles: ctx.sourceFiles,
				genreRules: ctx.genreRules,
				lengthGuidance: outlineLengthGuidance(ctx.target),
			}),
		);
	}

	/** Advance the machine by one finished turn. */
	async onAgentEnd(assistantText: string | undefined, aborted: boolean): Promise<LongFormOutcome> {
		if (this.stage === "outlining") return this.finishOutline(assistantText, aborted);
		return this.finishSection(assistantText, aborted);
	}

	/** Resume from persisted state; null when the state is incomplete and cannot be resumed. */
	async resume(state: WriterState): Promise<LongFormOutcome | null> {
		if (!state.longForm) return null;
		if (state.stage === "outlining") {
			await this.start();
			return { kind: "continue" };
		}
		const outline = await readOutline(this.root);
		const plans = outline ? parseOutline(outline) : [];
		if (plans.length < 2) {
			await this.start();
			return { kind: "continue" };
		}
		this.plans = plans;
		this.sectionCount = plans.length;
		let index = 1;
		while (index <= this.sectionCount && (await readSection(this.root, index)) !== null) index += 1;
		if (index > this.sectionCount) {
			// 全部小节已在盘上（中断发生在最后一节与组装之间）：直接组装。
			return this.assemble();
		}
		this.sectionIndex = index;
		this.stage = "sectioning";
		await this.sendSectionTurn();
		return { kind: "continue" };
	}

	private async finishOutline(assistantText: string | undefined, aborted: boolean): Promise<LongFormOutcome> {
		if (aborted) return this.abortedSummary();
		const text = stripFences(assistantText ?? "");
		const plans = parseOutline(text);
		if (plans.length < 2) {
			if (!this.outlineRetried) {
				this.outlineRetried = true;
				this.io.notify("提纲没有解析出多个小节，允许一次重试", "warning");
				this.io.sendUserMessage(buildOutlineRetryInstruction(plans.length));
				return { kind: "continue" };
			}
			return { kind: "fallback" };
		}
		await saveOutline(this.root, text);
		this.plans = plans;
		this.sectionCount = plans.length;
		this.sectionIndex = 1;
		await this.sendSectionTurn();
		return { kind: "continue" };
	}

	private async finishSection(assistantText: string | undefined, aborted: boolean): Promise<LongFormOutcome> {
		if (aborted) return this.abortedSummary();
		const text = stripFences(assistantText ?? "");
		if (text.length < MIN_SECTION_CHARS) {
			if (!this.sectionRetried) {
				this.sectionRetried = true;
				this.io.notify("该节回复过短，允许一次重试", "warning");
				this.io.sendUserMessage(buildSectionRetryInstruction(this.sectionIndex, this.sectionCount));
				return { kind: "continue" };
			}
			return {
				kind: "failed",
				summary: `第 ${this.sectionIndex} 节两次都没有产出可用的正文，流程结束。已写好的 ${this.sectionIndex - 1}/${this.sectionCount} 节保留在 sections/ 中。`,
			};
		}
		this.sectionRetried = false;
		await saveSection(this.root, this.sectionIndex, text);
		if (this.sectionIndex >= this.sectionCount) return this.assemble();
		this.sectionIndex += 1;
		await this.sendSectionTurn();
		return { kind: "continue" };
	}

	private async assemble(): Promise<LongFormOutcome> {
		const assembled = await assembleSections(this.root, this.sectionCount);
		if (assembled === null) {
			return { kind: "failed", summary: "组装失败：sections/ 下没有可用的小节文件。" };
		}
		const saved = await saveDraft(this.root, assembled, "分节组装");
		this.io.notify(`全篇 ${this.sectionCount} 节已组装为 ${saved.path}`);
		return { kind: "assembled", draftPath: saved.path };
	}

	private abortedSummary(): LongFormOutcome {
		const wrote = this.sectionCount > 0 ? `${this.sectionIndex - 1}/${this.sectionCount} 节` : "提纲";
		return {
			kind: "failed",
			summary: `分节写作流程已中止。已写好的${wrote}保留在 sections/ 中，可用 /drafts 查看已保存版本。`,
		};
	}

	private async sendSectionTurn(): Promise<void> {
		this.stage = "sectioning";
		const ctx = await this.turnContext();
		const plan = this.planAt(this.sectionIndex);
		const previous = this.sectionIndex > 1 ? await readSection(this.root, this.sectionIndex - 1) : null;
		this.io.setActiveTools(ctx.toolset);
		this.io.sendUserMessage(
			buildSectionInstruction({
				request: ctx.request,
				briefText: ctx.briefText,
				lockedSentences: ctx.lockedSentences,
				sourceFiles: ctx.sourceFiles,
				genreRules: ctx.genreRules,
				outlineText: ctx.outlineText ?? "",
				title: plan.title,
				points: plan.points,
				index: this.sectionIndex,
				count: this.sectionCount,
				previousTail: previousSectionTail(previous),
				lengthGuidance: sectionLengthGuidance(ctx.target, this.sectionCount),
				voiceDescription: ctx.voiceDescription,
				voiceFiles: ctx.voiceFiles,
				formatInstruction: ctx.formatText,
			}),
		);
	}

	private planAt(index: number): SectionPlan {
		return this.plans[index - 1] ?? { title: `第 ${index} 节`, points: [] };
	}

	private async turnContext(): Promise<TurnContext> {
		const briefText = await readBrief(this.root);
		const state = await readState(this.root);
		const voiceSetting = state.voice;
		return {
			request: this.request ?? "",
			briefText,
			lockedSentences: parseLockedSentences((await readProjectFile(this.root, "locked.md")) ?? ""),
			sourceFiles: await listTextFiles(this.root, "sources"),
			genreRules: renderGenreRules(getGenreOrFallback(this.genreId)),
			target: briefText ? parseLengthTarget(briefText) : null,
			outlineText: await readOutline(this.root),
			voiceDescription: resolveVoice(voiceSetting),
			voiceFiles: voiceSetting === "sample" ? await loadVoiceFiles(this.root) : [],
			toolset: sectionToolset(this.genreId),
			formatText: formatInstruction(state.format),
		};
	}
}
