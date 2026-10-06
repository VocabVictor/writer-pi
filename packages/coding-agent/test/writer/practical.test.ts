import { describe, expect, test } from "vitest";
import { runProgramChecks } from "../../src/writer/checker.ts";
import { GENRES, getGenre, inferGenre } from "../../src/writer/genres/index.ts";
import { BASE_ISSUE_KINDS } from "../../src/writer/genres/types.ts";
import { allowedKinds, renderGenreRules } from "../../src/writer/instructions.ts";
import { GENRE_ISSUE_KINDS, ISSUE_KINDS } from "../../src/writer/types.ts";

const NEW_IDS = ["official-doc", "ecommerce", "github-readme", "cover-letter", "news"];

describe("practical genres（应用文类体裁注册）", () => {
	test("the five practical genres are registered and marked experimental", () => {
		for (const id of NEW_IDS) {
			const g = getGenre(id);
			expect(g, id).toBeDefined();
			expect(g!.experimental, id).toBe(true);
		}
		expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
	});

	test("every practical genre declares all seven required aspects", () => {
		for (const id of NEW_IDS) {
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

	test("genres with persistent context declare the update_context tool", () => {
		for (const id of NEW_IDS) {
			const g = getGenre(id)!;
			if (g.context) expect(g.tools, id).toContain("update_context");
		}
		expect(getGenre("github-readme")!.context!.files.map((f) => f.file)).toEqual(
			expect.arrayContaining(["commands.md", "links.md"]),
		);
	});

	test("extra kinds stay inside the accepted genre kind set", () => {
		for (const id of NEW_IDS) {
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

describe("inferGenre clues（应用文体裁线索推断）", () => {
	test("official-doc: 通知/请示/落款 beat the shared email clue", () => {
		const r = inferGenre({ hintText: "起草一份关于放假的通知，要有落款和请示格式" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("official-doc");
	});

	test("ecommerce: 商品/销量/详情页/卖点", () => {
		const r = inferGenre({ hintText: "写商品详情页文案，突出销量和卖点" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("ecommerce");
	});

	test("github-readme: README字样与安装/贡献指南", () => {
		const r = inferGenre({ hintText: "为开源项目写 README，补上安装与贡献指南" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("github-readme");
	});

	test("cover-letter: 求职信/简历", () => {
		const r = inferGenre({ hintText: "帮我写求职信，突出简历里的成果" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("cover-letter");
	});

	test("news: 新闻稿/导语 beat the blog 发布 clue", () => {
		const r = inferGenre({ hintText: "写一篇产品发布的新闻稿，导语要带 5W" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("news");
	});

	test("explicit ids resolve directly; existing genres still win on their own clues", () => {
		expect(inferGenre({ explicit: "ecommerce" }).reason).toBe("explicit");
		expect(inferGenre({ hintText: "根据笔记续写小说第三章，保持人物视角一致" }).genre.id).toBe("fiction");
		expect(inferGenre({ hintText: "写博客文章，表达我的观点" }).genre.id).toBe("blog");
	});
});

describe("practical genre checks（检查维度按体裁开关）", () => {
	const commandBlock = "npm install writer-pi\n\nnpm install writer-pi";

	test("github-readme: loose duplicates ignore short repeated command blocks; strict does not", () => {
		const loose = runProgramChecks(commandBlock, {
			briefText: null,
			lockedSentences: [],
			checks: getGenre("github-readme")!.checks,
		});
		expect(loose.duplicateParagraphs).toEqual([]);
		const strict = runProgramChecks(commandBlock, {
			briefText: null,
			lockedSentences: [],
			checks: { ...getGenre("github-readme")!.checks, duplicates: "strict" },
		});
		expect(strict.duplicateParagraphs.length).toBeGreaterThan(0);
	});

	test("github-readme: citations on — unregistered numeric footnote markers are reported", () => {
		const on = runProgramChecks("安装见 [2]", {
			briefText: null,
			lockedSentences: [],
			checks: getGenre("github-readme")!.checks,
			referenceTexts: [],
		});
		expect(on.citations).toEqual([{ marker: "[2]", kind: "numeric" }]);
	});

	test("official-doc: length not enforced（事项完整性优先于字数），banned words still apply", () => {
		const checks = runProgramChecks("赋能的通知。特此通知。", {
			briefText: "长度：10-20字\n禁用词：赋能",
			lockedSentences: [],
			checks: getGenre("official-doc")!.checks,
		});
		expect(checks.length.withinTarget).toBeNull();
		expect(checks.bannedWords).toEqual([{ word: "赋能", count: 1 }]);
	});

	test("news: length enforced when the brief states a target", () => {
		const checks = runProgramChecks("短稿。", {
			briefText: "长度：100-200字",
			lockedSentences: [],
			checks: getGenre("news")!.checks,
		});
		expect(checks.length.withinTarget).toBe(false);
	});
});

describe("practical genre rules rendering（体裁规则注入）", () => {
	test("github-readme rules name its context files and the update_context tool", () => {
		const rules = renderGenreRules(getGenre("github-readme")!);
		expect(rules).toContain("context/commands.md");
		expect(rules).toContain("context/links.md");
		expect(rules).toContain("update_context");
	});

	test("ecommerce rules distinguish the three subtypes", () => {
		const rules = renderGenreRules(getGenre("ecommerce")!);
		expect(rules).toContain("商品详情页");
		expect(rules).toContain("推广文案");
		expect(rules).toContain("直播话术");
	});

	test("news rules carry the inverted-pyramid completion criteria", () => {
		const rules = renderGenreRules(getGenre("news")!);
		expect(rules).toContain("倒金字塔");
		expect(rules).toContain("5W");
	});

	test("quote and punctuation rules are stated per target language, not Chinese-only", () => {
		for (const id of NEW_IDS) {
			expect(renderGenreRules(getGenre(id)!), id).toContain("目标语言");
		}
	});
});
