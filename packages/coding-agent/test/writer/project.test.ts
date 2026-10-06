import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
	ensureProject,
	fileExists,
	parseLockedSentences,
	readState,
	splitParagraphs,
} from "../../src/writer/project.ts";

async function makeTempProject(): Promise<string> {
	return await mkdtemp(join(tmpdir(), "writer-pi-test-"));
}

describe("ensureProject", () => {
	test("creates the full project skeleton and state.json", async () => {
		const root = await makeTempProject();
		try {
			const created = await ensureProject(root);
			expect(created).toContain("brief.md");
			expect(created).toContain("locked.md");
			expect(created).toContain("sources/");
			expect(created).toContain("voice/");
			expect(created).toContain("drafts/");
			expect(created).toContain("reviews/");
			expect(await fileExists(join(root, "state.json"))).toBe(true);
			const state = await readState(root);
			expect(state.stage).toBe("idle");
			expect(state.draftCount).toBe(0);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("never overwrites an existing brief.md", async () => {
		const root = await makeTempProject();
		try {
			await writeFile(join(root, "brief.md"), "# 我的写作要求\n\n保持原文。", "utf-8");
			await ensureProject(root);
			const brief = await readFile(join(root, "brief.md"), "utf-8");
			expect(brief).toContain("保持原文");
			expect(brief).not.toContain("目标读者");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("parseLockedSentences", () => {
	test("strips list markers, skips headings and comments, keeps sentence text", () => {
		const text = [
			"# 锁定原句",
			"<!-- comment -->",
			"- 我当时不想答应，只是怕直接拒绝让场面难看。",
			"* 第二条锁定",
			"1. 编号锁定句",
			"  - 前后空白也要裁掉  ",
			"",
		].join("\n");
		expect(parseLockedSentences(text)).toEqual([
			"我当时不想答应，只是怕直接拒绝让场面难看。",
			"第二条锁定",
			"编号锁定句",
			"前后空白也要裁掉",
		]);
	});

	test("returns empty for empty or template-only text", () => {
		expect(parseLockedSentences("")).toEqual([]);
		expect(parseLockedSentences("# 锁定原句\n\n<!-- 说明 -->\n")).toEqual([]);
	});
});

describe("splitParagraphs", () => {
	test("splits on blank lines, trims, drops empties, and numbers consistently", () => {
		const text = "第一段内容。\n\n  第二段内容。  \n\n\n\n第三段内容。\n";
		expect(splitParagraphs(text)).toEqual(["第一段内容。", "第二段内容。", "第三段内容。"]);
	});
});
