/**
 * Draft version management. Versions live in drafts/draft-001.md, draft-002.md, …
 * Saving always creates a NEW file (the fs write uses the exclusive "wx" flag, so an
 * existing file is never overwritten); reverting to an old version appends a new version
 * with the old content, keeping all history files intact.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as Diff from "diff";
import { extensionFor } from "./formats.ts";
import { DRAFTS_DIR, fileExists, REVIEWS_DIR, readState, updateState } from "./project.ts";
import type { DraftVersionInfo, WriterStage, WriterState } from "./types.ts";

const VERSION_RE = /^draft-(\d+)\.(md|tex)$/;

export function draftPathFor(version: number, extension = "md"): string {
	return `${DRAFTS_DIR}/draft-${String(version).padStart(3, "0")}.${extension}`;
}

export function reviewPathFor(version: number): string {
	return `${REVIEWS_DIR}/review-${String(version).padStart(3, "0")}.json`;
}

export function parseDraftVersion(relPath: string): number | null {
	const m = VERSION_RE.exec(relPath.replaceAll("\\", "/").split("/").pop() ?? "");
	return m ? Number(m[1]) : null;
}

/** Save `content` as the next draft version. Never overwrites: bumps past any file already on disk. `note` is stored in state so listings can show it. */
export async function saveDraft(
	root: string,
	content: string,
	note?: string,
	stateOverrides?: Partial<WriterState>,
): Promise<{ path: string; version: number; state: WriterState }> {
	// The version probe and file write run inside the state lock so a concurrent flow-turn
	// write cannot interleave the read-modify-write.
	return updateState(root, async (state) => {
		const extension = extensionFor(state.format);
		let version = Math.max(state.draftCount, 0) + 1;
		let relPath = draftPathFor(version, extension);
		while (await fileExists(join(root, relPath))) {
			// File already on disk (e.g. user dropped a manuscript there manually): skip the number.
			version += 1;
			relPath = draftPathFor(version, extension);
		}
		await writeFile(join(root, relPath), content, { encoding: "utf-8", flag: "wx" });
		state.draftCount = version;
		state.currentDraft = relPath;
		// Store the note so /drafts can show it per version.
		if (note !== undefined) state.draftNotes = { ...state.draftNotes, [version]: note };
		Object.assign(state, stateOverrides);
		return { path: relPath, version, state };
	});
}

export async function readDraft(root: string, relPath: string): Promise<string | null> {
	try {
		return await readFile(join(root, relPath), "utf-8");
	} catch {
		return null;
	}
}

export async function listDrafts(root: string): Promise<DraftVersionInfo[]> {
	const abs = join(root, DRAFTS_DIR);
	let names: string[];
	try {
		names = await readdir(abs);
	} catch {
		return [];
	}
	const state = await readState(root);
	const infos: DraftVersionInfo[] = [];
	for (const name of names.sort()) {
		const m = VERSION_RE.exec(name);
		if (!m) continue;
		const version = Number(m[1]);
		const relPath = `${DRAFTS_DIR}/${name}`;
		let createdAt = "";
		try {
			createdAt = (await stat(join(abs, name))).mtime.toISOString();
		} catch {
			// file vanished between readdir and stat: skip metadata, keep the row
		}
		infos.push({
			path: relPath,
			version,
			note: state.draftNotes?.[version] ?? (state.currentDraft === relPath ? "current" : null),
			createdAt,
		});
	}
	return infos;
}

/** Append a new draft version with the content of `version`, leaving the old file untouched. */
export async function revertTo(
	root: string,
	version: number,
	note?: string,
): Promise<{ path: string; version: number } | null> {
	const relPath = await listedDraftPath(root, version);
	if (relPath === null) return null;
	const content = await readDraft(root, relPath);
	if (content === null) return null;
	const saved = await saveDraft(root, content, note ?? `reverted from ${relPath}`);
	return saved;
}

export function diffTexts(fromLabel: string, toLabel: string, from: string, to: string): string {
	return Diff.createTwoFilesPatch(fromLabel, toLabel, from, to, undefined, undefined, {
		context: 3,
	});
}

/** Diff two draft versions by version number; defaults to the two most recent versions. */
export async function diffDrafts(root: string, fromVersion?: number, toVersion?: number): Promise<string | null> {
	const drafts = await listDrafts(root);
	if (drafts.length === 0) return null;
	const find = (version?: number) => drafts.find((d) => d.version === version)?.path;
	const from = fromVersion ?? drafts[drafts.length - 2]?.version;
	const to = toVersion ?? drafts[drafts.length - 1]?.version;
	if (from === undefined || to === undefined || from === to) return null;
	const fromPath = find(from);
	const toPath = find(to);
	if (!fromPath || !toPath) return null;
	const a = await readDraft(root, fromPath);
	const b = await readDraft(root, toPath);
	if (a === null || b === null) return null;
	return diffTexts(fromPath, toPath, a, b);
}

/** Path of a draft version as actually listed on disk (extension may vary by format); null when absent. */
async function listedDraftPath(root: string, version: number): Promise<string | null> {
	const drafts = await listDrafts(root);
	return drafts.find((d) => d.version === version)?.path ?? null;
}

/** Stage helper used by the writing flow to persist stage transitions alongside state. */
export function setStage(
	root: string,
	stage: WriterStage,
	mode?: WriterState["mode"],
	lastRequest?: string,
): Promise<WriterState> {
	return updateState(root, (state) => {
		state.stage = stage;
		if (mode !== undefined) state.mode = mode;
		if (lastRequest !== undefined) state.lastRequest = lastRequest;
		return state;
	});
}
