/**
 * microcopy genre: 微博、朋友圈、短文案。平台短文本：长度上限小、首句即内容、
 * 话题标签按平台惯例；长文规则只在系列帖（多条连发）时注入，单条够不到阈值。
 */

import type { GenreConfig } from "./types.ts";

export const microcopy: GenreConfig = {
	id: "microcopy",
	name: "短文案",
	experimental: true,
	description: "微博、朋友圈、短文案：平台短文本，长度上限小，口语直接",
	requiredInputs: ["brief.md（平台、字数上限、目标受众、目的）"],
	optionalInputs: ["sources/（产品、活动、日期等事实，如涉及）", "locked.md", "voice/ 文风样本"],
	creation: {
		allowed:
			"口语语气、话题标签（hashtag）的数量与位置、emoji 与表情符号的使用遵循目标语言平台惯例且全文一致；观点与感受可以创作",
		requiresSource:
			"涉及产品、价格、活动、日期、数字、他人言论的事实必须有材料依据。不得编造数据、活动或他人发言；引用他人原话要逐字保留或明确转述",
	},
	stages: [
		{
			id: "draft",
			title: "起草",
			guidance: "先确认字数上限与平台，再起草；首句直接进入内容，不写铺垫；涉及事实的句子跟来源",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐句核对：字数是否在上限内、事实是否有来源、话题标签是否符合平台惯例且全文一致",
		},
	],
	context: null,
	reviewFocus: [
		"字数是否在 brief 上限内：短文案超字数即失败（task_incomplete / other）",
		"首句是否直接进入内容；是否写了平台短文本装不下的铺垫（formulaic_structure / other）",
		"涉及产品、价格、日期、数字、他人言论的事实是否有来源；是否编造他人发言（unsourced_addition）",
		"话题标签数量与位置是否符合平台惯例且全文一致（other）",
	],
	extraKinds: ["task_incomplete"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: false,
		// 短文案单条上限小：过长段落本身就是超字数信号。
		longForm: { enabled: true, maxParagraphChars: 120 },
		// 口语短文本里套话与连接词的误报率高，阈值放宽到 35。
		aitone: { enabled: true, threshold: 35 },
	},
	// 长文只在系列帖（多条连发）时触发；规则文本与 maxParagraphChars 保持一致。
	longForm: {
		threshold: 600,
		structure: [
			"每条一个焦点：单条独立成立，不复述上一条",
			"系列帖之间相互呼应：第一条立观点，后续条目给事实、跟进或回应，最后一条收束",
			"互动帖（问答、投票）把问题写进首句，不给读者留歧义",
		],
		pacing: [
			"单条不超过 brief 上限；单段不超过 120 字，超过时拆成多条或删减",
			"首句即钩子：短文本没有铺垫空间，第一句就要给出读者读下去的理由",
			"事实句与观点句交替：连续多条观点时补一条事实或具体细节",
		],
		tracking: [
			"系列帖共用同一组话题标签；同一事实不在多条里重复堆砌",
			"系列帖里的日期、数字、承诺前后一致，改动时同步改所有相关条目",
			"涉及他人言论的引用逐字一致，不跨条改写",
		],
	},
	tools: [],
	completion: [
		"字数在 brief 上限内，首句直接进入内容",
		"涉及事实的句子可追溯到 sources/，或已删除",
		"话题标签符合平台惯例且全文一致",
	],
	operations: ["draft", "continue", "revise"],
};
