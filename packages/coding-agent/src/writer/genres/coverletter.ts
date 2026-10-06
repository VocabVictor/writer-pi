/**
 * cover-letter genre: 求职信与个人陈述。Candidate facts come from sources/ and are
 * tracked in context/profile.md; the model may only phrase and order them.
 */

import type { GenreConfig } from "./types.ts";

export const coverLetter: GenreConfig = {
	id: "cover-letter",
	name: "求职信",
	experimental: true,
	description: "求职信、个人陈述、动机信（求职与申请场景）",
	requiredInputs: ["brief.md（岗位/项目、对象、目的）", "sources/（个人经历、成果数字、技能、材料事实）"],
	optionalInputs: ["context/profile.md（既定个人事实）", "voice/ 文风样本", "locked.md"],
	creation: {
		allowed:
			"结构与顺序（开场、动机、匹配论证、收束）、称谓与语气——正式度按目标语言的求职惯例（如中文敬称、英文称呼语与信件收束），标点与引号遵循目标语言书面惯例且全文一致；在事实范围内的措辞与强调",
		requiresSource:
			"个人事实：经历、职位、任职时间、数字成果、技能、奖项、机构名。不得虚构或拔高经历与数字；技能与岗位要求的对应必须与材料一致；不添加材料中没有的岗位理解或机构评价",
	},
	stages: [
		{
			id: "draft",
			title: "起草",
			guidance: "目的先行：开场让读者知道申请什么、为什么匹配；论证用事实与数字，不用形容词堆砌",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：经历、数字、时间线是否与 context/profile.md 一致；技能与岗位要求是否对应；有无虚构或拔高",
		},
	],
	context: {
		files: [
			{
				file: "profile.md",
				title: "既定个人事实",
				description:
					"可写的经历、任职时间、数字成果、技能与奖项清单及在 sources/ 中的出处；改稿后如有新事实补入，虚构的事实必须删除",
				template: "# 既定个人事实\n\n<!-- 格式：- 事实 → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"经历、职位、任职时间、数字成果是否与 context/profile.md 和 sources/ 一致（consistency / unsourced_addition）",
		"是否虚构经历、拔高成果或声称材料中没有的技能与奖项（unsourced_addition）",
		"对岗位/项目/机构的理解是否来自材料；是否添加材料中没有的赞美或评价（meaning_drift / unsourced_addition）",
		"动机与匹配论证是否具体：每个论断有事实支撑，不用空话（empty_elevation / formulaic_structure）",
	],
	extraKinds: ["task_incomplete", "consistency"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"申请对象与目的清楚：读者知道申请什么、为什么匹配",
		"每个经历与数字可追溯到 sources/，没有虚构或拔高",
		"结构与语气符合目标语言的求职惯例，没有材料以外的承诺",
	],
	operations: ["draft", "continue", "revise"],
};
