import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ensureProject, readState } from "../../src/writer/project.ts";
import {
	diffDrafts,
	draftPathFor,
	parseDraftVersion,
	readDraft,
	revertTo,
	saveDraft,
} from "../../src/writer/versions.ts";

async function makeTempProject(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "writer-pi-test-"));
	await ensureProject(root);
	return root;
}

describe("saveDraft", () => {
	test("never overwrites: consecutive saves create draft-001, draft-002, …", async () => {
		const root = await makeTempProject();
		try {
			const first = await saveDraft(root, "第一版内容", "初稿");
			const second = await saveDraft(root, "第二版内容", "修改");
			expect(first.path).toBe("drafts/draft-001.md");
			expect(second.path).toBe("drafts/draft-002.md");
			expect(await readFile(join(root, first.path), "utf-8")).toBe("第一版内容");
			expect(await readFile(join(root, second.path), "utf-8")).toBe("第二版内容");
			const state = await readState(root);
			expect(state.currentDraft).toBe("drafts/draft-002.md");
			expect(state.draftCount).toBe(2);
			expect(state.draftNotes).toEqual({ "1": "初稿", "2": "修改" });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("skips version numbers that already exist on disk (e.g. a manually dropped manuscript)", async () => {
		const root = await makeTempProject();
		try {
			await saveDraft(root, "one");
			await writeFile(join(root, "drafts", "draft-002.md"), "用户手动放入的稿件", "utf-8");
			const third = await saveDraft(root, "three");
			expect(third.path).toBe("drafts/draft-003.md");
			expect(await readFile(join(root, "drafts", "draft-002.md"), "utf-8")).toBe("用户手动放入的稿件");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("revertTo", () => {
	test("restores old content as a NEW version; history files stay intact", async () => {
		const root = await makeTempProject();
		try {
			await saveDraft(root, "版本一");
			await saveDraft(root, "版本二");
			const reverted = await revertTo(root, 1);
			expect(reverted).not.toBeNull();
			expect(reverted!.path).toBe("drafts/draft-003.md");
			expect(await readDraft(root, reverted!.path)).toBe("版本一");
			// all three files exist
			expect(await readDraft(root, draftPathFor(1))).toBe("版本一");
			expect(await readDraft(root, draftPathFor(2))).toBe("版本二");
			const state = await readState(root);
			expect(state.currentDraft).toBe("drafts/draft-003.md");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("returns null for a version that does not exist", async () => {
		const root = await makeTempProject();
		try {
			expect(await revertTo(root, 42)).toBeNull();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("diffDrafts", () => {
	test("produces a unified diff between two versions; null with fewer than two versions", async () => {
		const root = await makeTempProject();
		try {
			expect(await diffDrafts(root)).toBeNull();
			await saveDraft(root, "第一行\n第二行\n");
			expect(await diffDrafts(root)).toBeNull();
			await saveDraft(root, "第一行\n改过的第二行\n");
			const patch = await diffDrafts(root);
			expect(patch).not.toBeNull();
			expect(patch).toContain("---");
			expect(patch).toContain("+++");
			expect(patch).toContain("-第二行");
			expect(patch).toContain("+改过的第二行");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("parseDraftVersion", () => {
	test("accepts draft-001.md and rejects junk", () => {
		expect(parseDraftVersion("drafts/draft-001.md")).toBe(1);
		expect(parseDraftVersion("draft-012.md")).toBe(12);
		expect(parseDraftVersion("notes.md")).toBeNull();
	});
});
