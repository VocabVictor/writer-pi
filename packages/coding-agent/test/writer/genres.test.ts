import { describe, expect, test } from "vitest";
import { runProgramChecks } from "../../src/writer/checker.ts";
import { checkCitations, extractCitations } from "../../src/writer/citations.ts";
import { fallbackGenreId, GENRES, getGenre, getGenreOrFallback, inferGenre } from "../../src/writer/genres/index.ts";
import { isLongForm, longFormFocus, renderLongFormRules } from "../../src/writer/genres/longform.ts";
import { BASE_ISSUE_KINDS } from "../../src/writer/genres/types.ts";
import { allowedKinds, renderGenreRules } from "../../src/writer/instructions.ts";
import { ISSUE_KINDS } from "../../src/writer/types.ts";

describe("genre registry（体裁配置完整性）", () => {
	test("the three verified genres exist and are not experimental", () => {
		for (const id of ["academic", "blog", "fiction"]) {
			const g = getGenre(id);
			expect(g, id).toBeDefined();
			expect(g!.experimental).toBeUndefined();
		}
	});

	test("poetry/essay/diary/email are clearly marked experimental", () => {
		for (const id of ["poetry", "essay", "diary", "email"]) {
			expect(getGenre(id)!.experimental, id).toBe(true);
		}
	});

	test("every genre defines all seven required aspects", () => {
		for (const g of GENRES) {
			expect(g.requiredInputs.length, g.id).toBeGreaterThan(0);
			expect(g.creation.allowed.length, g.id).toBeGreaterThan(0);
			expect(g.creation.requiresSource.length, g.id).toBeGreaterThan(0);
			expect(g.stages.length, g.id).toBeGreaterThan(0);
			expect(g.reviewFocus.length, g.id).toBeGreaterThan(0);
			expect(g.completion.length, g.id).toBeGreaterThan(0);
			expect(g.operations.length, g.id).toBeGreaterThan(0);
		}
	});

	test("ids are unique and the fallback is an experimental practical-writing genre", () => {
		expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
		const fallback = getGenreOrFallback(fallbackGenreId);
		expect(fallback.experimental).toBe(true);
		expect(getGenreOrFallback("nonexistent").id).toBe(fallbackGenreId);
	});

	test("fiction declares a persistent context with characters/timeline/perspective/events", () => {
		const files = getGenre("fiction")!.context!.files.map((f) => f.file);
		expect(files).toEqual(expect.arrayContaining(["characters.md", "timeline.md", "perspective.md", "events.md"]));
	});

	test("issue kinds: universal set plus genre-specific extras are all accepted", () => {
		const academic = allowedKinds(getGenre("academic")!);
		expect(academic).toContain("unsourced_citation");
		expect(academic).toEqual(expect.arrayContaining([...BASE_ISSUE_KINDS]));
		expect(ISSUE_KINDS).toContain("consistency");
		expect(allowedKinds(getGenre("blog")!)).toContain("consistency");
	});
});

