/**
 * Core writing tools: save_draft / revise_paragraph / diff_versions / revert_version.
 * These are first-class tools of writer-pi (not an extension), registered alongside read.
 */

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { getGenreOrFallback } from "../../writer/genres/index.ts";
import { writerRuntime } from "../../writer/runtime.ts";
import { diffDrafts, draftPathFor, revertTo } from "../../writer/versions.ts";
import type { ToolDefinition } from "../extensions/types.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const saveDraftSchema = Type.Object({
	content: Type.String({ description: "完整文稿正文（纯文本，不含代码块围栏与说明文字）" }),
	note: Type.Optional(Type.String({ description: "版本备注，如「初稿」" })),
});

export function createSaveDraftToolDefinition(cwd: string): ToolDefinition<typeof saveDraftSchema> {
	return {
		name: "save_draft",
		label: "保存草稿",
		description:
			"把完整文稿保存为一个新的草稿版本（新文件，从不覆盖旧版本）。保存时只包含文稿正文本身，不要包含说明文字或代码块围栏。",
		promptSnippet: "保存完整文稿为新草稿版本（drafts/draft-NNN.md，从不覆盖）",
		promptGuidelines: ["起草或整体改写后，必须调用 save_draft 保存完整文稿；保存时只包含正文，去掉代码块围栏。"],
		parameters: saveDraftSchema,
		async execute(_toolCallId, params) {
			const flow = writerRuntime.flowFor(cwd);
			const saved = await flow.toolSaveDraft(params.content, params.note);
			return {
				content: [{ type: "text", text: `已保存新版本 ${saved.path}（第 ${saved.version} 版）。历史版本均保留。` }],
				details: { path: saved.path, version: saved.version },
			};
		},
	};
}

const reviseParagraphSchema = Type.Object({
	original: Type.String({ description: "当前文稿中逐字出现的原段落（含标点，全文唯一）" }),
	replacement: Type.String({ description: "替换后的段落内容；删除段落时传空字符串" }),
	note: Type.Optional(Type.String({ description: "修改说明" })),
});

export function createReviseParagraphToolDefinition(cwd: string): ToolDefinition<typeof reviseParagraphSchema> {
	return {
		name: "revise_paragraph",
		label: "按段落修改",
		description:
			"按段落修改当前文稿（仅修改轮可用）。original 必须逐字复制当前文稿中要修改的那一段（含标点），且全文唯一；replacement 为新的段落内容，删除段落时传空字符串。修改在修改轮结束时统一保存为新版本。",
		promptSnippet: "按段落局部修改当前文稿（original 必须逐字来自当前文稿且唯一）",
		promptGuidelines: [
			"局部修改用 revise_paragraph：original 必须逐字来自当前文稿且全文唯一；删除段落时 replacement 传空字符串。",
			"不要为了省事而整篇重新润色；只改检查意见涉及的段落。",
		],
		parameters: reviseParagraphSchema,
		async execute(_toolCallId, params) {
			const flow = writerRuntime.flowFor(cwd);
			const result = await flow.toolApplyParagraphEdit(params.original, params.replacement);
			if (!result.ok) {
				return { content: [{ type: "text", text: result.message }], details: {}, isError: true };
			}
			return { content: [{ type: "text", text: result.message }], details: { note: params.note ?? null } };
		},
	};
}

const diffSchema = Type.Object({
	from: Type.Optional(Type.String({ description: "起始版本，如 draft-001 或 1；默认最近第二版" })),
	to: Type.Optional(Type.String({ description: "目标版本；默认最新版" })),
});

export function createDiffVersionsToolDefinition(cwd: string): ToolDefinition<typeof diffSchema> {
	return {
		name: "diff_versions",
		label: "版本对比",
		description: "对比两个草稿版本的差异。不传参数时对比最近两个版本；版本号如 1、001 或 draft-001。",
		promptSnippet: "对比两个草稿版本的行级差异",
		parameters: diffSchema,
		async execute(_toolCallId, params) {
			const from = params.from ? parseVersionArg(params.from) : undefined;
			const to = params.to ? parseVersionArg(params.to) : undefined;
			const patch = await diffDrafts(cwd, from ?? undefined, to ?? undefined);
			if (patch === null) {
				return {
					content: [{ type: "text", text: "没有可对比的版本（至少需要两个版本，或指定的版本不存在）。" }],
					details: {},
					isError: true,
				};
			}
			return { content: [{ type: "text", text: patch }], details: {} };
		},
	};
}

