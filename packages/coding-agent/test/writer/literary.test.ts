import { describe, expect, test } from "vitest";
import { runProgramChecks } from "../../src/writer/checker.ts";
import { GENRES, getGenre, inferGenre } from "../../src/writer/genres/index.ts";
import { BASE_ISSUE_KINDS } from "../../src/writer/genres/types.ts";
import { allowedKinds, renderGenreRules } from "../../src/writer/instructions.ts";
import { GENRE_ISSUE_KINDS, ISSUE_KINDS } from "../../src/writer/types.ts";

const LITERARY_IDS = ["cs-blog", "critique", "speech", "script", "marketing", "tech-docs"];

describe("literary genres（文学/内容类体裁注册）", () => {
	test("the literary genres are registered and marked experimental", () => {
		for (const id of LITERARY_IDS) {
			const g = getGenre(id);
			expect(g, id).toBeDefined();
			expect(g!.experimental, id).toBe(true);
		}
		expect(getGenre("poetry")).toBeDefined();
		expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
	});

	test("every literary genre declares all seven required aspects", () => {
		for (const id of LITERARY_IDS) {
			const g = getGenre(id)!;
			expect(g.requiredInputs.length, id).toBeGreaterThan(0);
			expect(g.creation.allowed.length, id).toBeGreaterThan(0);
			expect(g.creation.requiresSource.length, id).toBeGreaterThan(0);
			expect(g.stages.length, id).toBeGreaterThan(0);
			expect(g.reviewFocus.length, id).toBeGreaterThan(0);
			expect(g.completion.length, id).toBeGreaterThan(0);
			expect(g.operations.length, id).toBeGreaterThan(0);
		}
	});

	test("genres with persistent context declare the update_context tool and their files", () => {
		for (const id of LITERARY_IDS) {
			const g = getGenre(id)!;
			if (g.context) expect(g.tools, id).toContain("update_context");
		}
		expect(getGenre("cs-blog")!.context!.files.map((f) => f.file)).toContain("snippets.md");
		expect(getGenre("critique")!.context!.files.map((f) => f.file)).toContain("quotes.md");
		expect(getGenre("marketing")!.context!.files.map((f) => f.file)).toContain("compliance.md");
		expect(getGenre("tech-docs")!.context!.files.map((f) => f.file)).toEqual(
			expect.arrayContaining(["api.md", "links.md"]),
		);
	});

	test("extra kinds stay inside the accepted genre kind set", () => {
		for (const id of LITERARY_IDS) {
			const g = getGenre(id)!;
			const kinds = allowedKinds(g);
			for (const k of g.extraKinds) {
				expect(GENRE_ISSUE_KINDS, `${id}:${k}`).toContain(k);
				expect(kinds, id).toContain(k);
			}
			expect(kinds, id).toEqual(expect.arrayContaining([...BASE_ISSUE_KINDS]));
			expect([...ISSUE_KINDS], id).toEqual(expect.arrayContaining(kinds));
		}
	});
});

