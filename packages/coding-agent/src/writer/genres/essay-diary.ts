/**
 * essay and diary genres — EXPERIMENTAL configurations, not verified in this demo.
 */

import type { GenreConfig } from "./types.ts";

export const essay: GenreConfig = {
	id: "essay",
	name: "散文",
	experimental: true,
	description: "散文与随笔（实验性配置，未做系统验证）",
	requiredInputs: ["sources/（观察、素材或写作要求）"],
	optionalInputs: ["brief.md", "voice/ 文风样本", "locked.md"],
	creation: {
		allowed: "联想、含蓄表达、细节的取舍与节奏安排；允许不给出结论",
		requiresSource: "用户提供的观察、经历细节与感受方向；不编造具体经历",
	},
	stages: [
		{ id: "draft", title: "起草", guidance: "从细节出发，跟着感受走；不要急着总结" },
		{ id: "verify", title: "核对", guidance: "语言节奏是否均匀；有没有为完整性硬加的总结" },
	],
	context: null,
	reviewFocus: [
		"是否自动添加人生感悟或宏大结尾（empty_elevation）",
		"观察与细节是否具体、是否被抽象词吃掉（other）",
		"联想是否偏离了文章的情感方向（meaning_drift）",
	],
	extraKinds: [],
	checks: { length: true, bannedWords: true, duplicates: "off", locked: true, citations: false },
	tools: [],
	completion: ["写到了用户要求的对象/场景", "没有强加的总结性结尾"],
	operations: ["draft", "continue", "outline", "revise"],
};

export const diary: GenreConfig = {
	id: "diary",
	name: "日记",
	experimental: true,
	description: "私人日记与记录（实验性配置，未做系统验证）",
	requiredInputs: ["sources/（日记原文或口述记录）"],
	optionalInputs: ["locked.md"],
	creation: {
		allowed: "错别字订正、明显的语病修复；保持记录的粗粝感",
		requiresSource: "一切内容。不编造经历，不替作者解释心理动机，不补写作者没有的想法",
	},
	stages: [{ id: "draft", title: "整理", guidance: "轻度编辑：只修语病与错字，保留当下的语气、矛盾和未完成的想法" }],
	context: null,
	reviewFocus: [
		"是否把私人记录改成了面向公众的文章：加开头结尾、解释动机、提升立意（meaning_drift / empty_elevation）",
		"是否编造经历或替作者下结论（unsourced_addition / meaning_drift）",
		"作者当下的感受、矛盾、不确定是否被保留（omission）",
	],
	extraKinds: [],
	checks: { length: false, bannedWords: false, duplicates: "off", locked: true, citations: false },
	tools: [],
	completion: ["仅做了用户要求的轻度编辑", "作者原始的语气与未完成想法仍在"],
	operations: ["draft", "revise"],
};
