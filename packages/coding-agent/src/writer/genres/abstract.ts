/**
 * abstract genre: 学术摘要。目的/方法/结果/结论四要素与时态惯例，
 * 长度上限严格（多数场合几百字/词以内）；burstiness 在此分场景成立。
 */

import type { GenreConfig } from "./types.ts";

export const abstract: GenreConfig = {
	id: "abstract",
	name: "学术摘要",
	experimental: true,
	description: "论文摘要、会议摘要：目的/方法/结果/结论四要素，长度上限严格",
	requiredInputs: ["brief.md（字数上限、场合）", "sources/（论文正文、研究笔记、结果数据）"],
	optionalInputs: ["locked.md", "context/references.md（已有引用登记，如保留引用）"],
	creation: {
		allowed:
			"四要素的组织与衔接、概括措辞、术语译法、时态遵循目标语言学术惯例（如英文摘要：目的与结论用一般现在时、方法与结果用过去时）；材料不足时标记【待补：…】",
		requiresSource:
			"一切事实：研究目的、方法、样本、结果、数据、结论。不得编造结果或数据；不得把推断写成结论；结论强度与限定条件必须保留（「表明」「在本文条件下」等不得强化或删除）；数字与原文逐字一致",
	},
	stages: [
		{
			id: "outline",
			title: "定四要素",
			guidance: "先从材料里列出目的、方法、结果、结论各要素及对应材料位置；缺数据的要素标记【待补】",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按四要素顺序起草；结果句带数字，结论句不超出结果支持的范围；控制在字数上限内",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐句核对：数字与结果是否与材料一致、结论强度是否保留、字数是否在上限内、时态是否符合目标语言惯例",
		},
	],
	context: {
		files: [
			{
				file: "references.md",
				title: "引用与来源对应",
				description:
					"摘要通常不保留引用；如 brief 要求保留，引用标记在此登记并对应 sources/；没有对应材料的引用必须删除",
				template: "# 引用与来源对应\n\n<!-- 格式：- [1] → sources/xxx.md 第 N 点：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"结果、数据、样本是否与材料一致；是否编造结果或数据（unsourced_addition / consistency）",
		"结论是否超出结果支持的范围；结论强度与限定条件是否保留（meaning_drift）",
		"四要素是否齐全且不互相挤占：方法堆细节、结论复述结果都是结构问题（formulaic_structure / omission）",
		"时态是否符合目标语言学术惯例；是否混用导致时态漂移（other）",
		"字数是否在 brief 上限内：摘要超字数即失败（task_incomplete）",
		"用词是否精确：主动动词、具体名词、术语不堆砌（other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 250 },
		// burstiness 在学术摘要分场景成立（研究实测 98% 触发）；正式语域阈值抬高避免误报。
		aitone: { enabled: true, threshold: 60, burstiness: true },
	},
	// 长文（结构化/扩展摘要）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 500,
		structure: [
			"四要素各占一段或各成一组：目的 → 方法 → 结果 → 结论，顺序不颠倒",
			"结果段只报结果，结论段不复述结果；方法段不报结论",
			"结构化摘要（Purpose/Methods/Results/Conclusions 小标题）按目标场合惯例决定是否用小标题，全篇一致",
		],
		pacing: [
			"单段不超过 250 字；超出时删细节而不是拆段——摘要的空间留给结果",
			"数字句紧跟其条件（样本量、实验条件），不让读者自行解读",
			"四要素之间用一两句衔接，不写过渡性空话",
		],
		tracking: [
			"数字、年份与材料逐字一致；术语全篇用同一个译法，缩写首次出现给出全称",
			"残留的【待补：…】标记要么补齐，要么在交付说明中列明缺口",
			"如保留引用，登记进 context/references.md；删除内容后清理失效引用",
		],
	},
	tools: ["update_context"],
	completion: [
		"四要素齐全且顺序合理，结论不超出结果支持的范围",
		"数字与结果可追溯到 sources/，或明确标记【待补】",
		"字数在 brief 上限内",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
