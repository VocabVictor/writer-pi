/**
 * blog genre: blog posts and opinion pieces. Verified in this demo on the
 * "draft an opinion post from a claim plus supporting material" path.
 */

import type { GenreConfig } from "./types.ts";

export const blog: GenreConfig = {
	id: "blog",
	name: "博客写作",
	description: "博客文章与观点文",
	requiredInputs: ["brief.md（读者、中心观点）", "sources/（论据、例子、事实）"],
	optionalInputs: ["voice/ 文风样本", "locked.md"],
	creation: {
		allowed: "结构安排、开场与收束方式、观点的表述与强调力度（在用户立场范围内）、过渡句",
		requiresSource:
			"具体事例、数字、引用、他人的话。不擅自增加个人经历、读者来信、数据或引用；不把用户没有的观点安到作者头上",
	},
	stages: [
		{ id: "outline", title: "提纲", guidance: "先明确中心观点与目标读者，再列支撑点；删掉与观点无关的" },
		{ id: "draft", title: "起草", guidance: "观点尽早出现；例子只服务观点；一个意思只说一遍" },
		{ id: "verify", title: "核对", guidance: "问自己：读者看完能复述中心观点吗？每个例子都支撑观点吗？" },
	],
	context: null,
	reviewFocus: [
		"中心观点是否清楚、尽早出现；论证是否清楚（task_incomplete / other）",
		"每个例子是否真的支撑观点；有没有跑题的素材（omission / other）",
		"是否重复解释同一个意思（over_explanation）",
		"是否把明确的观点冲淡成两边各打五十大板的平衡论述（meaning_drift）",
		"是否擅自增加个人经历、数据或引用（unsourced_addition）",
	],
	extraKinds: ["task_incomplete"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: [],
	completion: [
		"中心观点清楚且与用户要求一致",
		"所有例子都支撑观点，没有为凑字数的旁枝",
		"同一个意思没有反复解释",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
