/**
 * Review-round helpers: run program checks on a draft and build the semantic-review
 * instruction; persist review files. Kept separate from the flow state machine.
 */

import { readFile, writeFile } from "node:fs/promises";
import { extractBannedWords, type FullProgramChecks, programIssuesAsLeads, runProgramChecks } from "./checker.ts";
import type { GenreConfig } from "./genres/types.ts";
import { allowedKinds } from "./instructions.ts";
import { listTextFiles, parseLockedSentences, readBrief, readProjectFile, updateState } from "./project.ts";
import { buildReviewInstruction } from "./prompts.ts";
import type { ReviewFile } from "./types.ts";
import { reviewPathFor } from "./versions.ts";

const SOURCE_EXCERPT_LIMIT = 4000;

export interface ReviewRoundPreparation {
	instruction: string;
	programChecks: FullProgramChecks;
}

/** Run program checks (per the genre's switches) and build the next semantic-review instruction. */
export async function prepareReviewRound(
	root: string,
	draftPath: string,
	round: number,
	genre: GenreConfig,
	options?: { directEdits?: boolean },
): Promise<ReviewRoundPreparation> {
	const draftText = (await readDraftText(root, draftPath)) ?? "";
	const briefText = await readBrief(root);
	const lockedSentences = parseLockedSentences((await readProjectFile(root, "locked.md")) ?? "");
	const references = await readReferences(root, genre);
	const programChecks = runProgramChecks(draftText, {
		briefText,
		lockedSentences,
		bannedWords: briefText ? extractBannedWords(briefText) : [],
		checks: genre.checks,
		referenceTexts: references,
	});
	const leads = programIssuesAsLeads(programChecks, countParagraphs(draftText));
	const sourceExcerpts = await readSourceExcerpts(root);
	const instruction = buildReviewInstruction({
		draftPath,
		draftText,
		briefText,
		lockedSentences,
		programLeads: leads,
		sourceExcerpts,
		round,
		reviewFocus: genre.reviewFocus,
		completion: genre.completion,
		allowedKinds: allowedKinds(genre),
		directEdits: options?.directEdits === true,
	});
	return { instruction, programChecks };
}

/** context/references.md plus sources/ contents — the citation-resolution corpus. */
async function readReferences(root: string, genre: GenreConfig): Promise<string[]> {
	const texts: string[] = [];
	if (genre.context?.files.some((f) => f.file === "references.md")) {
		const refs = await readProjectFile(root, "context/references.md");
		if (refs !== null) texts.push(refs);
	}
	return [...texts, ...(await readSourceTexts(root))];
}

/** Load project context shared by the drafting/revise/review instructions. */
export async function loadWriterContext(root: string): Promise<{
	briefText: string | null;
	briefWasEmpty: boolean;
	lockedSentences: string[];
	sourceFiles: { path: string; name: string }[];
}> {
	const briefRaw = await readBrief(root);
	return {
		briefText: briefRaw,
		briefWasEmpty: realBriefContent(briefRaw).length === 0,
		lockedSentences: parseLockedSentences((await readProjectFile(root, "locked.md")) ?? ""),
		sourceFiles: await listTextFiles(root, "sources"),
	};
}

/**
 * Real brief content = text minus HTML comment blocks (multi-line) and headings. The template's
 * indented comment lines must not count as content, or the request never gets seeded.
 */
function realBriefContent(briefRaw: string | null): string {
	if (!briefRaw) return "";
	const kept: string[] = [];
	let inComment = false;
	for (const rawLine of briefRaw.split(/\r?\n/)) {
		let rest = rawLine.trim();
		let line = "";
		while (rest.length > 0) {
			if (inComment) {
				const end = rest.indexOf("-->");
				if (end === -1) {
					rest = "";
					break;
				}
				rest = rest.slice(end + 3).trim();
				inComment = false;
				continue;
			}
			const start = rest.indexOf("<!--");
			if (start === -1) {
				line += rest;
				break;
			}
			line += rest.slice(0, start);
			rest = rest.slice(start + 4);
			inComment = true;
		}
		if (line.length > 0 && !line.startsWith("#")) kept.push(line);
	}
	return kept.join("\n");
}

export async function readSourceTexts(root: string): Promise<string[]> {
	const files = await listTextFiles(root, "sources");
	const texts: string[] = [];
	for (const f of files) {
		const content = await readProjectFile(root, f.path);
		if (content !== null) texts.push(content);
	}
	return texts;
}

export async function readDraftText(root: string, relPath: string): Promise<string | null> {
	try {
		return await readFile(`${root}/${relPath}`, "utf-8");
	} catch {
		return null;
	}
}

function countParagraphs(text: string): number {
	return text
		.replace(/\r\n/g, "\n")
		.split(/\n\s*\n/)
		.filter((p) => p.trim().length > 0).length;
}

async function readSourceExcerpts(root: string, limit = SOURCE_EXCERPT_LIMIT): Promise<string[]> {
	const files = await listTextFiles(root, "sources");
	const excerpts: string[] = [];
	for (const f of files) {
		const content = await readProjectFile(root, f.path);
		if (content === null) continue;
		const trimmed = content.trim();
		excerpts.push(
			trimmed.length > limit ? `## ${f.path}（截断）\n\n${trimmed.slice(0, limit)}` : `## ${f.path}\n\n${trimmed}`,
		);
	}
	return excerpts;
}

/** Persist a review file (review-NNN.json, exclusive create) and bump state.reviewCount. */
export async function persistReviewFile(
	root: string,
	data: Omit<ReviewFile, "version" | "createdAt">,
): Promise<string> {
	// The review number probe and file write run inside the state lock so a concurrent
	// flow-turn write cannot interleave the read-modify-write.
	return updateState(root, async (state) => {
		const reviewNumber = state.reviewCount + 1;
		const relPath = reviewPathFor(reviewNumber);
		const review: ReviewFile = { version: 1, createdAt: new Date().toISOString(), ...data };
		await writeFile(`${root}/${relPath}`, `${JSON.stringify(review, null, "\t")}\n`, {
			encoding: "utf-8",
			flag: "wx",
		});
		state.reviewCount = reviewNumber;
		return relPath;
	});
}
