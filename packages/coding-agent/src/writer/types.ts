/**
 * writer-pi shared types for the writing project layout, reviews and flow state.
 */

export type WriterMode = "draft" | "revise" | "voice";

export type WriterStage = "idle" | "drafting" | "reviewing" | "revising";

/** Persisted in state.json at the writing project root. */
export interface WriterState {
	version: 1;
	stage: WriterStage;
	mode: WriterMode | null;
	/** Path of the current draft relative to the project root, e.g. "drafts/draft-002.md". */
	currentDraft: string | null;
	/** Monotonic counter; draft files are named draft-001.md, draft-002.md, … and never overwritten. */
	draftCount: number;
	/** Monotonic counter for reviews/review-001.json, … */
	reviewCount: number;
	/** Number of completed revise rounds in the current flow. */
	revisionRounds: number;
	/** Verbatim request of the most recent /draft, /revise or /voice. */
	lastRequest: string | null;
	updatedAt: string;
}

export const ISSUE_KINDS = [
	"meaning_drift",
	"unsourced_addition",
	"omission",
	"empty_elevation",
	"over_explanation",
	"formulaic_structure",
	"locked_violation",
	"other",
] as const;

export type IssueKind = (typeof ISSUE_KINDS)[number];

/** One model or program finding. Quote must be an exact substring of the draft it refers to. */
export interface ReviewIssue {
	kind: IssueKind;
	/** 1-based paragraph index in the reviewed draft. */
	paragraph: number;
	/** Verbatim quote from the draft. */
	quote: string;
	reason: string;
	suggestion?: string;
	/** Quote from the source material that supports the finding, when applicable. */
	source_quote?: string;
}

export interface ProgramCheckResult {
	length: {
		/** CJK characters + latin words + digit groups; the statistic used against the brief target. */
		wordCount: number;
		cjkChars: number;
		latinWords: number;
		digitGroups: number;
		totalCharsNoWhitespace: number;
		target: { min: number | null; max: number | null; raw: string } | null;
		withinTarget: boolean | null;
	};
	bannedWords: { word: string; count: number }[];
	duplicateParagraphs: { paragraph: number; quote: string }[];
	duplicateSentences: { quote: string; count: number }[];
	lockedMissing: string[];
}

/** Persisted in reviews/review-NNN.json. */
export interface ReviewFile {
	version: 1;
	round: number;
	/** Draft path (relative to project root) the review applies to. */
	draftPath: string;
	programChecks: ProgramCheckResult;
	/** Model-verified semantic issues (program findings only after model confirmation). */
	issues: ReviewIssue[];
	/** Findings dropped during validation, with reasons — kept for transparency. */
	validationWarnings: string[];
	/** When the model output could not be parsed, the raw output is kept here. */
	rawModelOutput?: string;
	createdAt: string;
}

export interface DraftVersionInfo {
	/** Path relative to the project root, e.g. "drafts/draft-001.md". */
	path: string;
	version: number;
	note: string | null;
	createdAt: string;
}
