/**
 * writer-pi runtime: binds the writing flow to the AgentSession.
 * This is core product wiring — writer-pi always starts in writing mode.
 */

import { MAX_REVISION_ROUNDS, WritingFlow } from "./flow.ts";
import { handleWriterCommand, isWriterCommand, refreshWidget } from "./ops.ts";
import { readState } from "./project.ts";
import type { FlowIO } from "./types.ts";
import { setStage } from "./versions.ts";

export interface WriterUI {
	notify(message: string, type?: "info" | "warning" | "error"): void;
	select?(title: string, options: string[]): Promise<string | undefined>;
	setWidget?(lines: string[] | undefined): void;
}

/** Minimal surface of AgentSession the writing flow needs. */
export interface WriterSession {
	readonly cwd: string;
	isIdle(): boolean;
	setActiveToolsByName(toolNames: string[]): void;
	sendMessage(message: { customType: string; content: string; display: boolean; details?: unknown }): void;
	/**
	 * Deliver a flow message as a turn-triggering custom message. Queued as followUp while
	 * the agent is streaming, run immediately when idle, deferred around settle — so the
	 * whole writing flow chains within one top-level prompt (works in TUI and print modes).
	 */
	sendFlowMessage(text: string): Promise<void>;
}

class WriterRuntime {
	private session: WriterSession | null = null;
	private ui: WriterUI = { notify: (message, type) => console.error(`[writer${type ? `:${type}` : ""}] ${message}`) };
	private flow: WritingFlow | null = null;
	/** In-flight flow turns (each resolves when its agent run settles). */
	private pending: Promise<void>[] = [];
	private io: FlowIO;

	constructor() {
		this.io = {
			sendUserMessage: (text) => {
				if (!this.session) throw new Error("writer: session not attached");
				this.track(this.session.sendFlowMessage(text));
			},
			setActiveTools: (names) => this.session?.setActiveToolsByName(names),
			notify: (message, type) => this.ui.notify(message, type ?? "info"),
			summary: (markdown) =>
				this.session?.sendMessage({ customType: "writer_summary", content: markdown, display: true }),
		};
	}

	/** Attach the active AgentSession (called from the AgentSession constructor). */
	attachSession(session: WriterSession): void {
		this.session = session;
		this.flow = null;
	}

	/** Replace the UI adapter (interactive mode injects notify/select/widget). */
	setUI(ui: WriterUI): void {
		this.ui = ui;
	}

	flowFor(cwd: string): WritingFlow {
		if (!this.flow || this.flow.root !== cwd) {
			this.flow = new WritingFlow(cwd, this.io);
		}
		return this.flow;
	}

	get maxRevisionRounds(): number {
		return MAX_REVISION_ROUNDS;
	}

	/** Handle an input line that starts with "/". Returns true if a writing command ran. */
	async handleCommand(text: string): Promise<boolean> {
		if (!isWriterCommand(text)) return false;
		if (!this.session) return false;
		await handleWriterCommand(this.session, this.ui, this.flowFor(this.session.cwd), text);
		// Flow commands (draft/revise/voice) chain further turns via agent_end; wait for the
		// whole writing flow to settle so single-shot modes (print/json) see it complete.
		await this.waitForFlow();
		return true;
	}

	private async waitForFlow(): Promise<void> {
		while (this.pending.length > 0) {
			const batch = [...this.pending];
			await Promise.all(batch);
		}
	}

	/** Called from AgentSession when an agent run ends. */
	async handleAgentEnd(messages: { role: string; content: unknown }[]): Promise<void> {
		if (!this.flow?.isActive) return;
		const meta = lastAssistantMeta(messages);
		await this.flow.onAgentEnd(meta.text, { aborted: meta.aborted });
		if (this.session) await refreshWidget(this.session, this.ui, this.flow);
	}

	private track(p: Promise<void>): void {
		const entry = p.finally(() => {
			this.pending = this.pending.filter((x) => x !== entry);
		});
		this.pending.push(entry);
	}

	/** Session-level state notice (e.g. leftover stage from an interrupted run). */
	async onSessionStart(): Promise<void> {
		if (!this.session) return;
		const state = await readState(this.session.cwd);
		if (state.stage === "idle") return;
		// 分节（长文）阶段能从 state 恢复：重启后从断点继续，而不是重置。
		if (state.stage === "outlining" || state.stage === "sectioning") {
			const flow = this.flowFor(this.session.cwd);
			if (await flow.resume()) {
				this.ui.notify("检测到未完成的分节写作流程，已从断点继续。", "info");
				await refreshWidget(this.session, this.ui, flow);
				return;
			}
		}
		this.ui.notify(
			`上次写作流程在「${state.stage}」阶段未正常收尾（可能是会话中断）。已保存的版本不受影响；如需继续请重新发起 /draft、/revise 或 /voice。`,
			"warning",
		);
		await setStage(this.session.cwd, "idle");
	}
}

function lastAssistantMeta(messages: { role: string; content: unknown }[]): { text?: string; aborted: boolean } {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m.role !== "assistant") continue;
		const content = m.content;
		if (!Array.isArray(content)) continue;
		return {
			text: content
				.filter((c): c is { type: "text"; text: string } => (c as { type: string }).type === "text")
				.map((c) => (c as { text: string }).text)
				.join("\n"),
			aborted: (m as { stopReason?: string }).stopReason === "aborted",
		};
	}
	return { aborted: false };
}

export const writerRuntime = new WriterRuntime();
