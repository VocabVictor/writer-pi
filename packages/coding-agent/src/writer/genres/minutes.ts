/**
 * minutes genre: 会议纪要。条目化的决议/待办/出席，事实（谁说了什么、定了什么）
 * 必须有来源；语域客观，纪要里不做发挥。
 */

import type { GenreConfig } from "./types.ts";

export const minutes: GenreConfig = {
	id: "minutes",
	name: "会议纪要",
	experimental: true,
	description: "会议纪要：出席、议题、决议、待办，条目化、客观、可核对",
	requiredInputs: ["brief.md（会议、范围）", "sources/（会议转写、笔记、聊天记录或议程材料）"],
	optionalInputs: ["context/decisions.md（已核对的决议与待办）", "locked.md"],
	creation: {
		allowed: "条目的组织与排序、议题的概括措辞、标点与列表格式遵循目标语言书面惯例；对发言做中性概括，不改变立场",
		requiresSource:
			"一切事实：决议、待办、负责人、期限、出席人、发言内容、数字。不得编造决议、待办或发言；把讨论写成决议、把建议写成决定都是失真；概括不得改变发言人的立场",
	},
	stages: [
		{
			id: "outline",
			title: "定议题与出席",
			guidance: "先从材料里列出出席人、议题与对应的材料位置；无法确认出席的标记【待核】",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按出席、议题、决议、待办的顺序起草；每条决议与待办写清负责人与期限，并跟来源",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：决议/待办/发言/出席是否与材料一致、负责人与期限是否准确、是否把讨论写成了决议",
		},
	],
	context: {
		files: [
			{
				file: "decisions.md",
				title: "决议与待办登记",
				description: "决议与待办在此登记条目、负责人、期限与 sources/ 出处；材料不足的条目必须删除或标记【待核】",
				template: "# 决议与待办登记\n\n<!-- 格式：- 决议/待办 → 负责人、期限 → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"决议、待办、负责人、期限、出席人、数字是否与 sources/ 一致；是否编造决议或待办（unsourced_addition / consistency，并核对 context/decisions.md）",
		"是否把讨论、建议或未达成一致的议题写成决议；是否改变发言人的立场（meaning_drift）",
		"待办是否有负责人与期限；缺席的要素是否标记【待核】而不是编造（omission / task_incomplete）",
		"是否夹带纪要里没有依据的评论或发挥；语域是否客观（over_explanation / other）",
		"条目化结构：决议与待办用列表逐条写，不塞进叙述大段（formulaic_structure）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: {
		// 事项完整性优先于字数：纪要短到只剩决议也合格。
		length: false,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: false,
		// 纪要条目化：叙述大段即结构信号。
		longForm: { enabled: true, maxParagraphChars: 200 },
		// 客观语域里「与会」「议程」一类公文式词是常态，阈值抬高避免误报。
		aitone: { enabled: true, threshold: 60 },
	},
	// 长文（大型会议/多议题纪要）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 1500,
		structure: [
			"固定骨架：出席 → 议题 → 决议 → 待办；长纪要按议题分节，每节内再列决议与待办",
			"每条决议与待办单独成条：条目写清决定本身、负责人、期限，不与讨论混写",
			"讨论过程只保留影响结论的关键分歧与理由，逐字转写不进纪要",
		],
		pacing: [
			"单段不超过 200 字；事实内容用列表逐条写，叙述只用于议题背景",
			"一个议题一节，节内不混入其他议题的决议；跨议题的决议单独成条并注明关联议题",
		],
		tracking: [
			"决议与待办登记进 context/decisions.md；同一事项在不同节的提法一致（同一负责人、同一期限）",
			"数字（预算、工期、指标）与材料逐字一致，不四舍五入",
			"续写或补录时先读 context/decisions.md，不新增与之矛盾的决议",
		],
	},
	tools: ["update_context"],
	completion: [
		"出席、议题、决议、待办齐全，待办有负责人与期限或已标记【待核】",
		"每条决议与待办可追溯到 sources/ 的具体内容",
		"没有把讨论写成决议，没有材料以外的评论",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
