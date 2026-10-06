/**
 * fairy genre: 童话与寓言。面向儿童读者，重复句式（三段式反复）是修辞设计而非冗余，
 * 所以重复检测用 loose 而不是 strict；寓意收尾是结构要求，不是生硬说教。
 */

import type { GenreConfig } from "./types.ts";

export const fairy: GenreConfig = {
	id: "fairy",
	name: "童话寓言",
	experimental: true,
	description: "童话与寓言：面向儿童读者的故事，重复句式是修辞设计，寓意收尾",
	requiredInputs: ["sources/（故事梗概、已有情节或写作要求）"],
	optionalInputs: [
		"brief.md（目标年龄段、篇幅）",
		"voice/ 文风样本",
		"locked.md",
		"context/characters.md（已有角色设定）",
	],
	creation: {
		allowed:
			"在用户给定边界内创作角色、场景、情节与对话；重复句式（如中文的「三问三答」、英文的 run of three）按修辞设计展开与递进；语言难度跟随目标年龄段；标点与引号遵循目标语言书面惯例",
		requiresSource:
			"已经确立的事实：角色设定、已经发生的情节、故事边界。不得与 sources/ 和 context/ 冲突；结局与寓意落在给定材料的故事上，不另起炉灶",
	},
	stages: [
		{
			id: "draft",
			title: "起草/续写",
			guidance: "先读 context/ 角色与 sources/ 前文；重复句式逐次递进（场景升级），结尾点明寓意但不生硬说教",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"核对情节因果、角色行为是否符合设定、语言是否适合目标年龄段；重复句式是否保持设计（逐字复现或按设计递进）",
		},
	],
	context: {
		files: [
			{
				file: "characters.md",
				title: "角色设定",
				description: "角色的性格、能力与说话方式；续写后如有新角色或性格发展，更新此文件",
				template: "# 角色设定\n\n<!-- 每个角色一节：性格、能力、说话方式、已知信息 -->\n",
			},
		],
	},
	reviewFocus: [
		"角色行为是否符合 context/characters.md 的设定；情节因果是否成立（consistency）",
		"寓意是否由情节自然带出且不生硬说教；说教句是否喧宾夺主（formulaic_structure / other）",
		"重复句式是有意的修辞设计（三次反复等），不要按冗余重复报告（other）",
		"语言难度是否适合目标年龄段：句子短、词汇具体、不堆抽象大词（other）",
	],
	extraKinds: ["consistency", "task_incomplete"],
	checks: {
		length: false,
		bannedWords: true,
		// 重复句式是童话的修辞设计，loose 只拦整段复现，不拦反复句。
		duplicates: "loose",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 300 },
		// 文学类开指纹词检测（缓缓/微微等小说指纹），应用类不开。
		aitone: { enabled: true, threshold: 25, fingerprint: true },
	},
	// 长文（多章童话/系列寓言）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 3000,
		structure: [
			"每章一个事件循环：出发、考验、回归；一章内至少一次场景升级或信息变化",
			"重复句式承担结构：同一句式在三次反复中逐次升级（难度、数量、结果），第三次打破规律完成转折",
			"寓意收尾：结尾一两句由情节带出寓意，不再新增情节；续写多章时寓意与整篇呼应",
			"时空切换写清标记（时间、地点的变化），不让儿童读者在跳跃中迷失",
		],
		pacing: [
			"单段不超过 300 字；儿童读者的段落要短，对话多用直接引语",
			"重复段落之间保持相近长度与句式，第三次反复可以加长以制造转折",
			"新角色或新设定一章内只引入一组，不集中倾倒",
		],
		tracking: [
			"重复句式（口诀、咒语、反复台词）要么逐字复现，要么按设计逐次递进；中途改写会造成前后不一致",
			"埋下的伏笔（物件、承诺）记入 context/characters.md 并在结局前回收",
			"角色说话方式全篇一致：同一种口语习惯贯穿首尾",
		],
	},
	tools: ["update_context"],
	completion: [
		"故事与既有角色设定、情节一致",
		"寓意由情节自然带出并在结尾点明",
		"重复句式按设计复现或递进，语言适合目标年龄段",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
