/**
 * workreport genre: 周报/月报/述职。进度结构、事实与数字必须有来源；
 * 公文腔拔高词（赋能/闭环/抓手等）不进正文——由 AI 味检测抓，而不是写出来。
 */

import type { GenreConfig } from "./types.ts";

export const workreport: GenreConfig = {
	id: "workreport",
	name: "工作汇报",
	experimental: true,
	description: "周报、月报、述职：进度结构，事实与数字有来源，不拔高",
	requiredInputs: ["brief.md（周期、汇报对象、范围）", "sources/（工作记录、数据、项目进展材料）"],
	optionalInputs: ["context/progress.md（已核对的事项与数字）", "locked.md"],
	creation: {
		allowed: "结构与条目排序、进度措辞、口语或书面语气遵循汇报对象与目标语言惯例；对进展做中性概括，困难与风险如实写",
		requiresSource:
			"一切事实与数字：完成事项、进度百分比、指标、数据、时间、协作方。不得编造进展、数据或指标；未完成的事项写未完成及原因，不写成已完成；数字与材料逐字一致",
	},
	stages: [
		{
			id: "outline",
			title: "定事项与数字",
			guidance: "先从材料里列出本周期的事项、对应的数字与材料位置；无材料依据的成果删掉",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按「完成 → 进行中 → 风险/求助 → 下一步」起草；每个成果紧跟数字或来源；下一步写可核对的动作",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：数字与进展是否与材料一致、未完成事项是否如实标注、是否混入拔高词与无依据的评价",
		},
	],
	context: {
		files: [
			{
				file: "progress.md",
				title: "事项与数字登记",
				description:
					"完成事项、指标与数字在此登记条目与 sources/ 出处；跨周期汇报时承接上一周期的进度；材料不足的条目删除或标记【待核】",
				template: "# 事项与数字登记\n\n<!-- 格式：- 事项/指标 → 数字 → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"完成事项、进度、指标、数字是否与 sources/ 一致；是否编造进展或数据（unsourced_addition / consistency，并核对 context/progress.md）",
		"未完成事项是否如实写原因与状态；是否把进行中写成已完成（meaning_drift / unsourced_addition）",
		"是否混入公文腔拔高词（赋能、闭环、抓手、对齐等）与无依据的自我评价；成果用事实与数字说话（empty_elevation / other）",
		"下一步是否写可核对的动作：负责人、动作、时间，不写口号（other）",
		"进度结构是否完整：完成、进行中、风险、下一步是否齐全（omission / task_incomplete）",
	],
	extraKinds: ["task_incomplete", "consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 250 },
		// 公文腔拔高词靠默认阈值抓：单词命中（权重 ×3）即进 MEDIUM 档。
		aitone: { enabled: true, threshold: 25 },
	},
	// 长文（月报/述职/年度总结）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 1500,
		structure: [
			"固定骨架：完成 → 进行中 → 风险/求助 → 下一步；按项目或职责分节，每节内沿用同一骨架",
			"每个成果单独成条：事项、数字、与目标的差距写在一条里，不混叙",
			"述职的自我评价紧跟事实：先给做了什么与结果，再给一句评价，评价不超过事实支持的范围",
			"跨周期衔接：开头承接上一周期的计划，说明哪些兑现、哪些顺延",
		],
		pacing: [
			"单段不超过 250 字；成果与数据用列表逐条写，叙述只用于背景与风险",
			"数字之后紧跟口径（周期、对比基线），不让读者自行解读",
			"连续罗列的成果之间不插拔高句，节奏靠事实密度维持",
		],
		tracking: [
			"数字、指标与材料逐字一致，不四舍五入；同一指标全篇用同一口径",
			"上一周期的承诺在本周期的兑现情况要能对上：顺延的事项不凭空消失",
			"事项与数字登记进 context/progress.md；残留的【待核】要么补齐，要么在交付说明中列明",
		],
	},
	tools: ["update_context"],
	completion: [
		"完成、进行中、风险、下一步齐全，下一步有可核对的动作",
		"每个成果与数字可追溯到 sources/，未完成事项如实标注",
		"没有公文腔拔高词与材料以外的自我评价",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
