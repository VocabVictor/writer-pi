/**
 * Genre configuration contract. Each genre is a separate module under src/writer/genres/
 * so different genres can define their own inputs, creation boundaries, stages,
 * persistent context, review dimensions, tools and completion criteria.
 */

export interface GenreContextFile {
	/** File name inside the project's context/ directory. */
	file: string;
	title: string;
	/** When the model should create/update it. */
	description: string;
	template: string;
}

export interface GenreStage {
	/** Stage id, e.g. "outline" | "draft" | "revise" | "verify". */
	id: string;
	title: string;
	/** Guidance injected into the instruction of the matching operation. */
	guidance: string;
}

export interface GenreChecks {
	/** Enforce the length target from brief.md. */
	length: boolean;
	/** Enforce banned words from brief.md. */
	bannedWords: boolean;
	/** Duplicate paragraph/sentence detection strictness. */
	duplicates: "strict" | "loose" | "off";
	/** Locked sentences must survive verbatim. */
	locked: boolean;
	/** Citations in the draft must resolve against provided material/references. */
	citations: boolean;
}

/**
 * A genre configuration. Everything the writing flow needs to run differently
 * for this genre; the generic pipeline stays in flow.ts.
 */
export interface GenreConfig {
	id: string;
	name: string;
	/** Experimental genres are clearly labeled and not claimed as verified. */
	experimental?: boolean;
	description: string;

	// -- 1. required input material -----------------------------------------
	requiredInputs: string[];
	optionalInputs: string[];

	// -- 2. creation vs. sourced content ------------------------------------
	creation: {
		/** What the model may invent within user-set boundaries. */
		allowed: string;
		/** What must trace back to user-provided material. */
		requiresSource: string;
	};

	// -- 3. recommended writing stages ---------------------------------------
	stages: GenreStage[];

	// -- 4. persistent context ------------------------------------------------
	/** Files under the project's context/ directory. null = genre has none. */
	context: { files: GenreContextFile[] } | null;

	// -- 5. review dimensions -------------------------------------------------
	/** Semantic-review focus lines, in addition to the universal ones. */
	reviewFocus: string[];
	/** Extra issue kinds this genre's reviewer may use. */
	extraKinds: string[];
	/** Program-check switches for this genre. */
	checks: GenreChecks;

	// -- 6. genre-specific tools ----------------------------------------------
	/** Tool names (beyond read/save_draft/revise_paragraph/diff_versions/revert_version). */
	tools: string[];

	// -- 7. completion criteria ------------------------------------------------
	completion: string[];

	// -- supported operations --------------------------------------------------
	/** Subset of "draft" | "continue" | "outline" | "revise". */
	operations: string[];
}

/** Universal issue kinds every genre may use. */
export const BASE_ISSUE_KINDS = [
	"meaning_drift",
	"unsourced_addition",
	"omission",
	"empty_elevation",
	"over_explanation",
	"formulaic_structure",
	"locked_violation",
	"other",
] as const;
