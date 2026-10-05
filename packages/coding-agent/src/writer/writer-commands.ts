/**
 * writer-pi slash commands: 操作命令 /draft /continue /outline /revise /voice 与
 * 维度参数（--genre=<体裁>、--voice=<文风|sample>）。项目状态命令（/writing /drafts
 * /diff /revert /genre）在 project-commands.ts。分发入口在 AgentSession.prompt。
 */

import { MAX_REVISION_ROUNDS, WritingFlow } from "./flow.ts";
import { readState, readBrief } from "./project.ts";
import type { WriterUI, WriterSession } from "./runtime.ts";
import type { StartOptions, WriterOperation } from "./types.ts";
import { describeSelection, inferGenre } from "./genres/index.ts";
import { projectCommands, isProjectCommand } from "./project-commands.ts";

const OPERATION_COMMANDS = new Set(["draft", "continue", "outline", "revise", "voice"]);

export function isWriterCommand(text: string): boolean {
	if (!text.startsWith("/")) return false;
	const name = text.slice(1).split(/\s/, 1)[0];
	return OPERATION_COMMANDS.has(name) || isProjectCommand(name);
}

export async function handleWriterCommand(session: WriterSession, ui: WriterUI, flow: WritingFlow, text: string): Promise<void> {
	const space = text.indexOf(" ");
	const name = space === -1 ? text.slice(1) : text.slice(1, space);
	const args = space === -1 ? "" : text.slice(space + 1).trim();

	if (isProjectCommand(name)) {
		await projectCommands(session, ui, flow)[name]?.(args);
		await refreshWidget(session, ui, flow);
		return;
	}
	if (!OPERATION_COMMANDS.has(name)) return;

	const operation: WriterOperation = name === "voice" ? "draft" : (name as WriterOperation);
	const { dimensions, request } = parseDimensionArgs(args, name);

	// --- genre resolution at the command layer (so ambiguity can ask the user)
	const briefText = await readBrief(session.cwd);
	const inference = inferGenre({
		explicit: dimensions.genre ?? null,
		briefText,
		hintText: request,
		previous: (await readState(session.cwd)).genre,
	});
	if (inference.ambiguous && inference.tied && ui.select) {
		const options = [...inference.tied.slice(0, 3).map((id) => `体裁：${id}`), "用兜底体裁（实用文本）"];
		const choice = await ui.select("材料线索指向多个体裁，用哪个？", options);
		if (choice === undefined) return;
		// Picking the fallback keeps dimensions.genre unset → flow-start falls back.
		if (choice.startsWith("体裁：")) dimensions.genre = choice.slice(3);
	} else {
		dimensions.genre = inference.genre.id;
	}

	const startOptions: StartOptions = { ...dimensions };
	await flow.start(operation, request, startOptions);
	if (flow.isActive && flow.genreId) {
		const { getGenreOrFallback } = await import("./genres/index.ts");
		ui.notify(describeSelection(getGenreOrFallback(flow.genreId), inference.reason, dimensions.voice ?? null, operation));
	}
	await refreshWidget(session, ui, flow);
}

/** Parse "--genre=blog", "--voice=克制", "--voice" (sample) out of the argument line. */
export function parseDimensionArgs(args: string, command?: string): {
	dimensions: StartOptions & { voice?: string | null };
	request: string;
} {
	const dimensions: StartOptions & { voice?: string | null } = {};
	const tokens = args.split(/\s+/);
	const rest: string[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t === "--voice") {
			dimensions.voice = "sample";
			continue;
		}
		if (t.startsWith("--genre=")) {
			dimensions.genre = t.slice(8);
			continue;
		}
		if (t === "--genre" && tokens[i + 1] && !tokens[i + 1].startsWith("-")) {
			dimensions.genre = tokens[++i];
			continue;
		}
		if (t.startsWith("--voice=")) {
			const v = t.slice(8);
			dimensions.voice = v.length > 0 ? v : "sample";
			continue;
		}
		rest.push(t);
	}
	if (command === "voice" && dimensions.voice === undefined) dimensions.voice = "sample";
	return { dimensions, request: rest.join(" ").trim() };
}

export async function refreshWidget(session: WriterSession, ui: WriterUI, flow: WritingFlow): Promise<void> {
	if (!ui.setWidget) return;
	try {
		const state = await readState(session.cwd);
		const lines = [`writer-pi · 体裁 ${state.genre ?? "未定"} · 当前 ${state.currentDraft ?? "无"}`];
		if (flow.isActive) lines.push(`流程进行中：${state.stage}（第 ${flow.round}/${MAX_REVISION_ROUNDS} 轮修改）`);
		ui.setWidget(lines);
	} catch {
		ui.setWidget(["writer-pi"]);
	}
}
