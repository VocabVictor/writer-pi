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
		{ id: "verify", title: "核对", guidance: "逐句核对：事实/结论是否有来源、限定与结论强度是否与材料一致、引用是否登记" },
	],
	context: {
		files: [
			{
				file: "references.md",
				title: "引用与来源对应",
				description: "文稿中出现引用标记（如 [1]、(作者, 年份)）时，在此登记标记与 sources/ 中对应材料的关系；没有对应材料的引用必须删除",
				template:
					"# 引用与来源对应\n\n<!-- 格式：- [1] → sources/xxx.md 第 N 点：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"是否把用户提供的事实、文献结论、推断和写作建议混为一谈，或把推断写成已证结论（unsourced_addition / meaning_drift）",
		"是否出现材料中不存在的参考文献、实验、数据、结果或贡献（unsourced_addition，且应核对 context/references.md 与 sources/）",
		"术语、限定条件、结论强度是否被保留；「表明/证明」「可能/必然」是否与材料一致（meaning_drift / omission）",
		"材料不足处是否用了【待补：…】标记而不是虚构内容（omission）",
		"引用标记是否都能在 context/references.md 或 sources/ 中找到对应（unsourced_citation）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: true },
	tools: ["update_context"],
	completion: [
		"段落完成了 brief 声明的任务（如：只写结果，不写讨论）",
		"每个论断可追溯到 sources/ 的具体内容，或明确标记【待补】",
		"引用标记与 context/references.md 一一对应",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
