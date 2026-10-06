/**
 * academic genre: scholarly paragraphs, survey sections, research papers.
 * Verified in this demo on the "draft a results paragraph from provided notes" path.
 */

import type { GenreConfig } from "./types.ts";

export const academic: GenreConfig = {
	id: "academic",
	name: "学术写作",
	description: "学术文章、综述、研究论文（综述/论文可作为后续子类型扩展）",
	requiredInputs: ["brief.md", "sources/（研究笔记、文献摘录、数据说明）"],
	optionalInputs: ["locked.md", "context/references.md（已有引用登记）"],
	creation: {
		allowed:
			"语言组织、段落结构、术语的中文译法、对用户提供结论的概括与连接；材料不足时写提纲、用「【待补：…】」标记缺口",
		requiresSource:
			"一切事实、数据、实验结果、文献结论、贡献声明。不得编造参考文献、实验、数据、结果或贡献；术语、限定条件和结论强度必须保留（“表明”“可能”“在本文条件下”等不得强化或删除）",
	},
	stages: [
		{ id: "outline", title: "提纲", guidance: "先列出段落要点与每点对应的事实/来源，标注证据不足之处" },
		{ id: "draft", title: "起草", guidance: "按提纲起草；每个论断紧跟来源或标记【待补】" },
		{
			id: "verify",
			title: "核对",
			guidance: "逐句核对：事实/结论是否有来源、限定与结论强度是否与材料一致、引用是否登记",
		},
	],
	context: {
		files: [
			{
				file: "references.md",
				title: "引用与来源对应",
				description:
					"文稿中出现引用标记（如 [1]、(作者, 年份)）时，在此登记标记与 sources/ 中对应材料的关系；没有对应材料的引用必须删除",
				template: "# 引用与来源对应\n\n<!-- 格式：- [1] → sources/xxx.md 第 N 点：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"是否把用户提供的事实、文献结论、推断和写作建议混为一谈，或把推断写成已证结论（unsourced_addition / meaning_drift）",
		"是否出现材料中不存在的参考文献、实验、数据、结果或贡献（unsourced_addition，且应核对 context/references.md 与 sources/）",
		"术语、限定条件、结论强度是否被保留；「表明/证明」「可能/必然」是否与材料一致（meaning_drift / omission）",
		"材料不足处是否用了【待补：…】标记而不是虚构内容（omission）",
		"引用标记是否都能在 context/references.md 或 sources/ 中找到对应（unsourced_citation）",
		"用词是否精确：主动动词、具体名词、术语不堆砌（WORD CHOICE）；长句朗读是否顺畅（SENTENCE FLUENCY）（other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: {
		length: true,
		bannedWords: true,
		duplicates: "strict",
		locked: true,
		citations: true,
		longForm: { enabled: true, maxParagraphChars: 400 },
		// 正式体裁阈值更高：学术措辞（研究表明/本文旨在）在正常论文里也会用，避免误报；burstiness 是学术摘要的分场景特征。
		aitone: { enabled: true, threshold: 60, burstiness: true },
	},
	// 长文（综述/完整论文）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 3000,
		structure: [
			"每段一个论证步骤：段首主题句 → 证据或推理 → 与本章论点的连接；一段不承担两个论证步骤",
			"论证组件齐全：主张（claim）→ 证据（grounds）→ 连接前提（warrant）；限定词（qualifier）与反驳（rebuttal）建立可信度，承认观点不总成立",
			"论证链闭合：每章的结论要能指回前文建立的前提，首次出现的概念先定义再使用",
			"每节开头用一两句说明本节承接什么、回答什么；每节结尾与本节开头的承诺对齐",
			"章节顺序不被打乱：问题 → 相关工作 → 方法 → 结果 → 讨论；结果节不做讨论，讨论节不引入新结果",
		],
		pacing: [
			"单段不超过 400 字；超过时按论证步骤拆分，或把罗列改成列表",
			"连续罗列的数据段之间要有解释段：数字之后紧跟说明，不让读者自行解读",
			"每 3-5 段回扣一次本章论点，避免读者在长论证中迷失",
		],
		tracking: [
			"同一概念全篇用同一个译法与提法，缩写首次出现时给出全称",
			"讨论中引用的数字与结论必须与前文结果节逐字一致，不得改写或四舍五入",
			"残留的【待补：…】标记要么补齐，要么在交付说明中列明缺口，不得留在正文里不说明",
			"新增引用登记进 context/references.md；删除内容后清理失效的引用",
		],
	},
	tools: ["update_context"],
	completion: [
		"段落完成了 brief 声明的任务（如：只写结果，不写讨论）",
		"每个论断可追溯到 sources/ 的具体内容，或明确标记【待补】",
		"引用标记与 context/references.md 一一对应",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
