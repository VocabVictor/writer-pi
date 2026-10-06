/**
 * critique genre: reviews (book/film/product). A stated stance carried by evidence;
 * quotes from the work must come from sources/ and be registered in context/quotes.md.
 */

import type { GenreConfig } from "./types.ts";

export const critique: GenreConfig = {
	id: "critique",
	name: "评论写作",
	experimental: true,
	description: "书评、影评、剧评、产品评论等评论文（书评/影评/产品评论共用一个配置，立场与论据是核心）",
	requiredInputs: [
		"brief.md（评价对象、立场、目标读者）",
		"sources/（作品原文、台词、情节梗概、参数、价格、他人评价）",
	],
	optionalInputs: ["context/quotes.md（引述核对）", "locked.md"],
	creation: {
		allowed:
			"用户立场范围内的评价表述与强调力度、结构安排（总体判断/论据/结论）、评价维度的取舍与过渡；引述原文的标点与引号遵循目标语言的引号惯例且全文一致",
		requiresSource:
			"一切事实：情节、台词、镜头、结构、数据、价格、作者/导演/演员信息。不得虚构情节或引述；引述原文（句子、台词、段落）必须来自材料并保留原意；评价必须与用户立场一致，不得替用户改成两边各打五十大板",
	},
	stages: [
		{
			id: "outline",
			title: "定立场与评价维度",
			guidance:
				"先明确立场（褒/贬/有保留的推荐）与评价维度（如结构、表演、性价比），再列每个维度的论据；无论据的评价删掉",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "立场尽早出现；每个评价紧跟论据或引述原文；引述只服务论点，不整段抄原文",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：情节、台词、数据、价格是否与材料一致；引述是否保留了原意；评价是否偏离用户立场",
		},
	],
	context: {
		files: [
			{
				file: "quotes.md",
				title: "引述核对",
				description:
					"文稿中引述的原文（句子、台词、数据）在此登记与 sources/ 的对应关系；没有对应材料的引述必须删除",
				template: "# 引述核对\n\n<!-- 格式：- 「引述原文」→ sources/xxx.md：出处与说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"立场是否清楚且一致；是否把用户明确的评价冲淡成平衡论述或替用户改立场（meaning_drift）",
		"每个评价是否有论据支撑；有没有只有结论没有依据的断言（omission / other）",
		"情节、台词、数据、价格是否与材料一致；是否虚构情节或引述（unsourced_addition / consistency）",
		"引述原文是否来自材料并保留原意；是否把转述写成直接引语（unsourced_citation / meaning_drift，并核对 context/quotes.md）",
		"影评/剧评的关键情节是否按用户要求做了剧透提示；产品评论是否只谈感受不谈事实（omission / other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: true },
	tools: ["update_context"],
	completion: [
		"立场清楚且与用户要求一致，总体判断/论据/结论结构完整",
		"每个评价可追溯到 sources/ 的情节、台词、数据或参数",
		"引述原文与 context/quotes.md 一一对应，未改变原意",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
