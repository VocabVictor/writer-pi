/**
 * ecommerce genre: 电商文案。商品详情页、推广文案、直播话术 share one config; each
 * subtype's structure is fixed in the outline stage, the way academic treats 综述/论文.
 */

import type { GenreConfig } from "./types.ts";

export const ecommerce: GenreConfig = {
	id: "ecommerce",
	name: "电商文案",
	experimental: true,
	description: "电商文案：商品详情页、推广文案、直播话术（子体裁可作为后续拆分扩展）",
	requiredInputs: ["brief.md（商品、平台、目标人群、卖点）", "sources/（参数、价格、活动、评价、资质）"],
	optionalInputs: ["context/compliance.md（平台与行业的合规红线）", "locked.md"],
	creation: {
		allowed:
			"子类结构（商品详情页：钩子/卖点/参数/信任；推广文案：钩子/痛点/转化；直播话术：开场/讲解/互动/逼单）、书面或口语语气与平台惯例、卖点排序与强调力度；标点、引号与感叹号遵循目标语言书面惯例且全文一致",
		requiresSource:
			"一切事实：参数、成分、材质、功效、价格、优惠、赠品、销量、评价、资质、认证。不得编造功效、销量、评价、价格或资质；最高级与绝对化表述（如中文的「最」「第一」、英文的 best/only）必须有材料依据；对比数据必须来自材料并注明条件",
	},
	stages: [
		{
			id: "outline",
			title: "定子类与卖点",
			guidance: "先确定子类（商品详情页/推广文案/直播话术）与目标人群，再列卖点及对应的事实依据；无依据的卖点删掉",
		},
		{
			id: "draft",
			title: "起草",
			guidance:
				"按子类结构与平台惯例起草；每个卖点紧跟参数、评价或资质；语气与子类匹配（详情页书面、直播话术口语可执行）",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "逐条核对：参数/价格/销量/评价/资质是否与材料一致；最高级与绝对化表述是否有依据；是否触碰合规红线",
		},
	],
	context: {
		files: [
			{
				file: "compliance.md",
				title: "合规红线",
				description: "平台与行业对禁用词、功效宣称、价格与销量表述的限制；改稿后如有新红线补入此文件",
				template: "# 合规红线\n\n<!-- 格式：- 红线 → 适用范围与出处；起草前读取 -->\n",
			},
		],
	},
	reviewFocus: [
		"参数、成分、功效、价格、优惠、销量、评价、资质是否与材料一致；是否编造功效或数据（unsourced_addition / consistency）",
		"最高级与绝对化表述（如中文的「最」「第一」、英文的 best/only）是否有材料依据；对比数据是否注明条件（meaning_drift / unsourced_addition）",
		"卖点是否与目标人群对应；无依据的卖点是否被删掉而不是硬凑（omission / other）",
		"语气与子类是否匹配：详情页书面、直播话术口语；标点与感叹号是否符合平台惯例且全文一致（formulaic_structure / other）",
	],
	extraKinds: ["task_incomplete"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"子类明确，结构与该子类的惯例一致（详情页/推广文案/直播话术各有自己的节奏）",
		"每个卖点可追溯到 sources/ 的参数、评价或资质，或已删除",
		"没有材料以外的功效、销量、价格或资质宣称；合规红线未被触碰",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
