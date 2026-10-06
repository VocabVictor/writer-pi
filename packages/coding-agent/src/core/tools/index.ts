export { withFileMutationQueue } from "./filemutationqueue.ts";
export {
	createReadTool,
	createReadToolDefinition,
	type ReadOperations,
	type ReadToolDetails,
	type ReadToolInput,
	type ReadToolOptions,
} from "./read.ts";
export {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationOptions,
	type TruncationResult,
	truncateHead,
	truncateLine,
	truncateTail,
} from "./truncate.ts";

import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolDefinition } from "../extensions/types.ts";
import { createReadToolDefinition, type ReadToolOptions } from "./read.ts";
import { wrapToolDefinition } from "./wrapper.ts";
import {
	createDiffVersionsToolDefinition,
	createRevertVersionToolDefinition,
	createReviseParagraphToolDefinition,
	createSaveDraftToolDefinition,
	createUpdateContextToolDefinition,
} from "./writer.ts";

export type Tool = AgentTool<any>;
export type ToolDef = ToolDefinition<any, any>;
export type ToolName =
	| "read"
	| "save_draft"
	| "revise_paragraph"
	| "diff_versions"
	| "revert_version"
	| "update_context";

export interface ToolsOptions {
	read?: ReadToolOptions;
}

export {
	createDiffVersionsToolDefinition,
	createRevertVersionToolDefinition,
	createReviseParagraphToolDefinition,
	createSaveDraftToolDefinition,
	createUpdateContextToolDefinition,
	createWriterTools,
} from "./writer.ts";

// Writing is the product: the registry carries the reading and writing tools only —
// no shell/file-editing coding tools.
export function createAllToolDefinitions(cwd: string, options?: ToolsOptions): Record<ToolName, ToolDef> {
	return {
		read: createReadToolDefinition(cwd, options?.read),
		save_draft: createSaveDraftToolDefinition(cwd),
		revise_paragraph: createReviseParagraphToolDefinition(cwd),
		diff_versions: createDiffVersionsToolDefinition(cwd),
		revert_version: createRevertVersionToolDefinition(cwd),
		update_context: createUpdateContextToolDefinition(cwd),
	};
}

export function createAllTools(cwd: string, options?: ToolsOptions): AgentTool[] {
	return Object.values(createAllToolDefinitions(cwd, options)).map((definition) => wrapToolDefinition(definition));
}
