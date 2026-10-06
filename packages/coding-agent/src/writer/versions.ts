/**
 * Draft version management. Versions live in drafts/draft-001.md, draft-002.md, …
 * Saving always creates a NEW file (the fs write uses the exclusive "wx" flag, so an
 * existing file is never overwritten); reverting to an old version appends a new version
 * with the old content, keeping all history files intact.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as Diff from "diff";
import { DRAFTS_DIR, fileExists, REVIEWS_DIR, readState, writeState } from "./project.ts";
import type { DraftVersionInfo, WriterStage, WriterState } from "./types.ts";

const VERSION_RE = /^draft-(\d+)\.md$/;

export function draftPathFor(version: number): string {
	return `${DRAFTS_DIR}/draft-${String(version).padStart(3, "0")}.md`;
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
	const state = await readState(root);
	let version = Math.max(state.draftCount, 0) + 1;
	let relPath = draftPathFor(version);
	while (await fileExists(join(root, relPath))) {
		// File already on disk (e.g. user dropped a manuscript there manually): skip the number.
		version += 1;
		relPath = draftPathFor(version);
	}
	await writeFile(join(root, relPath), content, { encoding: "utf-8", flag: "wx" });
	state.draftCount = version;
	state.currentDraft = relPath;
	// Store the note so /drafts can show it per version.
	if (note !== undefined) state.draftNotes = { ...state.draftNotes, [version]: note };
	Object.assign(state, stateOverrides);
	await writeState(root, state);
	return { path: relPath, version, state };
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
	const relPath = draftPathFor(version);
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
	const versions = (await listDrafts(root)).map((d) => d.version);
	if (versions.length === 0) return null;
	const from = fromVersion ?? versions[versions.length - 2];
	const to = toVersion ?? versions[versions.length - 1];
	if (from === undefined || to === undefined || from === to) return null;
	const a = await readDraft(root, draftPathFor(from));
	const b = await readDraft(root, draftPathFor(to));
	if (a === null || b === null) return null;
	return diffTexts(draftPathFor(from), draftPathFor(to), a, b);
}

/** Stage helper used by the writing flow to persist stage transitions alongside state. */
export async function setStage(
	root: string,
	stage: WriterStage,
	mode?: WriterState["mode"],
	lastRequest?: string,
): Promise<WriterState> {
	const state = await readState(root);
	state.stage = stage;
	if (mode !== undefined) state.mode = mode;
	if (lastRequest !== undefined) state.lastRequest = lastRequest;
	await writeState(root, state);
	return state;
}
