/**
 * writer-pi project-state commands: /writing /drafts /diff /revert /genre.
 * /genre 是维度命令：查看或切换当前体裁（持久化到 state.json）。
 */

import { MAX_REVISION_ROUNDS, type WritingFlow } from "./flow.ts";
import { GENRES, getGenre, getGenreOrFallback } from "./genres/index.ts";
import {
	ensureProject,
	listTextFiles,
	parseLockedSentences,
	readBrief,
	readProjectFile,
	readState,
	updateState,
} from "./project.ts";
import type { WriterSession, WriterUI } from "./runtime.ts";
import { diffDrafts, listDrafts, revertTo } from "./versions.ts";

const PROJECT_COMMANDS = new Set(["writing", "drafts", "diff", "revert", "genre"]);

export function isProjectCommand(name: string): boolean {
	return PROJECT_COMMANDS.has(name);
}

type Handler = (args: string) => Promise<void>;

export function projectCommands(session: WriterSession, ui: WriterUI, flow: WritingFlow): Record<string, Handler> {
	return {
		async writing(): Promise<void> {
			await ensureProject(session.cwd);
			const state = await readState(session.cwd);
			const brief = await readBrief(session.cwd);
			const locked = parseLockedSentences((await readProjectFile(session.cwd, "locked.md")) ?? "");
			const sources = await listTextFiles(session.cwd, "sources");
			const voices = await listTextFiles(session.cwd, "voice");
			const drafts = await listDrafts(session.cwd);
			const genre = getGenreOrFallback(state.genre);
			const lines = [
				"**writer-pi 项目状态**",
				`- 阶段：${state.stage}${flow.isActive ? "（流程进行中）" : ""}`,
				`- 维度：体裁 ${genre.name}（${genre.id}${genre.experimental ? "，实验性" : ""}）· 文风 ${state.voice ?? "未设置"}`,
				`- 当前文稿：${state.currentDraft ?? "无"}（共 ${drafts.length} 版）`,
				`- 素材：sources/ ${sources.length} 个文件；文风样本：voice/ ${voices.length} 个文件`,
				`- 锁定原句：${locked.length} 条；brief.md：${brief ? "存在" : "缺失"}`,
				`- 本次会话已完成修改轮数：${flow.round}/${MAX_REVISION_ROUNDS}`,
			];
			sendSummary(session, lines.join("\n"));
		},

		async drafts(): Promise<void> {
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
		},

		async diff(args): Promise<void> {
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
			sendSummary(session, `\`\`\`diff\n${patch}\n\`\`\``);
		},

		async revert(args): Promise<void> {
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
		},

		async genre(args): Promise<void> {
			const requested = args.trim();
			if (!requested) {
				const lines = ["**可用体裁**（experimental = 实验性配置，未做系统验证）"];
				for (const g of GENRES) {
					const state = await readState(session.cwd);
					const current = state.genre === g.id ? " ← 当前" : "";
					lines.push(
						`- \`${g.id}\` ${g.name}${g.experimental ? "（experimental）" : ""}${current} — ${g.description}`,
					);
				}
				sendSummary(session, lines.join("\n"));
				return;
			}
			const genre = getGenre(requested);
			if (!genre) {
				ui.notify(`未知体裁：${requested}。用 /genre 查看列表。`, "error");
				return;
			}
			await updateState(session.cwd, (s) => {
				s.genre = genre.id;
			});
			ui.notify(
				`当前体裁已设为 ${genre.name}（${genre.id}）。对下一次 /draft /continue /outline /revise 生效。`,
				"info",
			);
		},
	};
}

function parseVersionArg(arg: string): number | null {
	if (!arg) return null;
	const normalized =
		arg
			.trim()
			.replace(/^draft-/i, "")
			.replace(/^0+/, "") || "0";
	if (!/^\d+$/.test(normalized)) return null;
	return Number(normalized);
}

function sendSummary(session: WriterSession, content: string): void {
	session.sendMessage({ customType: "writer_summary", content, display: true });
}
