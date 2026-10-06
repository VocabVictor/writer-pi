/**
 * Minimal Mode Example - Demonstrates a "minimal" tool display mode
 *
 * This extension overrides built-in writing tools to provide custom rendering:
 * - Collapsed mode: Only shows the tool call, no output
 * - Expanded mode: Shows full output like the built-in renderers
 *
 * This demonstrates how a "minimal mode" could work, where ctrl+o cycles through:
 * - Standard: Shows truncated output (current default)
 * - Expanded: Shows full output (current expanded)
 * - Minimal: Shows only tool call, no output (this extension's collapsed mode)
 *
 * Usage:
 *   pi -e ./minimal.ts
 *
 * Then use ctrl+o to toggle between minimal (collapsed) and full (expanded) views.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	createDiffVersionsToolDefinition,
	createReadToolDefinition,
	createReviseParagraphToolDefinition,
	createSaveDraftToolDefinition,
	defineTool,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { homedir } from "os";

/**
 * Shorten a path by replacing home directory with ~
 */
function shortenPath(path: string): string {
	const home = homedir();
	if (path.startsWith(home)) {
		return `~${path.slice(home.length)}`;
	}
	return path;
}

/** Minimal mode: show nothing in collapsed state, else the rendered text. */
function minimalResult(expanded: boolean, theme: { fg: any }, text: string | undefined) {
	if (!expanded || !text) {
		return new Text("", 0, 0);
	}
	const output = text
		.trim()
		.split("\n")
		.map((line) => theme.fg("toolOutput", line))
		.join("\n");
	return new Text(output ? `\n${output}` : "", 0, 0);
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string | undefined {
	const content = result.content.find((c) => c.type === "text");
	return content?.type === "text" ? content.text : undefined;
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// =========================================================================
	// Read Tool
	// =========================================================================
	pi.registerTool(
		defineTool({
			...createReadToolDefinition(cwd),

			renderCall(args, theme, _context) {
				const path = shortenPath(args.path || "");
				let pathDisplay = path ? theme.fg("accent", path) : theme.fg("toolOutput", "...");

				// Show line range if specified
				if (args.offset !== undefined || args.limit !== undefined) {
					const startLine = args.offset ?? 1;
					const endLine = args.limit !== undefined ? startLine + args.limit - 1 : "";
					pathDisplay += theme.fg("warning", `:${startLine}${endLine ? `-${endLine}` : ""}`);
				}

				return new Text(`${theme.fg("toolTitle", theme.bold("read"))} ${pathDisplay}`, 0, 0);
			},

			renderResult(result, { expanded }, theme, _context) {
				return minimalResult(expanded, theme, textOf(result));
			},
		}),
	);

	// =========================================================================
	// save_draft Tool
	// =========================================================================
	pi.registerTool(
		defineTool({
			...createSaveDraftToolDefinition(cwd),

			renderCall(args, theme, _context) {
				const lineCount = args.content.split("\n").length;
				const note = args.note ? theme.fg("muted", ` — ${args.note}`) : "";
				return new Text(
					`${theme.fg("toolTitle", theme.bold("save_draft"))} ${theme.fg("muted", `(${lineCount} lines)`)}${note}`,
					0,
					0,
				);
			},

			renderResult(result, { expanded }, theme, _context) {
				return minimalResult(expanded, theme, textOf(result));
			},
		}),
	);

	// =========================================================================
	// revise_paragraph Tool
	// =========================================================================
	pi.registerTool(
		defineTool({
			...createReviseParagraphToolDefinition(cwd),

			renderCall(args, theme, _context) {
				const firstLine = args.original.split("\n")[0].slice(0, 60);
				return new Text(
					`${theme.fg("toolTitle", theme.bold("revise_paragraph"))} ${theme.fg("accent", firstLine)}`,
					0,
					0,
				);
			},

			renderResult(result, { expanded }, theme, _context) {
				return minimalResult(expanded, theme, textOf(result));
			},
		}),
	);

	// =========================================================================
	// diff_versions Tool
	// =========================================================================
	pi.registerTool(
		defineTool({
			...createDiffVersionsToolDefinition(cwd),

			renderCall(args, theme, _context) {
				const from = args.from ? theme.fg("accent", args.from) : theme.fg("muted", "prev");
				const to = args.to ? theme.fg("accent", args.to) : theme.fg("muted", "latest");
				return new Text(`${theme.fg("toolTitle", theme.bold("diff_versions"))} ${from} → ${to}`, 0, 0);
			},

			renderResult(result, { expanded }, theme, _context) {
				return minimalResult(expanded, theme, textOf(result));
			},
		}),
	);
}
