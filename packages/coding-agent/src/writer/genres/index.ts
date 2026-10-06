/**
 * Genre registry and inference. 注册表 + 维度推断：
 * 显式指定 > brief.md 声明 > 材料/要求线索 > 上次使用的体裁 > 兜底（email）。
 * 只有并列歧义且会显著影响结果时才建议询问（推断器返回 candidates）。
 */

import { abstract } from "./abstract.ts";
import { academic } from "./academic.ts";
import { blog } from "./blog.ts";
import { coverLetter } from "./coverletter.ts";
import { critique } from "./critique.ts";
import { csBlog } from "./csblog.ts";
import { ecommerce } from "./ecommerce.ts";
import { email, fallbackGenreId } from "./email.ts";
import { diary, essay } from "./essaydiary.ts";
import { fairy } from "./fairy.ts";
import { fiction } from "./fiction.ts";
import { githubReadme } from "./githubreadme.ts";
import { interview } from "./interview.ts";
import { manual } from "./manual.ts";
import { marketing } from "./marketing.ts";
import { microcopy } from "./microcopy.ts";
import { minutes } from "./minutes.ts";
import { news } from "./news.ts";
import { officialDoc } from "./officialdoc.ts";
import { poetry } from "./poetry.ts";
import { popsci } from "./popsci.ts";
import { script } from "./script.ts";
import { speech } from "./speech.ts";
import { techDocs } from "./techdocs.ts";
import type { GenreConfig } from "./types.ts";
import { workreport } from "./workreport.ts";

export const GENRES: GenreConfig[] = [
	academic,
	blog,
	fiction,
	poetry,
	essay,
	diary,
	email,
	officialDoc,
	ecommerce,
	githubReadme,
	coverLetter,
	news,
	// -- 文学/内容类体裁 -------------------------------------------------------
	csBlog,
	critique,
	speech,
	script,
	marketing,
	techDocs,
	// -- 应用/内容体裁（第二批） -----------------------------------------------
	fairy,
	microcopy,
	minutes,
	abstract,
	manual,
	interview,
	popsci,
	workreport,
];

const byId = new Map(GENRES.map((g) => [g.id, g]));

export function getGenre(id: string | null | undefined): GenreConfig | undefined {
	return id ? byId.get(id) : undefined;
}

export function getGenreOrFallback(id: string | null | undefined): GenreConfig {
	return getGenre(id) ?? byId.get(fallbackGenreId)!;
}

export { fallbackGenreId };

/**
 * Keyword clues for inference. 强体裁词（体裁名本身，如"散文/小说/纪要"）单次命中即达标，
 * 避免用户点名体裁却因只有一处提及而落入兜底；弱描述词仍需多条互相印证。
 */
const CLUES: { genre: string; words: string[]; strong: string[] }[] = [
	{
		genre: "academic",
		strong: ["论文", "学术"],
		words: ["文献", "引用", "综述", "研究", "实验", "数据", "方法", "样本", "结论", "参考文献", "段落"],
	},
	{ genre: "blog", strong: ["博客"], words: ["观点", "推文", "公众号", "发布", "读者", "专栏", "帖子"] },
	{
		genre: "fiction",
		strong: ["小说"],
		words: ["人物", "故事", "情节", "视角", "续写", "章节", "场景", "对话", "设定"],
	},
	{ genre: "poetry", strong: ["诗歌"], words: ["诗", "分行", "意象", "韵", "诗节"] },
	{ genre: "essay", strong: ["散文", "随笔"], words: ["观察", "杂记"] },
	{ genre: "diary", strong: ["日记"], words: ["日志"] },
	// email 无强词：它是兜底体裁且 brief 模板示例含"邮件"二字，单命中会误判为线索
	{ genre: "email", strong: [], words: ["邮件回复", "回复", "信", "通知", "邀请", "申请"] },
	{
		genre: "official-doc",
		strong: ["公文", "红头文件"],
		words: ["请示", "文号", "落款", "通知", "函件", "公函", "批复", "发函"],
	},
	{
		genre: "ecommerce",
		strong: ["电商"],
		words: ["商品", "销量", "详情页", "卖点", "转化率", "直播话术", "带货", "种草", "上架"],
	},
	{ genre: "github-readme", strong: ["README", "readme"], words: ["开源项目", "贡献指南", "安装", "CONTRIBUTING"] },
	{
		genre: "cover-letter",
		strong: ["求职信", "个人陈述", "cover letter", "自荐信"],
		words: ["简历", "求职", "应聘", "岗位"],
	},
	{ genre: "news", strong: ["新闻稿", "press release"], words: ["通稿", "导语", "媒体", "发稿"] },
	{
		genre: "cs-blog",
		strong: ["技术博客"],
		words: ["技术文章", "踩坑", "源码", "性能优化", "复盘", "填坑", "编译", "报错"],
	},
	{
		genre: "critique",
		strong: ["书评", "影评", "剧评", "测评"],
		words: ["产品评论", "观后感", "读后感", "剧透", "口碑", "评分"],
	},
	{
		genre: "speech",
		strong: ["演讲", "发言稿", "致辞"],
		words: ["路演", "开场白", "主持词", "竞聘", "脱口秀", "朗读"],
	},
	{
		genre: "script",
		strong: ["剧本"],
		words: ["台词", "分镜", "舞台指示", "对白", "独白", "screenplay", "场记", "短剧"],
	},
	{
		genre: "marketing",
		strong: ["软文", "营销"],
		words: ["品牌故事", "投放", "拉新", "私域", "行动号召", "营销文案"],
	},
	{
		genre: "tech-docs",
		strong: ["API 文档", "API文档", "接口文档"],
		words: ["教程", "使用手册", "参考手册", "快速上手", "参数说明", "示例代码", "openapi"],
	},
	// -- 应用/内容体裁（第二批） -----------------------------------------------
	{ genre: "fairy", strong: ["童话", "寓言"], words: ["童话故事", "睡前故事", "儿童故事"] },
	{ genre: "microcopy", strong: ["微博", "朋友圈"], words: ["短文案", "话题标签", "hashtag", "微博正文"] },
	{ genre: "minutes", strong: ["会议纪要", "纪要"], words: ["决议", "待办", "出席", "与会", "议程", "行动项"] },
	{ genre: "abstract", strong: ["摘要", "abstract"], words: ["学术摘要", "论文摘要", "内容提要"] },
	{ genre: "manual", strong: ["说明书", "用户手册"], words: ["产品说明书", "安全警示", "注意事项", "保修"] },
	{ genre: "interview", strong: ["访谈", "采访"], words: ["访谈稿", "实录", "受访者", "引语", "问答"] },
	{ genre: "popsci", strong: ["科普"], words: ["科普文", "大众读者", "类比", "深入浅出", "通俗"] },
	{ genre: "workreport", strong: ["周报", "月报", "述职"], words: ["工作总结", "汇报", "周计划"] },
];

