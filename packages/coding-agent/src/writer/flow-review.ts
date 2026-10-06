/**
 * Review-round helpers: run program checks on a draft and build the semantic-review
 * instruction; persist review files. Kept separate from the flow state machine.
 */

import { readFile, writeFile } from "node:fs/promises";
import { extractBannedWords, programIssuesAsLeads, runProgramChecks } from "./checker.ts";
import { allowedKinds } from "./genre-instructions.ts";
import type { GenreConfig } from "./genres/types.ts";
import { listTextFiles, parseLockedSentences, readBrief, readProjectFile, readState, writeState } from "./project.ts";
import { buildReviewInstruction } from "./prompts.ts";
import type { ProgramCheckResult, ReviewFile } from "./types.ts";
import { reviewPathFor } from "./versions.ts";

const SOURCE_EXCERPT_LIMIT = 4000;

export interface ReviewRoundPreparation {
	instruction: string;
	programChecks: ProgramCheckResult;
}

/** Run program checks (per the genre's switches) and build the next semantic-review instruction. */
export async function prepareReviewRound(
	root: string,
	draftPath: string,
	round: number,
	genre: GenreConfig,
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
	const briefContent = briefRaw
		? briefRaw
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("<!--") && !l.startsWith("-->"))
				.join("\n")
		: "";
	return {
		briefText: briefRaw,
		briefWasEmpty: briefContent.length === 0,
		lockedSentences: parseLockedSentences((await readProjectFile(root, "locked.md")) ?? ""),
		sourceFiles: await listTextFiles(root, "sources"),
	};
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
	const state = await readState(root);
	const reviewNumber = state.reviewCount + 1;
	const relPath = reviewPathFor(reviewNumber);
	const review: ReviewFile = { version: 1, createdAt: new Date().toISOString(), ...data };
	await writeFile(`${root}/${relPath}`, `${JSON.stringify(review, null, "\t")}\n`, { encoding: "utf-8", flag: "wx" });
	state.reviewCount = reviewNumber;
	await writeState(root, state);
	return relPath;
}
