/**
 * github-readme genre: README for open-source projects. Section skeleton plus real code
 * blocks; command, link and version facts must come from sources/, not from the model.
 */

import type { GenreConfig } from "./types.ts";

export const githubReadme: GenreConfig = {
	id: "github-readme",
	name: "开源 README",
	experimental: true,
	description: "开源项目 README：简介、安装、用法、贡献、许可（README 语言不限，英文为主）",
	requiredInputs: ["brief.md（项目定位、目标读者）", "sources/（项目事实：命令、配置、代码示例、许可证、链接）"],
	optionalInputs: ["context/commands.md（已核对的命令与用法）", "context/links.md（已核对的链接与徽章）", "locked.md"],
	creation: {
		allowed:
			"章节结构与顺序（简介/安装/用法/贡献/许可，按项目实际取舍）、章节标题与说明的措辞、代码示例的组织；说明文字的标点与引号遵循 README 目标语言的书面惯例；某节材料不足时写占位说明或【待补：…】，不编造内容",
		requiresSource:
			"项目事实：命令、flag、配置项、API 签名、版本号、许可证、仓库链接、徽章、贡献规范。不得编造命令、选项、版本、链接或贡献者；代码示例必须与 sources/ 中真实用法一致",
	},
	stages: [
		{
			id: "outline",
			title: "列章节骨架",
			guidance: "先列章节骨架（简介/安装/用法/贡献/许可）与每节对应的材料；目标读者决定详略，删掉与上手无关的旁枝",
		},
		{
			id: "draft",
			title: "起草",
			guidance: "按骨架起草；代码块只写真实命令与输出并注明运行环境；从安装到用法到贡献的顺序以新用户能跑起来为准",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"逐条核对：命令与 flag 是否真实可运行、链接与版本号是否存在、代码示例是否与 sources/ 一致；无法核实的标记【待核】",
		},
	],
	context: {
		files: [
			{
				file: "commands.md",
				title: "命令与用法核对",
				description:
					"README 中出现的命令、flag、配置项与代码示例在此登记，并标注在 sources/ 中的出处；无法核实的命令必须删除或标记【待核】",
				template: "# 命令与用法核对\n\n<!-- 格式：- <命令/flag> → sources/xxx.md：说明 -->\n",
			},
			{
				file: "links.md",
				title: "链接与徽章核对",
				description: "README 中的链接、徽章、版本号与许可证在此登记并核对；无法核实的链接必须删除",
				template: "# 链接与徽章核对\n\n<!-- 格式：- <链接/徽章> → 说明与核对状态 -->\n",
			},
		],
	},
	reviewFocus: [
		"命令、flag、配置项、代码示例是否真实且与 sources/ 一致（unsourced_addition / consistency，并核对 context/commands.md）",
		"链接、徽章、版本号、许可证是否为材料中没有的虚构（unsourced_citation，并核对 context/links.md）",
		"简介是否夸大项目能力或堆砌形容词（empty_elevation / meaning_drift）",
		"章节是否齐全：简介/安装/用法/贡献/许可；目标读者能否按 README 跑起来（task_incomplete / other）",
	],
	extraKinds: ["unsourced_citation", "task_incomplete"],
	checks: { length: false, bannedWords: true, duplicates: "loose", locked: true, citations: true },
	tools: ["update_context"],
	completion: [
		"章节齐全且与 brief 声明的目标读者匹配（简介/安装/用法/贡献/许可，按项目实际取舍）",
		"每个命令、链接、版本号、许可证可追溯到 sources/ 或已删除",
		"代码示例可直接运行，与真实用法一致",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
