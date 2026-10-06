/**
 * news genre: 新闻稿与通稿。Inverted pyramid: 5W in the lead, every fact and quote from
 * sources/, objective register — the model may arrange and neutralize, not invent.
 */

import type { GenreConfig } from "./types.ts";

export const news: GenreConfig = {
	id: "news",
	name: "新闻稿",
	experimental: true,
	description: "新闻稿、通稿、发布稿（倒金字塔结构，5W 导语）",
	requiredInputs: ["brief.md（发布目的、目标媒体/读者）", "sources/（事实：时间、地点、人物、数据、引语、背景）"],
	optionalInputs: ["context/facts.md（5W 事实清单）", "locked.md"],
	creation: {
		allowed:
			"倒金字塔的层次安排、导语写法、段落顺序、标题与段落措辞、中性转述与过渡；标点与引号遵循目标语言书面惯例（直接引语用目标语言的引号惯例且全文一致）；数字与日期写法全文一致",
		requiresSource:
			"一切事实：时间、地点、人物、机构、数字、事件经过、引语。不得虚构引语、数据或事件；引语只能来自材料并保留原意；客观限定（预计、据称、未经证实等对应表述）不得删除或强化",
	},
	stages: [
		{
			id: "outline",
			title: "定 5W 与层次",
			guidance: "先定 5W（何时/何地/何人/何事/为何）与倒金字塔层次；每层标注对应的事实",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "导语承载 5W 要点，重要信息在前，背景与次要信息靠后；只陈述事实，不加评论",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐句核对：5W 是否与材料一致；引语是否来自材料且未改动原意；是否夹带评论或形容词堆砌",
		},
	],
	context: {
		files: [
			{
				file: "facts.md",
				title: "5W 事实清单",
				description: "时间、地点、人物、事件、数据与引语及其在 sources/ 中的出处；写前读取，写后把新事实补入",
				template: "# 5W 事实清单\n\n<!-- 格式：- 事实 → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"导语是否承载 5W 要点且重要信息在前；是否遗漏材料中的关键事实或背景（task_incomplete / omission）",
		"时间、地点、人物、数字、事件经过是否与材料一致（unsourced_addition / consistency）",
		"引语是否来自材料；是否把转述写成直接引语或改变原意（unsourced_addition / meaning_drift）",
		"是否夹带评论、形容词堆砌或情绪化表述，破坏客观语域（empty_elevation / meaning_drift）",
		"客观限定（预计、据称、未经证实等对应表述）是否被删除或强化（omission / meaning_drift）",
	],
	extraKinds: ["task_incomplete", "consistency"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"导语承载 5W 要点，重要信息在前，整体为倒金字塔结构",
		"每个事实与引语可追溯到 sources/，没有虚构",
		"语域客观：无评论、无情绪化表述与形容词堆砌",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