const revertSchema = Type.Object({
	version: Type.String({ description: "要回退到的版本，如 draft-001 或 1" }),
});

export function createRevertVersionToolDefinition(cwd: string): ToolDefinition<typeof revertSchema> {
	return {
		name: "revert_version",
		label: "回退版本",
		description:
			"把当前版本切回指定的历史版本：生成一个内容与历史版本相同的新版本（版本号继续递增），所有历史文件保留。",
		promptSnippet: "把当前版本切回历史版本（历史文件保留）",
		parameters: revertSchema,
		async execute(_toolCallId, params) {
			const version = parseVersionArg(params.version);
			if (version === null) {
				return {
					content: [{ type: "text", text: "版本参数无效，应为 draft-001、001 或 1。" }],
					details: {},
					isError: true,
				};
			}
			const result = await revertTo(cwd, version);
			if (!result) {
				return {
					content: [{ type: "text", text: `找不到版本 draft-${String(version).padStart(3, "0")}。` }],
					details: {},
					isError: true,
				};
			}
			return {
				content: [
					{ type: "text", text: `已回退到 ${draftPathFor(version)} 的内容，保存为新版本 ${result.path}。` },
				],
				details: { path: result.path },
			};
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

const updateContextSchema = Type.Object({
	file: Type.String({ description: "上下文文件名（不含目录），如 characters.md、references.md" }),
	content: Type.String({ description: "新的文件内容（replace）或要追加的段落（append）" }),
	mode: Type.Optional(Type.Union([Type.Literal("replace"), Type.Literal("append")], { description: "默认 replace" })),
});

/**
 * Genre-scoped persistent-context tool (fiction 的设定/时间线/事件，academic 的引用对应）。
 * Only the context files declared by the CURRENT genre's config are writable.
 */
export function createUpdateContextToolDefinition(cwd: string): ToolDefinition<typeof updateContextSchema> {
	return {
		name: "update_context",
		label: "更新写作上下文",
		description:
			"更新当前体裁的持久上下文文件（人物设定、时间线、叙述视角、已经发生的事件、引用对应等）。只允许写当前体裁声明的文件；每次内容变化后应更新，保持与文稿一致。",
		promptSnippet: "更新体裁持久上下文（人物/时间线/事件/引用对应等，按体裁配置）",
		parameters: updateContextSchema,
		async execute(_toolCallId, params) {
			const flow = writerRuntime.flowFor(cwd);
			const genre = getGenreOrFallback(flow.genreId);
			const allowed = genre.context?.files.find((f) => f.file === params.file);
			if (!allowed) {
				return {
					content: [
						{
							type: "text",
							text: `体裁 ${genre.id} 不提供上下文文件 ${params.file}。可用文件：${genre.context?.files.map((f) => f.file).join(", ") || "（无）"}。`,
						},
					],
					details: {},
					isError: true,
				};
			}
			const abs = `${cwd}/context/${params.file}`;
			await mkdir(`${cwd}/context`, { recursive: true });
			if (params.mode === "append") {
				await appendFile(abs, `${params.content.trimEnd()}\n`, "utf-8");
			} else {
				await writeFile(abs, params.content.endsWith("\n") ? params.content : `${params.content}\n`, "utf-8");
			}
			return {
				content: [{ type: "text", text: `已更新 context/${params.file}（${allowed.title}）。` }],
				details: { file: params.file, mode: params.mode ?? "replace" },
			};
		},
	};
}

export function createWriterTools(cwd: string): AgentTool[] {
	return [
		wrapToolDefinition(createSaveDraftToolDefinition(cwd)),
		wrapToolDefinition(createReviseParagraphToolDefinition(cwd)),
		wrapToolDefinition(createDiffVersionsToolDefinition(cwd)),
		wrapToolDefinition(createRevertVersionToolDefinition(cwd)),
		wrapToolDefinition(createUpdateContextToolDefinition(cwd)),
	];
}
