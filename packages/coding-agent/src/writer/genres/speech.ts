/**
 * speech genre: speeches and talks. Spoken rhythm with anaphora and refrains — rhetorical
 * repetition is a design choice, so the duplicate check runs loose; facts still need sources.
 */

import type { GenreConfig } from "./types.ts";

export const speech: GenreConfig = {
	id: "speech",
	name: "演讲稿",
	experimental: true,
	description: "演讲稿、发言稿、致辞、路演（开场/主体/收尾，口语节奏）",
	requiredInputs: ["brief.md（场合、听众、时长、目的）", "sources/（事实、故事、数据、承诺）"],
	optionalInputs: ["voice/ 口语样本", "locked.md"],
	creation: {
		allowed:
			"口语节奏、排比与反复（修辞性重复是设计）、开场与收尾方式、称呼语与停顿安排；标点与语气词遵循目标语言的口语书面惯例（如英文的破折号停顿、中文的语气词），全文一致",
		requiresSource:
			"一切事实：数据、日期、承诺、人名、机构、他人观点。不得编造故事、数据或承诺；排比、呼告、口号可以是创作，但其中的事实句必须可追溯；听众立场不得被替用户改变",
	},
	stages: [
		{
			id: "outline",
			title: "定目的与三段结构",
			guidance: "先定场合、听众与一个核心信息，再列开场（抓注意力）/主体（要点+故事或数据）/收尾（总结或行动号召）",
		},
		{
			id: "draft",
			title: "起草",
			guidance:
				"写「说出来」的句子：短句、有节奏、能换气；每个要点挂一个故事、例子或数据；核心信息至少在开场和收尾各出现一次",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"朗读一遍：句子是否能一口气念完、节奏是否起伏；核对数据、日期、承诺与材料一致；行动号召是否与 brief 的目的一致",
		},
	],
	context: null,
	reviewFocus: [
		"句子是否过长、是否写成书面腔导致念不出来（other）",
		"开场是否抓住听众、核心信息是否清楚；收尾是否有总结或行动号召（task_incomplete / other）",
		"数据、日期、承诺、人名是否与材料一致（unsourced_addition / meaning_drift）",
		"排比与反复是修辞选择：只有当重复明显偏离节奏或信息量时才报告（other）",
		"称呼语与语气是否符合场合与听众；是否替用户加了没有的承诺或情绪强度（meaning_drift / unsourced_addition）",
	],
	extraKinds: ["task_incomplete"],
	checks: { length: true, bannedWords: true, duplicates: "loose", locked: true, citations: false },
	tools: [],
	completion: [
		"开场/主体/收尾结构完整，核心信息清楚且与 brief 的目的一致",
		"句子口语可念，节奏与停顿安排合理",
		"事实、数据与承诺全部来自材料；时长与字数口径匹配（如 brief 有要求）",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
