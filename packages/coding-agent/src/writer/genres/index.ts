/**
 * Genre registry and inference. 注册表 + 维度推断：
 * 显式指定 > brief.md 声明 > 材料/要求线索 > 上次使用的体裁 > 兜底（email）。
 * 只有并列歧义且会显著影响结果时才建议询问（推断器返回 candidates）。
 */

import type { GenreConfig } from "./types.ts";
import { academic } from "./academic.ts";
import { blog } from "./blog.ts";
import { fiction } from "./fiction.ts";
import { poetry } from "./poetry.ts";
import { essay, diary } from "./essay-diary.ts";
import { email, fallbackGenreId } from "./email.ts";

export const GENRES: GenreConfig[] = [academic, blog, fiction, poetry, essay, diary, email];

const byId = new Map(GENRES.map((g) => [g.id, g]));

export function getGenre(id: string | null | undefined): GenreConfig | undefined {
	return id ? byId.get(id) : undefined;
}

export function getGenreOrFallback(id: string | null | undefined): GenreConfig {
	return getGenre(id) ?? byId.get(fallbackGenreId)!;
}

export { fallbackGenreId };

/** Keyword clues for inference, scored by specificity. */
const CLUES: { genre: string; words: string[] }[] = [
	{ genre: "academic", words: ["论文", "文献", "引用", "综述", "研究", "实验", "数据", "方法", "样本", "结论", "参考文献", "学术", "段落"] },
	{ genre: "blog", words: ["博客", "观点", "推文", "公众号", "发布", "读者", "专栏", "帖子"] },
	{ genre: "fiction", words: ["小说", "人物", "故事", "情节", "视角", "续写", "章节", "场景", "对话", "设定"] },
	{ genre: "poetry", words: ["诗", "诗歌", "分行", "意象", "韵", "诗节"] },
	{ genre: "essay", words: ["散文", "随笔", "观察", "杂记"] },
	{ genre: "diary", words: ["日记", "日志"] },
	{ genre: "email", words: ["邮件", "邮件回复", "回复", "信", "通知", "邀请", "申请"] },
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
		if (brief.includes(`体裁：${g.id}`) || brief.includes(`体裁: ${g.id}`) || brief.toLowerCase().includes(`genre: ${g.id}`)) {
			return { genre: g, reason: "brief" };
		}
	}
	const text = `${brief}\n${input.hintText ?? ""}`;
	const scores = new Map<string, number>();
	for (const { genre, words } of CLUES) {
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
export function describeSelection(genre: GenreConfig, reason: GenreInference["reason"], voice: string | null, operation: string): string {
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
