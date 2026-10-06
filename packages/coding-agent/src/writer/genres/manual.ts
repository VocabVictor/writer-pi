/**
 * manual genre: 产品说明书。面向最终用户（tech-docs 面向开发者：API 签名与参数表），
 * 步骤化、安全警示独立成块；重复的警示与固定句式是文档常态（duplicates: loose）。
 */

import type { GenreConfig } from "./types.ts";

export const manual: GenreConfig = {
	id: "manual",
	name: "产品说明书",
	experimental: true,
	description: "产品说明书：面向最终用户的安装、使用与保养说明，步骤化、安全警示",
	requiredInputs: ["brief.md（产品、读者）", "sources/（产品规格、操作流程、参数、警示与合规要求）"],
	optionalInputs: ["context/safety.md（安全警示与合规要求）", "locked.md"],
	creation: {
		allowed:
			"步骤的组织与编号、措辞、面向最终用户的语言难度、标点与引号遵循目标语言书面惯例；某步材料不足时写占位说明或【待补：…】，不编造行为",
		requiresSource:
			"一切事实：操作步骤、参数、规格、故障原因、维护周期、安全警示、合规要求。不得编造步骤、参数或行为；安全警示必须与材料一致且不得弱化（「必须」「严禁」等不得删改）",
	},
	stages: [
		{
			id: "outline",
			title: "定步骤与读者路径",
			guidance: "先定读者路径（安装/日常使用/故障排除/保养）与步骤清单；每步标注对应材料；安全警示单独列出",
		},
		{
			id: "draft",
			title: "起草",
			guidance:
				"按步骤起草：每步一个动作、写清预期结果；安全警示独立成块放在相关步骤之前；语言面向最终用户，不假设专业知识",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"逐步核对：步骤是否按序可执行、参数与行为是否与材料一致、安全警示是否齐全且未被弱化；无法核实的标记【待核】",
		},
	],
	context: {
		files: [
			{
				file: "safety.md",
				title: "安全警示与合规",
				description: "安全警示、禁用情形与合规要求在此登记并标注 sources/ 出处；新增警示后补入此文件",
				template: "# 安全警示与合规\n\n<!-- 格式：- 警示/合规要求 → 适用步骤 → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"步骤是否完整且按序可执行：每步一个动作、预期结果齐全（task_incomplete / other）",
		"参数、规格、维护周期、故障原因是否与 sources/ 一致（unsourced_addition / consistency）",
		"安全警示是否齐全、位置是否在相关步骤之前、是否被弱化或删除（omission / meaning_drift，并核对 context/safety.md）",
		"语言是否面向最终用户：不假设专业知识，不把开发者术语留给读者（over_explanation / other）",
		"重复的警示与固定句式是说明书常态，不要按冗余重复报告（other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: {
		// 完整性优先于字数：说明书以步骤齐全为准。
		length: false,
		bannedWords: true,
		// 重复的警示与固定句式是文档常态，loose 只拦整段复现。
		duplicates: "loose",
		locked: true,
		citations: false,
		longForm: { enabled: true, maxParagraphChars: 300 },
		// 说明书语域平实但固定句式多，阈值抬高避免误报。
		aitone: { enabled: true, threshold: 60 },
	},
	// 长文（成套说明书/多产品手册）：规则文本与 checks.longForm.maxParagraphChars 保持一致。
	longForm: {
		threshold: 2500,
		structure: [
			"按读者路径分章：安装 → 日常使用 → 故障排除 → 保养；每章开头一句说明本章覆盖什么",
			"每步一个动作：步骤写清动作、对象、预期结果；一个步骤不承担两个动作",
			"安全警示独立成块放在相关步骤之前，不埋进步骤正文",
			"故障排除按「现象 → 可能原因 → 处理办法」成组，组内不混入其他现象",
		],
		pacing: [
			"单段不超过 300 字；操作内容用编号步骤，不写成叙述大段",
			"步骤之间的说明句保持一两句，不插入与操作无关的背景",
			"参数与规格用列表或表格逐项写，不在段落里罗列",
		],
		tracking: [
			"安全警示登记进 context/safety.md；同一警示全篇用同一措辞与强度",
			"同一部件全篇用同一个名称：首次出现给出全称后固定，不交替使用简称",
			"残留的【待补：…】标记要么补齐，要么在交付说明中列明缺口",
		],
	},
	tools: ["update_context"],
	completion: [
		"步骤完整、按序可执行，预期结果齐全",
		"安全警示齐全、位置正确且未被弱化",
		"参数、规格、维护周期可追溯到 sources/，或已删除/标记【待核】",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
