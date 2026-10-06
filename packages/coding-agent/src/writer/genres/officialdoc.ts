/**
 * official-doc genre: 公文（通知、请示、函等）。English memos and notices run through the
 * same structure; format conventions come from context/format.md instead of being hardcoded.
 */

import type { GenreConfig } from "./types.ts";

export const officialDoc: GenreConfig = {
	id: "official-doc",
	name: "公文写作",
	experimental: true,
	description: "公文：通知、请示、函、批复（中文公文与英文 memo/notice 通用）",
	requiredInputs: ["brief.md（事项、发文对象、目的）", "sources/（事实：日期、时限、人名、机构、依据文件）"],
	optionalInputs: ["context/format.md（单位既定行文格式）", "locked.md"],
	creation: {
		allowed:
			"结构要素的安排（标题、称谓/抬头、正文分层：缘由/事项/要求、落款、成文日期）、开头与结尾套语的选择——套语按目标语言的公文惯例（如中文的「特此通知」、英文 memo 的行动句结尾）；标点、引号与日期数字写法遵循目标语言书面惯例且全文一致；材料不足时列出待补事项并用【待补：…】标记",
		requiresSource:
			"一切事实：事项内容、日期、时限、人名、机构名、数字、依据文件。不得编造文号、签发人、日期、机构或审批意见；依据文件与引用条文必须来自材料；事项范围、时限与执行要求不得扩大或缩小",
	},
	stages: [
		{
			id: "outline",
			title: "拟框架",
			guidance:
				"先定文种（通知/请示/函）与结构要素：标题、称谓、正文分层（缘由/事项/要求）、落款；每层标注对应的事实",
		},
		{
			id: "draft",
			title: "起草",
			guidance:
				"按框架起草；事项逐条写清，要求与时限具体；语气与文种匹配——请示用报请商请、函用平行商洽、通知用执行要求",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐项核对：日期、时限、人名、机构、文号是否与材料一致且未虚构；格式要素是否齐全；语气是否与文种一致",
		},
	],
	context: {
		files: [
			{
				file: "format.md",
				title: "行文格式约定",
				description:
					"单位既定的称谓、落款、成文日期与文号写法；不同语言的公文按对应惯例在此记录，改稿后如有变化更新此文件",
				template: "# 行文格式约定\n\n<!-- 格式：称谓、落款、日期与文号的写法；按目标语言的公文惯例记录 -->\n",
			},
		],
	},
	reviewFocus: [
		"事实（日期、时限、人名、机构、数字、依据文件）是否与材料一致；文号、签发人、审批意见是否为材料中没有的虚构（unsourced_addition / consistency）",
		"事项范围、时限或执行要求是否被扩大、缩小或改写（meaning_drift / omission）",
		"格式要素是否齐全：标题、称谓/抬头、正文、落款、成文日期（task_incomplete / other）",
		"语气是否与文种匹配：请示报请、函平行、通知执行；无情绪化或口语化表述（formulaic_structure / other）",
	],
	extraKinds: ["task_incomplete", "consistency"],
	checks: { length: false, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"文种与 brief 事项一致，结构要素齐全（标题、称谓、正文、落款、成文日期）",
		"每个事实（日期、时限、人名、机构、依据）可追溯到 sources/ 或标记【待补】",
		"语气与文种匹配，没有材料以外的承诺、要求或解释",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
