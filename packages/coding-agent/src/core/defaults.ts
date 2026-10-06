import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

export const DEFAULT_THINKING_LEVEL: ThinkingLevel = "medium";

/** Tools enabled at startup when `defaultTools` does not change them. */
// writer-pi: writing-first default toolset. bash/edit/write are not part of the
// writing flow (drafts are written via save_draft / revise_paragraph).
export const DEFAULT_TOOL_NAMES: readonly string[] = [
	"read",
	"save_draft",
	"revise_paragraph",
	"diff_versions",
	"revert_version",
];
export const THINKING_LEVEL_OPTIONS: readonly ThinkingLevel[] = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];
