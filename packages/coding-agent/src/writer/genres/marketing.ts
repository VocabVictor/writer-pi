/**
 * marketing genre: content marketing articles (brand story, seeded posts, case write-ups).
 * Distinct from ecommerce, which owns product copy (detail pages, live-selling scripts);
 * marketing writes articles for a channel, so the selling-point structure carries a CTA.
 */

import type { GenreConfig } from "./types.ts";

export const marketing: GenreConfig = {
	id: "marketing",
	name: "内容营销",
	experimental: true,
	description: "营销软文与内容营销文章：品牌故事、种草文、案例稿（商品详情页与直播话术归 ecommerce）",
	requiredInputs: ["brief.md（品牌/产品、目标人群、渠道、目标）", "sources/（产品事实、用户反馈、案例、数据、价格）"],
	optionalInputs: ["context/compliance.md（广告法与平台红线）", "locked.md"],
	creation: {
		allowed:
			"卖点结构与排序（钩子/痛点/方案/证明/行动号召）、标题与钩子写法、故事化包装与场景描写；标点、引号与感叹号遵循目标语言书面惯例且全文一致",
		requiresSource:
			"一切事实：产品参数、成分、功效、数据、用户评价、案例、价格、资质。不得编造功效、数据、评价或案例；最高级与绝对化表述（如中文的「最」「第一」、英文 best/only）必须有材料依据；广告法与平台禁用词（context/compliance.md）不得触碰",
	},
	stages: [
		{
			id: "outline",
			title: "定卖点结构",
			guidance: "先定渠道与目标人群，再列卖点结构与每个卖点对应的事实依据；无依据的卖点删掉",
		},
		{
			id: "draft",
			title: "起草",
			guidance:
				"按钩子/痛点/方案/证明/行动号召的结构起草；每个卖点紧跟参数、评价或案例；行动号召与 brief 的目标（拉新/转化/传播）一致",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"逐条核对：功效、数据、评价、案例、价格是否与材料一致；最高级与绝对化表述是否有依据；是否触碰合规红线",
		},
	],
	context: {
		files: [
			{
				file: "compliance.md",
				title: "合规红线",
				description: "广告法与平台对禁用词、功效宣称、价格与数据表述的限制；改稿后如有新红线补入此文件",
				template: "# 合规红线\n\n<!-- 格式：- 红线 → 适用范围与出处；起草前读取 -->\n",
			},
		],
	},
	reviewFocus: [
		"产品参数、功效、数据、评价、案例、价格是否与材料一致；是否编造功效、数据或案例（unsourced_addition / consistency）",
		"最高级与绝对化表述（如中文的「最」「第一」、英文 best/only）是否有材料依据；对比数据是否注明条件（meaning_drift / unsourced_addition）",
		"卖点是否与目标人群和渠道对应；行动号召是否清楚且与 brief 的目标一致（task_incomplete / other）",
		"是否触碰广告法与平台合规红线（context/compliance.md）（consistency / other）",
		"文章是否读起来像硬广告或说明书；该有的场景感与感染力是否缺失（other）",
	],
	extraKinds: ["task_incomplete"],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"卖点结构完整，每个卖点可追溯到 sources/ 的事实依据，或已删除",
		"行动号召清楚且与 brief 声明的目标一致",
		"没有材料以外的功效、数据、评价或案例宣称；合规红线未被触碰",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
