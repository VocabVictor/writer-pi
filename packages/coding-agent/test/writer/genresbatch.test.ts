import { describe, expect, test } from "vitest";
import { GENRES, getGenre, inferGenre } from "../../src/writer/genres/index.ts";
import { BASE_ISSUE_KINDS } from "../../src/writer/genres/types.ts";
import { allowedKinds } from "../../src/writer/instructions.ts";
import { GENRE_ISSUE_KINDS, ISSUE_KINDS } from "../../src/writer/types.ts";

const BATCH_IDS = ["fairy", "microcopy", "minutes", "abstract", "manual", "interview", "popsci", "workreport"];

describe("second batch genres（第二批体裁注册）", () => {
	test("the eight genres are registered and marked experimental", () => {
		for (const id of BATCH_IDS) {
			const g = getGenre(id);
			expect(g, id).toBeDefined();
			expect(g!.experimental, id).toBe(true);
		}
		expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length);
	});

	test("every genre declares all seven required aspects", () => {
		for (const id of BATCH_IDS) {
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
});

describe("second batch longForm（长文配置）", () => {
	test("every genre defines concrete long-form rules and enables the program checks", () => {
		for (const id of BATCH_IDS) {
			const g = getGenre(id)!;
			expect(g.longForm, id).toBeDefined();
			expect(g.longForm!.threshold, id).toBeGreaterThan(0);
			expect(g.checks.longForm?.enabled, id).toBe(true);
			const cap = g.checks.longForm?.maxParagraphChars ?? 500;
			expect(cap, id).toBeGreaterThan(0);
			expect(
				g.longForm!.pacing.some((p) => p.includes(`${cap} 字`)),
				`${id} pacing vs cap ${cap}`,
			).toBe(true);
			for (const rule of [...g.longForm!.structure, ...g.longForm!.pacing, ...g.longForm!.tracking]) {
				expect(rule.length, `${id}: ${rule}`).toBeGreaterThan(10);
			}
		}
	});

	test("per-genre check switches: fairy/manual keep duplicates loose; minutes/manual do not enforce length", () => {
		expect(getGenre("fairy")!.checks.duplicates).toBe("loose");
		expect(getGenre("manual")!.checks.duplicates).toBe("loose");
		expect(getGenre("minutes")!.checks.length).toBe(false);
		expect(getGenre("manual")!.checks.length).toBe(false);
		expect(getGenre("abstract")!.checks.length).toBe(true);
		expect(getGenre("abstract")!.checks.aitone?.burstiness).toBe(true);
		expect(getGenre("fairy")!.checks.aitone?.fingerprint).toBe(true);
	});
});

describe("second batch clue inference（第二批体裁线索推断）", () => {
	test("fairy: 童话故事 beats the shared fiction 故事 clue", () => {
		const r = inferGenre({ hintText: "写一个童话故事，面向儿童，结尾点明寓意" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("fairy");
	});

	test("microcopy: 微博/话题标签, not blog", () => {
		const r = inferGenre({ hintText: "写一条微博，带话题标签，口语一点" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("microcopy");
	});

	test("minutes: 会议纪要/决议/待办/出席", () => {
		const r = inferGenre({ hintText: "整理会议纪要，列出决议、待办和出席人员" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("minutes");
	});

	test("abstract: 学术摘要 over the incidental academic 学术 clue", () => {
		const r = inferGenre({ hintText: "写一段学术摘要，交代目的与结果，300字以内" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("abstract");
	});

	test("manual: 产品说明书/安全警示, not tech-docs", () => {
		const r = inferGenre({ hintText: "写产品说明书，分步骤，加安全警示" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("manual");
	});

	test("interview: 访谈实录/受访者; 引语 beats the script 对白 clue", () => {
		const r = inferGenre({ hintText: "整理访谈实录，保留受访者原话" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("interview");
		const qa = inferGenre({ hintText: "写一篇访谈稿，注意引语与对白格式" });
		expect(qa.genre.id).toBe("interview");
	});

	test("popsci: 科普文/类比/深入浅出", () => {
		const r = inferGenre({ hintText: "写一篇科普文，用类比把原理讲得深入浅出" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("popsci");
	});

	test("workreport: 周报/汇报, not diary 日志", () => {
		const r = inferGenre({ hintText: "写本周周报，汇报进度和下阶段计划" });
		expect(r.reason).toBe("clues");
		expect(r.genre.id).toBe("workreport");
	});
});

describe("second batch collisions（关键词碰撞场景）", () => {
	test("paper text with 方法/结论 stays academic; 摘要 alone does not flip it", () => {
		const paper = inferGenre({ hintText: "写论文，交代研究方法和结论" });
		expect(paper.genre.id).toBe("academic");
	});

	test("critique keeps 影评; fiction keeps 小说 over fairy", () => {
		expect(inferGenre({ hintText: "写一篇影评，注意剧透提示" }).genre.id).toBe("critique");
		expect(inferGenre({ hintText: "根据笔记续写小说第三章，保持人物视角一致" }).genre.id).toBe("fiction");
	});

	test("blog keeps 博客观点 over microcopy; tech-docs keeps API 文档 over manual", () => {
		expect(inferGenre({ hintText: "写博客文章，表达我的观点" }).genre.id).toBe("blog");
		expect(inferGenre({ hintText: "写一篇 API 文档，教程式结构，参数说明要全" }).genre.id).toBe("tech-docs");
	});

	test("explicit ids and brief declarations resolve directly", () => {
		expect(inferGenre({ explicit: "minutes" }).reason).toBe("explicit");
		expect(inferGenre({ explicit: "workreport" }).genre.id).toBe("workreport");
		expect(inferGenre({ briefText: "体裁：abstract", hintText: "写论文" }).reason).toBe("brief");
	});
});

describe("second batch issue kinds（allowedKinds）", () => {
	test("extra kinds stay inside the accepted genre kind set", () => {
		for (const id of BATCH_IDS) {
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
