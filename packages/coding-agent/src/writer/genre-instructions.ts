/**
 * Rendering of genre-specific rule blocks for the per-turn instructions.
 * 体裁规则不进全局系统提示词：按当前任务注入（需求：每次只加载当前体裁的配置）。
 */

import { BASE_ISSUE_KINDS, type GenreConfig } from "./genres/types.ts";

export function renderGenreRules(genre: GenreConfig): string {
	const parts: string[] = [];
	parts.push(
		`## 体裁：${genre.name}（${genre.id}）${genre.experimental ? "\n\n本体裁配置为实验性，尚未经过系统验证；与用户明确要求冲突时以用户要求为准。" : ""}`,
	);
	parts.push(`- 允许创作：${genre.creation.allowed}`);
	parts.push(`- 必须有来源：${genre.creation.requiresSource}`);
	if (genre.context) {
		const files = genre.context.files.map((f) => `- context/${f.file}：${f.description}`).join("\n");
		parts.push(`- 持久设定与记录（写作前读取，内容变化后用 update_context 工具更新）：\n${files}`);
	}
	if (genre.completion.length > 0) {
		parts.push(`- 完成条件：\n${genre.completion.map((c) => `  - ${c}`).join("\n")}`);
	}
	return parts.join("\n\n");
}

/** Operation guidance from the genre's recommended stages; falls back to a generic line. */
export function operationGuidance(genre: GenreConfig, operation: string): string {
	const stage = genre.stages.find((s) => s.id === operation);
	if (stage) return `【${genre.name}·${stage.title}】${stage.guidance}`;
	return `按 ${genre.name} 的惯例执行${operation}操作。`;
}

/** Issue kinds the reviewer may use for this genre. */
export function allowedKinds(genre: GenreConfig): string[] {
	return [...BASE_ISSUE_KINDS, ...genre.extraKinds];
}