describe("longForm（长文规则：结构/节奏/线索）", () => {
	test("the strengthened genres define concrete long-form rules", () => {
		for (const id of ["academic", "blog", "fiction", "essay", "diary"]) {
			const g = getGenre(id)!;
			expect(g.longForm, id).toBeDefined();
			expect(g.longForm!.threshold, id).toBeGreaterThan(0);
			for (const rule of [...g.longForm!.structure, ...g.longForm!.pacing, ...g.longForm!.tracking]) {
				expect(rule.length, `${id}: ${rule}`).toBeGreaterThan(10);
			}
		}
	});

	test("prose genres enable the long-form program checks; pacing text matches the paragraph cap", () => {
		for (const id of ["academic", "blog", "fiction", "essay", "diary"]) {
			const g = getGenre(id)!;
			expect(g.checks.longForm?.enabled, id).toBe(true);
			const cap = g.checks.longForm?.maxParagraphChars ?? 500;
			expect(cap, id).toBeGreaterThan(0);
			expect(
				g.longForm!.pacing.some((p) => p.includes(`${cap} 字`)),
				`${id} pacing vs cap ${cap}`,
			).toBe(true);
		}
	});

	test("rules only trigger at the threshold or when the brief asks for long form", () => {
		const fiction = getGenre("fiction")!;
		expect(longFormFocus(fiction, 300)).toEqual([]);
		const focus = longFormFocus(fiction, 6000);
		expect(focus.some((f) => f.startsWith("【长文·结构】"))).toBe(true);
		expect(focus.some((f) => f.startsWith("【长文·节奏】"))).toBe(true);
		expect(focus.some((f) => f.startsWith("【长文·线索】"))).toBe(true);
		expect(isLongForm(fiction, 100, "请写一篇长篇连载的第一章")).toBe(true);
		expect(renderLongFormRules(getGenre("academic")!, 5000)).toContain("长文规则");
		expect(renderLongFormRules(getGenre("academic")!, 500)).toBe("");
	});

	test("AI 味检查按体裁条件化：文学类开指纹词，日记不评价，学术阈值更高", () => {
		for (const id of ["fiction", "essay"]) {
			expect(getGenre(id)!.checks.aitone?.fingerprint, id).toBe(true);
		}
		expect(getGenre("blog")!.checks.aitone?.fingerprint ?? false).toBe(false);
		expect(getGenre("diary")!.checks.aitone?.enabled).toBe(false); // 日记只做轻度编辑
		const academic = getGenre("academic")!;
		expect(academic.checks.aitone?.burstiness).toBe(true); // 学术摘要的分场景特征
		expect(academic.checks.aitone?.threshold).toBeGreaterThan(getGenre("blog")!.checks.aitone?.threshold ?? 25);
		for (const id of ["academic", "blog", "essay", "fiction"]) {
			expect(getGenre(id)!.checks.aitone?.enabled, id).toBe(true);
		}
	});
});