describe("inferGenre clues（文学/内容体裁线索推断）", () => {
	test("speech: 演讲/开场白 beat the marketing 行动号召 clue", () => {
		const r = inferGenre({ hintText: "写一篇年会演讲稿，开场白抓人，收尾要有行动号召" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("speech");
	});

	test("critique: 影评/剧透 beat the script 台词 clue", () => {
		const r = inferGenre({ hintText: "写一篇影评，立场要鲜明，引述原文台词，注意剧透提示" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("critique");
	});

	test("script: 剧本/台词/舞台指示/对白 beat the fiction 人物 clue", () => {
		const r = inferGenre({ hintText: "写一幕剧本，注意台词与舞台指示格式，人物对白要自然" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("script");
	});

	test("marketing: 营销软文/品牌故事 beat the ecommerce 卖点 clue", () => {
		const r = inferGenre({ hintText: "写一篇营销软文，用品牌故事带卖点，结尾要有行动号召" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("marketing");
	});

	test("tech-docs: API 文档/教程/参数说明", () => {
		const r = inferGenre({ hintText: "写一篇 API 文档，教程式结构，参数说明要全" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("tech-docs");
	});

	test("cs-blog: 技术博客/性能优化/踩坑", () => {
		const r = inferGenre({ hintText: "写一篇技术博客，讲这次性能优化的踩坑与复盘" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("cs-blog");
	});

	test("explicit ids resolve directly; existing genres keep their own clues", () => {
		expect(inferGenre({ explicit: "speech" }).reason).toBe("explicit");
		expect(inferGenre({ explicit: "tech-docs" }).genre.id).toBe("tech-docs");
		expect(inferGenre({ hintText: "写博客文章，表达我的观点" }).genre.id).toBe("blog");
		expect(inferGenre({ hintText: "根据笔记续写小说，保持人物设定一致" }).genre.id).toBe("fiction");
	});
});

describe("literary genre checks（检查维度按体裁开关）", () => {
	const refrain = "我们的声音不会停下。";

	test("poetry: duplicates off — repeated lines are an artistic choice, not an error", () => {
		const checks = runProgramChecks(`${refrain}\n\n${refrain}`, {
			briefText: "长度：20字",
			lockedSentences: [],
			checks: getGenre("poetry")!.checks,
		});
		expect(checks.duplicateParagraphs).toEqual([]);
		expect(checks.duplicateSentences).toEqual([]);
		expect(checks.length.withinTarget).toBeNull(); // length not enforced
	});

	test("speech and script: loose duplicates — refrains and repeated stage directions pass", () => {
		for (const id of ["speech", "script"]) {
			const loose = runProgramChecks(`${refrain}\n\n${refrain}`, {
				briefText: null,
				lockedSentences: [],
				checks: getGenre(id)!.checks,
			});
			expect(loose.duplicateParagraphs, id).toEqual([]);
			const strict = runProgramChecks(`${refrain}\n\n${refrain}`, {
				briefText: null,
				lockedSentences: [],
				checks: { ...getGenre(id)!.checks, duplicates: "strict" },
			});
			expect(strict.duplicateParagraphs.length, id).toBeGreaterThan(0);
		}
	});

	test("critique: strict duplicates — repeated review sentences are flagged", () => {
		const checks = runProgramChecks(`${refrain}\n\n${refrain}`, {
			briefText: null,
			lockedSentences: [],
			checks: getGenre("critique")!.checks,
		});
		expect(checks.duplicateParagraphs.length).toBeGreaterThan(0);
	});

	test("cs-blog and tech-docs: citations stay off — bracketed numbers are prose, not citations", () => {
		for (const id of ["cs-blog", "tech-docs"]) {
			const checks = runProgramChecks("步骤见 [2]", {
				briefText: null,
				lockedSentences: [],
				checks: getGenre(id)!.checks,
				referenceTexts: [],
			});
			expect(checks.citations, id).toEqual([]);
		}
	});

	test("tech-docs: length not enforced（完整性优先于字数）", () => {
		const checks = runProgramChecks("安装命令。", {
			briefText: "长度：10-20字",
			lockedSentences: [],
			checks: getGenre("tech-docs")!.checks,
		});
		expect(checks.length.withinTarget).toBeNull();
	});

	test("speech: length enforced when the brief states a target", () => {
		const checks = runProgramChecks("短稿。", {
			briefText: "长度：100-200字",
			lockedSentences: [],
			checks: getGenre("speech")!.checks,
		});
		expect(checks.length.withinTarget).toBe(false);
	});
});

describe("literary genre rules rendering（体裁规则注入）", () => {
	test("rules are stated per target language, not Chinese-only", () => {
		for (const id of [...LITERARY_IDS, "poetry"]) {
			expect(renderGenreRules(getGenre(id)!), id).toContain("目标语言");
		}
	});

	test("script rules name both the English and Chinese scene-heading conventions", () => {
		const rules = renderGenreRules(getGenre("script")!);
		expect(rules).toContain("INT./EXT.");
		expect(rules).toContain("内景/外景");
	});

	test("tech-docs rules name its context files and the update_context tool", () => {
		const rules = renderGenreRules(getGenre("tech-docs")!);
		expect(rules).toContain("context/api.md");
		expect(rules).toContain("context/links.md");
		expect(rules).toContain("update_context");
	});

	test("marketing rules carry the selling-point structure and the compliance red lines", () => {
		const rules = renderGenreRules(getGenre("marketing")!);
		expect(rules).toContain("行动号召");
		expect(rules).toContain("compliance.md");
	});

	test("critique rules require quotes to be registered against sources", () => {
		const rules = renderGenreRules(getGenre("critique")!);
		expect(rules).toContain("context/quotes.md");
	});

	test("poetry rules cover both 现代诗 and 古体 form requirements", () => {
		const rules = renderGenreRules(getGenre("poetry")!);
		expect(rules).toContain("韵脚");
		expect(rules).toContain("格律");
	});
});
