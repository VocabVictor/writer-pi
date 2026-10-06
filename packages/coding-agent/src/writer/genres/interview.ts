/**
 * interview genre: 访谈稿。问答结构，引语逐字保留原意；语域分层——叙述书面、
 * 引语保留口语。与 critique（评论体裁）不同：访谈只记录观点，不评论观点。
 */

import type { GenreConfig } from "./types.ts";

export const interview: GenreConfig = {
	id: "interview",
	name: "访谈稿",
	experimental: true,
	description: "访谈稿：问答结构，引语保留原意，叙述书面、引语口语",
	requiredInputs: ["brief.md（受访者、范围）", "sources/（录音转写、采访笔记或问答原始材料）"],
	optionalInputs: ["context/quotes.md（已核对的引语）", "locked.md"],
	creation: {
		allowed:
			"问答的编排与删减、导语与过渡的措辞、叙述部分的标点与引号遵循目标语言书面惯例；提问可以在给定范围内改写得更聚焦",
		requiresSource:
			"一切事实：受访者身份、引语、数字、时间、事件。引语必须保留原意：不得替受访者编造发言、合并语句改变立场或删掉限定词；口语可按目标语言规范整理，但不得改变含义",
	},
	stages: [
		{
			id: "outline",
			title: "定问答主线",
			guidance: "先从材料里列出问答主线（主题 → 关键问答），标注每条引语的材料位置；与主线无关的旁枝删掉",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按问答结构起草：导语介绍受访者与背景，问答成组；引语逐字或按材料转述，叙述书面、引语保留口语",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：引语是否与材料一致、是否保留原意与限定词、受访者身份与数字是否准确",
		},
	],
	context: {
		files: [
			{
				file: "quotes.md",
				title: "引语核对",
				description:
					"文稿中的引语在此登记并与 sources/ 的转写对应；改写过的引语标注整理方式；没有材料对应的引语必须删除",
				template: "# 引语核对\n\n<!-- 格式：- 引语摘录 → sources/xxx.md：逐字/整理说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"引语是否与 sources/ 一致并保留原意；是否删掉限定词、合并语句改变立场（meaning_drift / unsourced_addition，并核对 context/quotes.md）",
		"是否替受访者编造没有依据的发言；直接引语与转述是否标注清楚（unsourced_addition）",
		"受访者身份、职务、数字、时间是否准确（consistency / unsourced_addition）",
		"问答结构是否成立：每个回答对应一个问题，导语与过渡不喧宾夺主（formulaic_structure）",
		"语域分层是否保持：叙述书面、引语口语，不把口语引语改写成书面语（other）",
	],
	extraKinds: ["task_incomplete", "consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 400 },
		// 引语是口语，AI 味词表在口语上误报多，阈值放宽到 40。
		aitone: { enabled: true, threshold: 40 },
	},
	// 长文（长访谈/系列访谈）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 2500,
		structure: [
			"按主题分节：每节一个话题，节内问答成组；节与节之间用一句过渡说明话题的转换",
			"导语在前：受访者身份、访谈背景、主线一句说清；导语不剧透引语",
			"关键引语放在每节的开头或结尾，一节只突出一条核心引语",
		],
		pacing: [
			"单段不超过 400 字；引语按对话轮次分段，不把多轮问答塞进一段",
			"长回答拆段时保持引语连续性，拆段处不改变语序与含义",
			"叙述与引语交替：连续多段叙述时补一条引语",
		],
		tracking: [
			"同一引语全篇只出现一次原话形态；再次提及时用转述，不重复整段引语",
			"受访者立场前后一致：前后矛盾的回答要么并排呈现，要么向材料求证",
			"引语登记进 context/quotes.md；删除内容后清理失效条目",
		],
	},
	tools: ["update_context"],
	completion: [
		"问答结构与主线一致，每个回答对应一个问题",
		"引语可追溯到 sources/ 的转写，保留原意或标注整理方式",
		"受访者身份与数字准确，没有材料以外的发言",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
