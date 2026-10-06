import { describe, expect, test } from "vitest";
import { runProgramChecks } from "../../src/writer/checker.ts";
import { checkCitations, extractCitations } from "../../src/writer/citations.ts";
import { allowedKinds, renderGenreRules } from "../../src/writer/genre-instructions.ts";
import { fallbackGenreId, GENRES, getGenre, getGenreOrFallback, inferGenre } from "../../src/writer/genres/index.ts";
import { BASE_ISSUE_KINDS } from "../../src/writer/genres/types.ts";
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
