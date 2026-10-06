/**
 * cs-blog genre: technical blog posts for developer readers. Distinct from the general blog:
 * code, command and version facts must come from sources/, and before/after code comparisons
 * are deliberate repetition, so the duplicate check runs loose instead of strict.
 */

import type { GenreConfig } from "./types.ts";

export const csBlog: GenreConfig = {
	id: "cs-blog",
	name: "技术博客",
	experimental: true,
	description: "面向开发者的技术博客：原理讲解、实践踩坑、复盘（与 blog 的区别在读者与代码密度）",
	requiredInputs: ["brief.md（读者、要解决的问题或中心观点）", "sources/（代码、命令、版本号、报错信息、性能数据）"],
	optionalInputs: ["context/snippets.md（已核对的代码与命令）", "locked.md"],
	creation: {
		allowed:
			"结构安排、开场与收束、观点表述与强调力度、类比与代码示例的组织；说明文字的标点与引号遵循目标语言书面惯例，代码块内的注释与输出跟随示例本身的代码语言",
		requiresSource:
			"具体代码、命令、版本号、API 签名、报错信息、性能数字、他人结论。不得编造代码的可运行性、性能数据或版本号；代码示例必须与 sources/ 一致并注明运行环境；「在我的环境下」的结论不得写成普适结论",
	},
	stages: [
		{
			id: "outline",
			title: "定问题与读者",
			guidance: "先定读者水平与要解决的问题，再列支撑点（原理/代码/数据）；删掉与问题无关的旁枝",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "问题尽早出现；每段代码只服务一个点并注明运行环境；结论跟在代码与数据之后，而不是先给结论再找代码",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"逐条核对：代码与命令是否真实可运行、版本与性能数字是否与材料一致、术语拼写是否一致；改写前后的对比代码是否只改了差异处",
		},
	],
	context: {
		files: [
			{
				file: "snippets.md",
				title: "代码与命令核对",
				description:
					"文中出现的代码块、命令与版本号在此登记并标注 sources/ 出处；无法核实的命令必须删除或标记【待核】",
				template: "# 代码与命令核对\n\n<!-- 格式：- <代码/命令/版本> → sources/xxx.md：说明 -->\n",
			},
		],
	},
	reviewFocus: [
		"代码、命令、版本号、报错信息是否与 sources/ 一致；是否编造了可运行性或性能数据（unsourced_addition / consistency，并核对 context/snippets.md）",
		"要解决的问题是否清楚、尽早出现；每段代码是否真的支撑论点（task_incomplete / other）",
		"是否把特定环境下的结论写成普适结论；版本差异是否注明（meaning_drift / omission）",
		"框架、库与 API 名称的拼写、大小写是否全文一致（consistency）",
		"改写前后对比的代码重复是结构需要，不要按冗余重复报告（other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete", "consistency"],
	checks: { length: true, bannedWords: true, duplicates: "loose", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"中心观点清楚，开发者读者能按文复现关键步骤",
		"代码与命令可追溯到 sources/ 并注明运行环境，或已删除",
		"版本依赖与性能数字与材料一致，没有夸大",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