export interface GenreInference {
	genre: GenreConfig;
	/** How the choice was made — shown to the user in one line. */
	reason: "explicit" | "brief" | "clues" | "previous" | "fallback";
	/** True when the top clue scores tie; asking the user is warranted. */
	ambiguous?: boolean;
	/** The tied genre ids, strongest first. */
	tied?: string[];
}

export function inferGenre(input: {
	explicit?: string | null;
	briefText?: string | null;
	hintText?: string | null;
	previous?: string | null;
}): GenreInference {
	if (input.explicit) {
		const g = getGenreOrFallback(input.explicit);
		return { genre: g, reason: "explicit" };
	}
	const brief = input.briefText ?? "";
	for (const g of GENRES) {
		if (
			brief.includes(`体裁：${g.id}`) ||
			brief.includes(`体裁: ${g.id}`) ||
			brief.toLowerCase().includes(`genre: ${g.id}`)
		) {
			return { genre: g, reason: "brief" };
		}
	}
	const text = `${brief}\n${input.hintText ?? ""}`;
	const scores = new Map<string, number>();
	for (const { genre, words, strong } of CLUES) {
		for (const w of strong) {
			if (text.includes(w)) scores.set(genre, (scores.get(genre) ?? 0) + 2);
		}
		for (const w of words) {
			if (text.includes(w)) scores.set(genre, (scores.get(genre) ?? 0) + 1);
		}
	}
	const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > 0);
	if (ranked.length > 0 && ranked[0][1] >= 2) {
		const top = ranked[0];
		const tie = ranked.length > 1 && ranked[1][1] === top[1];
		if (!tie) {
			const g = getGenreOrFallback(top[0]);
			return { genre: g, reason: "clues" };
		}
		// Ambiguity: prefer the previous genre when it is among the tied leaders.
		const tied = ranked.slice(0, 2).map(([id]) => id);
		if (input.previous && tied.includes(input.previous)) {
			return { genre: getGenreOrFallback(input.previous), reason: "previous", ambiguous: true, tied };
		}
		return { genre: getGenreOrFallback(fallbackGenreId), reason: "fallback", ambiguous: true, tied };
	}
	if (input.previous && getGenre(input.previous)) {
		return { genre: getGenreOrFallback(input.previous), reason: "previous" };
	}
	return { genre: getGenreOrFallback(fallbackGenreId), reason: "fallback" };
}

/** One-line summary of the current dimension selection, shown after starting a task. */
export function describeSelection(
	genre: GenreConfig,
	reason: GenreInference["reason"],
	voice: string | null,
	operation: string,
): string {
	const reasonText: Record<GenreInference["reason"], string> = {
		explicit: "你指定",
		brief: "brief 声明",
		clues: "根据材料推断",
		previous: "沿用上次选择",
		fallback: "未识别到体裁线索，使用兜底",
	};
	const voiceText = voice ? `文风：${voice}` : "文风：默认";
	return `体裁：${genre.name}（${genre.id}${genre.experimental ? "，实验性" : ""}，${reasonText[reason]}）· ${voiceText} · 操作：${operation}`;
}
