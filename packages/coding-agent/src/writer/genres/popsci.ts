/**
 * popsci genre: 科普文。面向大众读者：类比解释与准确性并重——类比只解释机制
 * 不替代证据，数字与结论必须有来源。
 */

import type { GenreConfig } from "./types.ts";

export const popsci: GenreConfig = {
	id: "popsci",
	name: "科普文",
	experimental: true,
	description: "科普文章：面向大众读者，类比解释与准确性并重",
	requiredInputs: ["brief.md（读者、主题、篇幅）", "sources/（研究文献、数据、专家说法或权威资料）"],
	optionalInputs: ["context/references.md（引用与来源对应）", "locked.md", "voice/ 文风样本"],
	creation: {
		allowed:
			"类比的选择与展开、语言难度与比喻、结构组织、标点与引号遵循目标语言书面惯例；类比只解释机制，不用于证明；材料不足时写提纲、用「【待补：…】」标记缺口",
		requiresSource:
			"一切事实：研究发现、数据、数字、结论、专家说法、因果。不得编造研究、数据或专家发言；结论强度与适用范围必须保留（「相关性」「可能」「在实验条件下」等不得强化成因果或普遍规律）；类比与事实的边界写清",
	},
	stages: [
		{
			id: "outline",
			title: "定主线与类比",
			guidance:
				"先列主线（问题 → 关键发现 → 意义）与每点对应的事实/来源；为核心概念选一个类比并标注它解释什么、不解释什么",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按主线起草：每个论断紧跟来源或标记【待补】；类比紧跟被解释的概念，写清类比失效的地方",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐句核对：事实与数字是否有来源、结论强度是否与材料一致、类比是否被当成了证据",
		},
	],
	context: {
		files: [
			{
				file: "references.md",
				title: "引用与来源对应",
				description: "文中出现的研究、数据与专家说法在此登记标记与 sources/ 的对应；没有对应材料的说法必须删除",
				template: "# 引用与来源对应\n\n<!-- 格式：- [1] → sources/xxx.md 第 N 点：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"研究发现、数据、专家说法是否与材料一致；是否编造研究或数据（unsourced_addition / consistency，并核对 context/references.md）",
		"结论强度是否保留：相关性是否被写成因果、「可能」是否被写成「必然」、单一研究是否被写成定论（meaning_drift）",
		"类比是否只解释不替代证据；是否写清类比失效的地方（other）",
		"读者是否有门槛：术语是否先解释再用、数字是否给了可感知的参照（over_explanation / other）",
		"设问与类比是大读者群科普的常态写法，不要按套路结构直接否定（formulaic_structure）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: true,
		longForm: { enabled: true, maxParagraphChars: 400 },
		// 大众读者的设问与口语连接词人类也常用（实测正文问句人类远多于 AI），阈值放宽到 35。
		aitone: { enabled: true, threshold: 35 },
	},
	// 长文（系列科普/深度长文）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 2000,
		structure: [
			"按问题展开：每章回答一个子问题，章首一句说明本章回答什么",
			"一个核心概念一个类比：类比展开一次讲透，不每章换一个新类比",
			"证据链分层：先给研究说了什么，再给证据强度，最后给适用范围；三者不混写",
			"章末与本章开头的问题对齐，全文结尾不引入新证据",
		],
		pacing: [
			"单段不超过 400 字；数据罗列改为列表，数字之后紧跟可感知的参照",
			"抽象解释与具体例子交替：连续两段抽象概念后必须落一个例子或类比",
			"每 3-5 段回扣一次全文主线，避免读者在长解释中迷失",
		],
		tracking: [
			"同一概念全篇用同一个说法与类比，不中途换说法",
			"后文引用的数字与前文逐字一致，适用范围（样本、条件）首次出现后不删",
			"残留的【待补：…】标记要么补齐，要么在交付说明中列明缺口；新增引用登记进 context/references.md",
		],
	},
	tools: ["update_context"],
	completion: [
		"每个事实与数字可追溯到 sources/ 的具体内容，或明确标记【待补】",
		"结论强度与适用范围与材料一致，类比没有替代证据",
		"术语先解释再用，大众读者无专业门槛",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
