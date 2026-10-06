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
		"朗读是否顺畅：长短句交替、没有连续的同构句（SENTENCE FLUENCY）；动词是否主动、名词是否具体（WORD CHOICE）（other）",
	],
	extraKinds: ["consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "off",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 400 },
		// 散文是文学类：指纹词（缓缓/微微）检测开。
		aitone: { enabled: true, threshold: 25, fingerprint: true },
	},
	// 长文（长散文）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 2500,
		structure: [
			"开篇的场景/物件/意象在全篇至少回现两次，结尾从已写的细节里长出来，不引入新话题",
			"段落之间靠意象与情绪推进，不靠「首先/其次/总之」（英文的 firstly/secondly 同理）的论文式连接",
			"一个场景给足细节再转场，不浅尝辄止地罗列场景",
		],
		pacing: [
			"单段不超过 400 字；密集叙述之后安排短段或留白，让节奏有起伏",
			"同一情绪不连续渲染超过两段，第三段开始是在重复",
		],
		tracking: [
			"开篇提到的细节在后文要有着落：要么再出现，要么明确放下",
			"时间与季节线索前后一致（上午/黄昏、春/秋不悄悄换掉）",
		],
	},
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
	checks: {
		length: false,
		bannedWords: false,
		duplicates: "off",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 300 },
		// 日记只做轻度编辑，不评价 AI 味。
		aitone: { enabled: false },
	},
	// 长文（多天合辑）：矛盾原样保留，不做一致性修复；规则文本与 maxParagraphChars 保持一致。
	longForm: {
		threshold: 1500,
		structure: [
			"多天记录按日期分节并保留日期头，各天之间不做人为的起承转合",
			"不把多天记录改写成有主题、有结尾的成文",
		],
		pacing: ["单段不超过 300 字；保留短句、跳跃与未完成的想法"],
		tracking: ["不同日期提到的同一件事不合并、不解释，前后矛盾原样保留"],
	},
	tools: [],
	completion: ["仅做了用户要求的轻度编辑", "作者原始的语气与未完成想法仍在"],
	operations: ["draft", "revise"],
};
