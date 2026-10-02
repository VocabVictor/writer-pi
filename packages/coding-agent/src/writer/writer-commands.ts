/**
 * writer-pi slash commands: /draft /revise /voice /writing /drafts /diff /revert.
 * Implemented against the session + UI adapters; dispatched from AgentSession.prompt.
 */

import { join, isAbsolute } from "node:path";
import { readFile } from "node:fs/promises";
import { MAX_REVISION_ROUNDS, WritingFlow } from "./flow.ts";
import { ensureProject, readState, readBrief, listTextFiles, readProjectFile, parseLockedSentences } from "./project.ts";
import { listDrafts, diffDrafts, revertTo } from "./versions.ts";
import type { WriterUI, WriterSession } from "./runtime.ts";

const COMMAND_NAMES = new Set(["draft", "revise", "voice", "writing", "drafts", "diff", "revert"]);

export function isWriterCommand(text: string): boolean {
	if (!text.startsWith("/")) return false;
	const name = text.slice(1).split(/\s/, 1)[0];
	return COMMAND_NAMES.has(name);
}

export async function handleWriterCommand(session: WriterSession, ui: WriterUI, flow: WritingFlow, text: string): Promise<void> {
	const space = text.indexOf(" ");
	const name = space === -1 ? text.slice(1) : text.slice(1, space);
	const args = space === -1 ? "" : text.slice(space + 1).trim();
	const cwd = session.cwd;

	switch (name) {
		case "draft": {
			await flow.start("draft", args);
			break;
		}
		case "revise": {
			const parsed = await splitReviseArgs(args, cwd);
			if (parsed.request === undefined) break;
			await flow.start("revise", parsed.request, { baseDraftPath: parsed.baseDraftPath });
			break;
		}
		case "voice": {
			const voiceRevise = await resolveVoiceMode(cwd, ui, args, flow);
			if (voiceRevise === undefined) break;
			await flow.start("voice", args, { voiceRevise });
			break;
		}
		case "writing":
			await showStatus(session, ui, flow);
			break;
		case "drafts":
			await showDrafts(session, ui);
			break;
		case "diff":
			await showDiff(session, ui, args);
			break;
		case "revert":
			await revertCommand(session, ui, args);
			break;
	}
	await refreshWidget(session, ui, flow);
}

export async function refreshWidget(session: WriterSession, ui: WriterUI, flow: WritingFlow): Promise<void> {
	if (!ui.setWidget) return;
	try {
		const state = await readState(session.cwd);
		const drafts = await listDrafts(session.cwd);
		const lines = [`writer-pi · ${drafts.length} 个版本 · 当前 ${state.currentDraft ?? "无"}`];
		if (flow.isActive) lines.push(`流程进行中：${state.stage}（第 ${flow.round}/${MAX_REVISION_ROUNDS} 轮修改）`);
		ui.setWidget(lines);
	} catch {
		ui.setWidget(["writer-pi"]);
	}
}

function parseVersionArg(arg: string): number | null {
	if (!arg) return null;
	const normalized = arg.trim().replace(/^draft-/i, "").replace(/^0+/, "") || "0";
	if (!/^\d+$/.test(normalized)) return null;
	return Number(normalized);
}

async function splitReviseArgs(args: string, cwd: string): Promise<{ baseDraftPath?: string; request?: string }> {
	if (!args) {
		return { request: undefined };
	}
	const firstSpace = args.search(/\s/);
	const first = firstSpace === -1 ? args : args.slice(0, firstSpace);
	const rest = firstSpace === -1 ? "" : args.slice(firstSpace + 1).trim();
	if (first.includes("/") || first.includes("\\") || first.includes(".")) {
		const abs = isAbsolute(first) ? first : join(cwd, first);
		try {
			await readFile(abs, "utf-8");
		} catch {
			if (rest) return { request: rest };
			return { request: undefined };
		}
		const rel = abs.toLowerCase().startsWith(cwd.toLowerCase()) ? abs.slice(cwd.length + 1).replaceAll("\\", "/") : abs;
		return { baseDraftPath: rel, request: rest || undefined };
	}
	return { request: args };
}

