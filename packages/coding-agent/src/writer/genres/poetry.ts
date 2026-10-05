/**
 * poetry genre — EXPERIMENTAL. Not claimed as verified in this demo beyond the
 * "do not flag intentional repetition / line breaks as errors" check case.
 *
 * Key idea: repetition, abstraction, broken lines and omission can be deliberate
 * artistic choices, so the program duplicate check is OFF and the review focus
 * explicitly allows them.
 */

import type { GenreConfig } from "./types.ts";

export const poetry: GenreConfig = {
	id: "poetry",
	name: "诗歌",
	experimental: true,
	description: "现代诗等分行文本（实验性配置，未做系统验证）",
	requiredInputs: ["sources/（原诗、意象素材或写作要求）"],
	optionalInputs: ["brief.md（形式与情感基调）", "voice/ 文风样本", "locked.md"],
	creation: {
		allowed: "在用户要求的主题与形式内处理意象、节奏、声音、分行与省略；重复、抽象、碎句、断行都可能是有意的选择",
		requiresSource: "用户给定的意象、词句（locked.md）、形式要求（如固定诗节）与情感方向",
	},
	stages: [
		{ id: "draft", title: "起草", guidance: "先听句子的声音再调语义；分行、重复、留白服务于整首的节奏" },
		{ id: "verify", title: "核对", guidance: "朗读一遍：节奏与气息是否一致；不要用散文的清晰标准改诗" },
	],
	context: null,
	reviewFocus: [
		"重复的词句、抽象表达、碎句和省略可能是有意的艺术选择：只有当它们明显破坏整首的节奏或意象系统时才报告（other）",
		"不要用博客式的清晰论证、信息密度或完整解释标准评价诗歌（task_incomplete / other）",
		"不要为了「自然」「口语化」而把有意的句法与分行改平（meaning_drift）",
		"意象与情感方向是否偏离用户要求（meaning_drift）",
	],
	extraKinds: [],
	checks: { length: false, bannedWords: true, duplicates: "off", locked: true, citations: false },
	tools: [],
	completion: ["形式（诗节/分行/长度）符合用户要求", "核心意象与情感方向与用户要求一致"],
	operations: ["draft", "continue", "outline", "revise"],
};
