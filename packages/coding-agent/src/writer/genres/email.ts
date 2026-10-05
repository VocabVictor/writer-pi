/**
 * email genre (mail & other practical writing) — EXPERIMENTAL, though this is the
 * fallback genre and the email path was exercised in the demo's /draft verification.
 */

import type { GenreConfig } from "./types.ts";

export const email: GenreConfig = {
	id: "email",
	name: "邮件与实用文本",
	experimental: true,
	description: "邮件、通知、申请等实用文本（实验性配置；邮件路径在 demo 中验证过）",
	requiredInputs: ["brief.md（对象、目的、语气）", "sources/（需要处理的事实）"],
	optionalInputs: ["locked.md"],
	creation: {
		allowed: "礼貌用语、结构安排、在用户立场内的措辞选择",
		requiresSource: "事实、日期、承诺、决定。不添加用户没有的承诺、解释或情绪",
	},
	stages: [
		{ id: "draft", title: "起草", guidance: "目的先行：第一段让读者知道要做什么；事实准确，语气与关系匹配" },
		{ id: "verify", title: "核对", guidance: "日期/时间/承诺是否与材料一致；有没有多余的道歉或解释" },
	],
	context: null,
	reviewFocus: [
		"事实（日期、时间、数字、承诺）是否与材料一致（unsourced_addition / meaning_drift）",
		"是否添加了用户没有的承诺、道歉或情绪强度（meaning_drift / unsourced_addition）",
		"是否有模糊表述代替用户明确表达的立场（omission）",
	],
	extraKinds: [],
	checks: { length: true, bannedWords: true, duplicates: "strict", locked: true, citations: false },
	tools: [],
	completion: ["目的清楚：读者知道发生了什么、需要做什么", "事实与承诺全部来自材料"],
	operations: ["draft", "continue", "revise"],
};

/** Fallback when neither the user, the brief, nor the material indicates a genre. */
export const fallbackGenreId = "email";
