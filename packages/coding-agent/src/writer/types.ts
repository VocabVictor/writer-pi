/**
 * writer-pi shared types for the writing project layout, reviews and flow state.
 */

/** Writing operations: what this task IS (维度三). */
export const WRITER_OPERATIONS = ["draft", "continue", "outline", "revise"] as const;
export type WriterOperation = (typeof WRITER_OPERATIONS)[number];

/** Kept as an alias for state.json compatibility with the first demo. */
export type WriterMode = WriterOperation;

export type WriterStage = "idle" | "outlining" | "sectioning" | "drafting" | "reviewing" | "revising";

/** Long-form (分节) progress; present in state.json only while a sectioned flow runs. */
export interface LongFormProgress {
	/** Planned section count from the outline. */
	sectionCount: number;
	/** Section currently being written (1-based). */
	sectionIndex: number;
}

/** Persisted in state.json at the writing project root. */
export interface WriterState {
	version: 1;
	stage: WriterStage;
	mode: WriterMode | null;
	/** Path of the current draft relative to the project root, e.g. "drafts/draft-002.md". */
	currentDraft: string | null;
	/** Monotonic counter; draft files are named draft-001.md, draft-002.md, … and never overwritten. */
	draftCount: number;
	/** Version notes keyed by draft version number, e.g. "1" -> "初稿". */
	draftNotes?: Record<string, string>;
	/** Monotonic counter for reviews/review-001.json, … */
	reviewCount: number;
	/** Number of completed revise rounds in the current flow. */
	revisionRounds: number;
	/** Current genre dimension (id); null until the first task. */
	genre: string | null;
	/** Current voice dimension: a voice/ file name or a free-text description. */
	voice: string | null;
	/** 输出格式维度（formats.ts 注册表的 id）；null 未设置。 */
	format: string | null;
	/** Verbatim request of the most recent /draft, /revise or /voice. */
	lastRequest: string | null;
	/** 分节（长文）进度；仅在分节流程进行中存在，流程收尾时移除。 */
	longForm?: LongFormProgress;
	updatedAt: string;
}

/** Genre-specific kinds, enabled per genre via GenreConfig.extraKinds. */
export const GENRE_ISSUE_KINDS = ["consistency", "unsourced_citation", "task_incomplete"] as const;

/** Universal kinds (see genres/types.ts BASE_ISSUE_KINDS) plus genre-specific ones. */
export const ISSUE_KINDS = [
	...([] as string[]).concat(
		[
			"meaning_drift",
			"unsourced_addition",
			"omission",
			"empty_elevation",
			"over_explanation",
			"formulaic_structure",
			"locked_violation",
			"other",
		],
		GENRE_ISSUE_KINDS,
	),
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

/** A paragraph replacement the reviewer outputs directly in a checking round (长文检查轮直改). */
export interface ReviewEdit {
	/** 1-based paragraph index in the reviewed draft. */
	paragraph: number;
	/** Verbatim paragraph from the draft to replace. */
	original: string;
	/** New paragraph content; empty string deletes the paragraph. */
	replacement: string;
}

export interface ProgramCheckResult {
	length: {
		/** 表意/音节文字按字符计（汉字、假名、谚文），字母文字按词计；对齐 brief 长度目标。 */
		wordCount: number;
		cjkChars: number;
		kanaChars: number;
		hangulChars: number;
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
	/** Unresolved citation markers (academic). Empty unless the genre enables citation checks. */
	citations: { marker: string; kind: string }[];
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

/** IO surface the writing flow drives (injected; mockable in tests). */
export interface FlowIO {
	sendUserMessage(text: string): void;
	setActiveTools(names: string[]): void;
	notify(message: string, type?: "info" | "warning" | "error"): void;
	/** Final flow summary, rendered to the user but not fed back to the model. */
	summary(markdown: string): void;
}

/** Dimension overrides for starting a flow. */
export interface StartOptions {
	/** /revise 基稿：项目内相对路径或绝对路径。 */
	baseDraftPath?: string;
	/** 显式指定体裁（--genre=）；未指定时由 inferGenre 推断。 */
	genre?: string;
	/** 文风维度：描述文本、"sample"（voice/ 样本）或 null（不使用）。 */
	voice?: string | null;
	/** 显式要求按分节方式写长文（--long）；未指定时由长度目标推断。 */
	long?: boolean;
	/** 显式指定输出格式（--format=）；未指定时用 settings 默认。 */
	format?: string;
}
