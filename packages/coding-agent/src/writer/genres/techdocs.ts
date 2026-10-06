/**
 * tech-docs genre: API references and tutorials. Stepwise, executable, accurate: every
 * parameter, return value and error code must come from sources/; the citation check stays
 * off because bracketed step numbers like [2] are prose, not citations.
 */

import type { GenreConfig } from "./types.ts";

export const techDocs: GenreConfig = {
	id: "tech-docs",
	name: "技术文档",
	experimental: true,
	description: "API 文档、教程、使用手册（步骤化、准确、可执行）",
	requiredInputs: [
		"brief.md（读者、范围）",
		"sources/（API 签名、参数与类型、默认值、返回值、错误码、版本、代码示例）",
	],
	optionalInputs: ["context/api.md（已核对的 API 与参数）", "context/links.md（已核对的链接）", "locked.md"],
	creation: {
		allowed:
			"步骤的组织与编号、说明措辞、示例的组织与拆分；某步材料不足时写占位说明或【待补：…】，不编造行为；说明文字的标点与引号遵循目标语言书面惯例，代码块内跟随示例本身的代码语言",
		requiresSource:
			"一切技术事实：API 签名、参数名与类型、默认值、返回值、错误码、版本号、命令、前置条件、链接。不得编造参数、返回值、行为或版本；代码示例必须与 sources/ 一致；版本差异必须注明适用版本",
	},
	stages: [
		{
			id: "outline",
			title: "定步骤与读者路径",
			guidance: "先定读者路径（从零上手/查 API/排错）与步骤清单；每步标注对应的材料；删掉与范围无关的旁枝",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按步骤起草：前置条件在前、每步一个动作并给出可复制的命令或代码；参数表逐项写类型与默认值",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"逐步核对：步骤是否按序可执行、参数/返回值/错误码是否与材料一致、版本差异是否注明；无法核实的标记【待核】",
		},
	],
	context: {
		files: [
			{
				file: "api.md",
				title: "API 与参数核对",
				description:
					"文中出现的 API、参数、返回值与错误码在此登记并标注 sources/ 出处；无法核实的条目必须删除或标记【待核】",
				template: "# API 与参数核对\n\n<!-- 格式：- <API/参数/返回值> → sources/xxx.md：说明 -->\n",
			},
			{
				file: "links.md",
				title: "链接核对",
				description: "文档中的链接与版本号在此登记并核对；无法核实的链接必须删除",
				template: "# 链接核对\n\n<!-- 格式：- <链接/版本> → 说明与核对状态 -->\n",
			},
		],
	},
	reviewFocus: [
		"步骤是否完整且按序可执行：前置条件、每步动作、预期结果是否齐全（task_incomplete / other）",
		"API 签名、参数、类型、默认值、返回值、错误码是否与 sources/ 一致（unsourced_addition / consistency，并核对 context/api.md）",
		"版本差异是否注明适用版本；链接与版本号是否为材料中没有的虚构（unsourced_citation / consistency，并核对 context/links.md）",
		"是否漏掉读者会踩的前置条件或环境要求（omission）",
		"重复的命令行与代码块是文档常态，不要按冗余重复报告（other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: { length: false, bannedWords: true, duplicates: "loose", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"步骤完整、按序可执行，前置条件与预期结果齐全",
		"API、参数、返回值、错误码可追溯到 sources/，或已删除/标记【待核】",
		"版本差异与链接已核对，没有虚构条目",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
