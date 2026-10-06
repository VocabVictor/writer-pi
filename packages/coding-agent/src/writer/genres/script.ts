/**
 * script genre: screenplays and stage plays. Scene heading / dialogue / stage-direction
 * formatting is language-dependent (INT./EXT., 内景/外景, caps or bold names), so the rules
 * require per-language script conventions; repeated short directions and speaker names are
 * normal, so duplicates run loose.
 */

import type { GenreConfig } from "./types.ts";

export const script: GenreConfig = {
	id: "script",
	name: "剧本",
	experimental: true,
	description: "剧本与短剧：场景标题、对白、舞台指示（格式按目标语言的剧本惯例）",
	requiredInputs: ["sources/（前文、故事梗概或写作要求）"],
	optionalInputs: ["context/characters.md 人物设定", "brief.md（场景与目的）", "locked.md"],
	creation: {
		allowed:
			"场景标题与转场的写法、舞台指示的详略、对白的语气与潜台词、镜头与调度描述；格式遵循目标语言的剧本惯例（如英文的 INT./EXT. 场景标题与人名大写、中文的内景/外景），不假设单一语言格式且全文一致",
		requiresSource:
			"已经确立的事实：人物设定、人物关系、时间线、已经发生的事件、场景衔接。不得与 sources/ 和 context/ 冲突；重大设定变化（人物转折、时间线跳跃）必须明确标出并更新 context/ 文件",
	},
	stages: [
		{
			id: "draft",
			title: "起草/续写",
			guidance:
				"起草前先读 context/ 设定与 sources/ 前文；对白只写「说出来」的话，背景与动作用舞台指示，不要写成小说式叙述",
		},
		{
			id: "verify",
			title: "核对",
			guidance:
				"核对格式是否全文一致（场景标题/对白/舞台指示三要素齐全）、人物行为是否符合设定、对白是否可念、场景衔接是否连续",
		},
	],
	context: {
		files: [
			{
				file: "characters.md",
				title: "人物设定",
				description: "人物的性格、关系、说话方式与在场场景；续写后如有新人物或性格发展，更新此文件",
				template: "# 人物设定\n\n<!-- 每个人物一节：性格、与他人关系、说话方式、已知信息 -->\n",
			},
		],
	},
	reviewFocus: [
		"格式是否符合剧本惯例且全文一致：场景标题、人物名、对白与舞台指示是否三要素齐全、层次清楚（formulaic_structure / other）",
		"是否把小说式叙述混进对白或舞台指示；对白是否直接交代情绪而不是靠潜台词（other）",
		"人物行为与说话方式是否符合 context/characters.md 的设定（consistency）",
		"场景衔接与时间线是否连续；是否与已经发生的事件冲突（consistency）",
		"重复的人物名与简短舞台指示是格式需要，不要按冗余重复报告（other）",
	],
	extraKinds: ["consistency", "task_incomplete"],
	checks: { length: false, bannedWords: true, duplicates: "loose", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"场景/对白/舞台指示格式符合目标语言的剧本惯例且全文一致",
		"人物行为与说话方式与 context/characters.md 一致",
		"用户要求的场景推进已完成，场景衔接连续",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