async function resolveVoiceMode(cwd: string, ui: WriterUI, _args: string, flow: WritingFlow): Promise<boolean | undefined> {
	const samples = await listTextFiles(cwd, "voice");
	if (samples.length === 0) {
		ui.notify("voice/ 目录为空：请先把文风样本（.md/.txt）放进项目的 voice/ 目录。", "error");
		return undefined;
	}
	const state = await readState(cwd);
	if (!state.currentDraft) return false;
	const reviseOption = `修改当前稿（${state.currentDraft}）`;
	if (!ui.select) return false; // no UI (print mode): default to drafting a new piece
	const choice = await ui.select("/voice：结合文风样本做什么？", ["起草新稿", reviseOption]);
	if (choice === undefined) return undefined;
	return choice === reviseOption;
}

async function showStatus(session: WriterSession, ui: WriterUI, flow: WritingFlow): Promise<void> {
	const c = session.cwd;
	await ensureProject(c);
	const state = await readState(c);
	const brief = await readBrief(c);
	const locked = parseLockedSentences((await readProjectFile(c, "locked.md")) ?? "");
	const sources = await listTextFiles(c, "sources");
	const voices = await listTextFiles(c, "voice");
	const drafts = await listDrafts(c);
	const lines = [
		"**writer-pi 项目状态**",
		`- 阶段：${state.stage}${flow.isActive ? "（流程进行中）" : ""}`,
		`- 当前文稿：${state.currentDraft ?? "无"}`,
		`- 版本数：${drafts.length}（${drafts.map((d) => `draft-${String(d.version).padStart(3, "0")}`).join(", ") || "无"}）`,
		`- 素材：sources/ ${sources.length} 个文件；文风样本：voice/ ${voices.length} 个文件`,
		`- 锁定原句：${locked.length} 条；brief.md：${brief ? "存在" : "缺失"}`,
		`- 本次会话已完成修改轮数：${flow.round}/${MAX_REVISION_ROUNDS}`,
	];
	sendSummary(session, lines.join("\n"));
}

async function showDrafts(session: WriterSession, ui: WriterUI): Promise<void> {
	const drafts = await listDrafts(session.cwd);
	if (drafts.length === 0) {
		ui.notify("drafts/ 下还没有版本。", "info");
		return;
	}
	const lines = ["**草稿版本（从不覆盖，新版本号递增）**"];
	for (const d of drafts) {
		const label = d.note === "current" ? " ← 当前" : "";
		lines.push(`- \`draft-${String(d.version).padStart(3, "0")}.md\`${label}`);
	}
	sendSummary(session, lines.join("\n"));
}

async function showDiff(session: WriterSession, ui: WriterUI, args: string): Promise<void> {
	const parts = args.trim().split(/\s+/).filter(Boolean);
	const parsed = parts.map((p) => parseVersionArg(p)).filter((v): v is number => v !== null);
	if (parts.length > 0 && parsed.length !== parts.length) {
		ui.notify("用法：/diff [from] [to]，版本号如 1、001 或 draft-001。无参数时对比最近两版。", "warning");
		return;
	}
	const patch = await diffDrafts(session.cwd, parsed[0], parsed[1]);
	if (patch === null) {
		ui.notify("没有可对比的版本（至少需要两个版本）。", "warning");
		return;
	}
	sendSummary(session, "```diff\n" + patch + "\n```");
}

async function revertCommand(session: WriterSession, ui: WriterUI, args: string): Promise<void> {
	const version = parseVersionArg(args.trim());
	if (version === null) {
		ui.notify("用法：/revert <版本>，如 /revert 1 或 /revert draft-001。", "warning");
		return;
	}
	const result = await revertTo(session.cwd, version);
	if (!result) {
		ui.notify(`找不到版本 draft-${String(version).padStart(3, "0")}`, "error");
		return;
	}
	ui.notify(`已回退：${result.path}（内容取自历史版本，历史文件均保留）`, "info");
}

function sendSummary(session: WriterSession, content: string): void {
	session.sendMessage({ customType: "writer_summary", content, display: true });
}
