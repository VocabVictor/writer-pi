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
	/** Duplicate paragraph/sentence detection strictness. Also gates the long-form
	 * near-duplicate check: a genre that turns repetition detection off (fiction/poetry)
	 * keeps intentional refrains unflagged there too. */
	duplicates: "strict" | "loose" | "off";
	/** Locked sentences must survive verbatim. */
	locked: boolean;
	/** Citations in the draft must resolve against provided material/references. */
	citations: boolean;
	/** 长文程序检查开关（过长段落、跨段近似重复、等长段落、待补残留）；缺省关闭。 */
	longForm?: LongFormCheckSwitch;
	/** AI 味程序检查开关（中文词表+结构正则加权打分，千字归一化）；缺省关闭。 */
	aitone?: AitoneCheckSwitch;
}

/** AI 味检查开关：阈值与词表按体裁条件化（正式体裁阈值更高，文学类开指纹词）。 */
export interface AitoneCheckSwitch {
	enabled: boolean;
	/** 加权分值达到该值才产生线索（0-100）；缺省 25（MEDIUM）。 */
	threshold?: number;
	/** 小说指纹词检测（文学类开，应用类不开）；缺省 false。 */
	fingerprint?: boolean;
	/** 句长方差检查（学术摘要等分场景特征，通用场景实测不成立）；缺省 false。 */
	burstiness?: boolean;
}

/** 长文结构/节奏/线索规则（模型判断维度），字数达到阈值或 brief 明确要求长文时注入。 */
export interface LongFormRules {
	/** 字数达到该值按长文处理；brief 明确要求长文/长篇时不受此限。 */
	threshold: number;
	/** 长文如何组织：章节/小节/论证链/场景目标。规则文本具体可执行。 */
	structure: string[];
	/** 段落长度、信息密度与场景/论证的交替。 */
	pacing: string[];
	/** 伏笔、前后呼应与跨章节一致性。 */
	tracking: string[];
}

/** 长文程序检查开关，由 checker 按体裁配置运行。 */
export interface LongFormCheckSwitch {
	enabled: boolean;
	/** 单段字数上限（字数=中文字符+英文单词+数字组），超过报告过长段落；缺省 500。 */
	maxParagraphChars?: number;
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
	/** 长文规则（结构/节奏/线索）；缺省 = 本体裁不区分长文。 */
	longForm?: LongFormRules;

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
