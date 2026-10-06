/**
 * fiction genre: novels and stories. Verified in this demo on the
 * "continue a story from given material while keeping setup and POV" path.
 */

import type { GenreConfig } from "./types.ts";

export const fiction: GenreConfig = {
	id: "fiction",
	name: "小说写作",
	description: "小说与故事（短篇/长篇均可；长篇的章节管理是后续扩展）",
	requiredInputs: ["sources/（前文、故事梗概或写作要求）"],
	optionalInputs: ["context/characters.md 等设定文件", "brief.md", "voice/ 文风样本", "locked.md"],
	creation: {
		allowed:
			"在用户给定边界内创作人物、场景、情节、对话与细节；续写时可以发展故事、引入新的事件——「保留原意」不等于禁止发展故事",
		requiresSource:
			"已经确立的事实：人物设定、时间线、叙述视角、已经发生的事件。不得与 sources/ 和 context/ 冲突；重大设定变化（人物性格转折、时间线跳跃、视角切换）必须明确标出并更新 context/ 文件",
	},
	stages: [
		{
			id: "draft",
			title: "起草/续写",
			guidance: "续写前先读 context/ 设定与 sources/ 前文；写作时保持视角与时间线一致",
		},
		{
			id: "verify",
			title: "核对",
			guidance: "核对人物行为是否符合设定、情节因果是否成立、时间与视角是否连续；更新 context/ 中已经发生的事件",
		},
	],
	context: {
		files: [
			{
				file: "characters.md",
				title: "人物设定",
				description: "人物的性格、关系、说话方式；续写后如有新人物或性格发展，更新此文件",
				template: "# 人物设定\n\n<!-- 每个人物一节：性格、与他人关系、说话方式、已知信息 -->\n",
			},
			{
				file: "timeline.md",
				title: "时间线",
				description: "故事内的时间顺序；续写后补充新发生的事件及其时间位置",
				template: "# 时间线\n\n<!-- 按故事内时间顺序列事件 -->\n",
			},
			{
				file: "perspective.md",
				title: "叙述视角",
				description: "当前视角人物、人称与时态；中途换视角需要用户明确要求",
				template: "# 叙述视角\n\n<!-- 视角人物、人称（第一/第三）、时态 -->\n",
			},
			{
				file: "events.md",
				title: "已经发生的事件",
				description: "剧情事实清单；写新内容前先读，写完后把新事件补进来",
				template: "# 已经发生的事件\n\n<!-- 编号列出已发生的剧情事实，避免续写时自相矛盾 -->\n",
			},
		],
	},
	reviewFocus: [
		"人物行为是否符合 context/characters.md 的设定；性格是否无故转变（consistency）",
		"情节因果是否成立：事件的发生有没有铺垫或解释（consistency）",
		"时间线是否连续、有没有与 context/timeline.md 矛盾；叙述视角是否保持一致（consistency）",
		"是否与 context/events.md 中已经发生的事实冲突（consistency / unsourced_addition）",
		"续写是否尊重既有设定；重大设定变化是否被明确标出（consistency）",
	],
	extraKinds: ["consistency", "task_incomplete"],
	checks: { length: false, bannedWords: true, duplicates: "off", locked: true, citations: false },
	tools: ["update_context"],
	completion: [
		"续写/起草部分与既有设定、时间线、视角一致",
		"新事件已登记到 context/events.md 与 context/timeline.md",
		"用户要求的情节推进（如某场景、某冲突）已完成",
	],
	operations: ["draft", "continue", "outline", "revise"],
};