describe("inferGenre（维度推断：显式 > brief > 线索 > 上次 > 兜底）", () => {
	test("explicit wins over everything", () => {
		expect(inferGenre({ explicit: "fiction", briefText: "体裁：blog", hintText: "写论文" }).genre.id).toBe("fiction");
		expect(inferGenre({ explicit: "fiction" }).reason).toBe("explicit");
	});

	test("a brief declaration beats material clues", () => {
		const r = inferGenre({ briefText: "体裁：blog", hintText: "这篇论文的实验数据表明" });
		expect(r.genre.id).toBe("blog");
		expect(r.reason).toBe("brief");
	});

	test("strong material clues (score ≥ 2) pick the genre", () => {
		const r = inferGenre({ hintText: "根据笔记续写小说第三章，保持人物视角一致" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("fiction");
	});

	test("one strong genre word alone is enough (用户点名体裁必须被识别)", () => {
		const r = inferGenre({ hintText: "为一篇关于城市黄昏的散文拟提纲" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("essay");
		expect(inferGenre({ hintText: "整理这次复盘的会议纪要" }).genre.id).toBe("minutes");
	});

	test("a strong genre word outweighs a weak clue from another genre", () => {
		const r = inferGenre({ hintText: "写一篇散文，要有观点" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("essay");
	});

	test("two strong genre words still tie as ambiguous", () => {
		const r = inferGenre({ hintText: "散文与小说都要写" });
		expect(r.ambiguous).toBe(true);
		expect(r.tied).toEqual(expect.arrayContaining(["essay", "fiction"]));
	});

	test("weak clues alone still need corroboration", () => {
		expect(inferGenre({ hintText: "分行要注意节奏" }).reason).toBe("fallback");
	});

	test("a vague description without a genre name falls back simply", () => {
		const r = inferGenre({ hintText: "深度分析文章" });
		expect(r.reason).toBe("fallback");
		expect(r.ambiguous).toBeUndefined();
	});

	test("ties are reported as ambiguous with candidates, falling back safely", () => {
		const r = inferGenre({ hintText: "博客文章要有观点，论文要有文献" });
		expect(r.ambiguous).toBe(true);
		expect(r.tied).toBeDefined();
	});

	test("no clues → previous genre; nothing at all → experimental fallback", () => {
		expect(inferGenre({ previous: "blog" }).genre.id).toBe("blog");
		const fb = inferGenre({});
		expect(fb.reason).toBe("fallback");
		expect(fb.genre.experimental).toBe(true);
	});
});

describe("citation checks（academic 引用核对）", () => {
	test("numeric markers must be registered", () => {
		const refs = ["- [1] → sources/notes.md"];
		expect(checkCitations("结果见 [1]。", refs)).toEqual([]);
		expect(checkCitations("结果见 [2]。", refs)).toEqual([{ marker: "[2]", kind: "numeric" }]);
	});

	test("author-year markers must appear in the material", () => {
		const refs = ["张三（2021）指出……"];
		expect(checkCitations("如张三（2021）所述", refs)).toEqual([]);
		expect(checkCitations("如李四（2020）所述", refs)).toHaveLength(1);
	});

	test("extractCitations finds both marker styles without duplicates", () => {
		expect(extractCitations("[1] 和 (Smith, 2020)").map((c) => c.kind)).toEqual(["numeric", "authorYear"]);
	});

	test("author-year markers resolve across languages", () => {
		const refs = ["Иванов（2021）指出……", "김철수（2020）指出……", "田中（2019）指出……", "García（2018）指出……"];
		expect(checkCitations("见 (Иванов, 2021)。", refs)).toEqual([]);
		expect(checkCitations("见 김철수（2020）。", refs)).toEqual([]);
		expect(checkCitations("见 田中（2019）。", refs)).toEqual([]);
		expect(checkCitations("见 (García, 2018)。", refs)).toEqual([]);
		// 字母文字必须全名命中：常见后缀（如 «ов»）不算命中，避免误放行
		expect(checkCitations("见 (Петров, 2020)。", refs)).toHaveLength(1);
	});
});

describe("genre-scoped program checks（程序检查按体裁开关）", () => {
	const brief = "长度：10-20字\n禁用词：赋能";
	const text = "赋能的重复重复重复。\n\n赋能的重复重复重复。";

	test("poetry: duplicates off, length off — intentional repetition is not an error", () => {
		const checks = runProgramChecks(text, {
			briefText: brief,
			lockedSentences: [],
			checks: { length: false, bannedWords: true, duplicates: "off", locked: true, citations: false },
		});
		expect(checks.duplicateParagraphs).toEqual([]);
		expect(checks.duplicateSentences).toEqual([]);
		expect(checks.length.withinTarget).toBeNull(); // length not enforced
		expect(checks.bannedWords).toHaveLength(1); // banned words still apply
	});

	test("fiction: loose duplicate mode only flags long repeated paragraphs", () => {
		const short = "他说了一句话，说完就走了。";
		const story = `${short}\n\n${short}`;
		const strict = runProgramChecks(story, {
			briefText: null,
			lockedSentences: [],
			checks: { length: false, bannedWords: false, duplicates: "strict", locked: true, citations: false },
		});
		const loose = runProgramChecks(story, {
			briefText: null,
			lockedSentences: [],
			checks: { length: false, bannedWords: false, duplicates: "loose", locked: true, citations: false },
		});
		expect(strict.duplicateParagraphs.length).toBeGreaterThan(0);
		expect(loose.duplicateParagraphs).toEqual([]); // too short for the loose threshold
	});

	test("fiction turns repetition detection off, so long-form near-duplicates stay unflagged", () => {
		const text = "他推开门，走廊里堆满了废弃的课桌椅。\n\n他推开门，走廊里堆着废弃的课桌椅。";
		const checks = runProgramChecks(text, {
			briefText: null,
			lockedSentences: [],
			checks: { ...getGenre("fiction")!.checks, longForm: { enabled: true, maxParagraphChars: 100 } },
		});
		expect(checks.nearDuplicateSentences).toEqual([]); // 有意重复的意象不进检查
	});

	test("citations off by default; enabled by the academic config", () => {
		const base = { briefText: null, lockedSentences: [] };
		expect(
			runProgramChecks("见 [2]", {
				...base,
				checks: { length: false, bannedWords: false, duplicates: "off", locked: true, citations: false },
			}).citations,
		).toEqual([]);
		const on = runProgramChecks("见 [2]", {
			...base,
			checks: { length: false, bannedWords: false, duplicates: "off", locked: true, citations: true },
			referenceTexts: [],
		});
		expect(on.citations).toEqual([{ marker: "[2]", kind: "numeric" }]);
	});
});

describe("genre rules rendering（体裁规则注入）", () => {
	test("fiction rules name the context files and mark experimental genres", () => {
		const fiction = renderGenreRules(getGenre("fiction")!);
		expect(fiction).toContain("context/characters.md");
		expect(fiction).toContain("update_context");
		const poetry = renderGenreRules(getGenre("poetry")!);
		expect(poetry).toContain("实验性");
	});
});
