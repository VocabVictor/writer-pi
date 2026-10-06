/**
 * Built-in Tool Renderer Example - Custom rendering for built-in tools
 *
 * Demonstrates how to override the rendering of built-in tools (read, save_draft)
 * without changing their behavior. Each tool is re-registered with the same name,
 * delegating execution to the original implementation while providing compact
 * custom renderCall/renderResult functions.
 *
 * This is useful for users who prefer more concise tool output, or who want to
 * highlight specific information (e.g., showing only the saved version for
 * save_draft, or just the line count for read).
 *
 * How it works:
 * - registerTool() with the same name as a built-in replaces it entirely
 * - We create the original definitions via createReadToolDefinition(), etc.
 *   and override only their renderers
 * - renderCall() controls what's shown when the tool is invoked
 * - renderResult() controls what's shown after execution completes
 * - The `expanded` flag in renderResult indicates whether the user has
 *   toggled the tool output open (via ctrl+e or clicking)
 *
 * Usage:
 *   pi -e ./builtin.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createReadToolDefinition, createSaveDraftToolDefinition, defineTool } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

interface SaveDraftDetails {
	path: string;
	version: number;
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// --- Read tool: show path and line count ---
	pi.registerTool(
		defineTool({
			...createReadToolDefinition(cwd),

			renderCall(args, theme, _context) {
				let text = theme.fg("toolTitle", theme.bold("read "));
				text += theme.fg("accent", args.path);
				if (args.offset || args.limit) {
					const parts: string[] = [];
					if (args.offset) parts.push(`offset=${args.offset}`);
					if (args.limit) parts.push(`limit=${args.limit}`);
					text += theme.fg("dim", ` (${parts.join(", ")})`);
				}
				return new Text(text, 0, 0);
			},

			renderResult(result, { expanded, isPartial }, theme, _context) {
				if (isPartial) return new Text(theme.fg("warning", "Reading..."), 0, 0);

				const details = result.details as { truncation?: { truncated: boolean; totalLines: number } } | undefined;
				const content = result.content[0];

				if (content?.type === "image") {
					return new Text(theme.fg("success", "Image loaded"), 0, 0);
				}

				if (content?.type !== "text") {
					return new Text(theme.fg("error", "No content"), 0, 0);
				}

				const lineCount = content.text.split("\n").length;
				let text = theme.fg("success", `${lineCount} lines`);

				if (details?.truncation?.truncated) {
					text += theme.fg("warning", ` (truncated from ${details.truncation.totalLines})`);
				}

				if (expanded) {
					const lines = content.text.split("\n").slice(0, 15);
					for (const line of lines) {
						text += `\n${theme.fg("dim", line)}`;
					}
					if (lineCount > 15) {
						text += `\n${theme.fg("muted", `... ${lineCount - 15} more lines`)}`;
					}
				}

				return new Text(text, 0, 0);
			},
		}),
	);

	// --- save_draft tool: show the saved version ---
	pi.registerTool(
		defineTool({
			...createSaveDraftToolDefinition(cwd),

			renderCall(args, theme, _context) {
				let text = theme.fg("toolTitle", theme.bold("save_draft "));
				const lineCount = args.content.split("\n").length;
				text += theme.fg("dim", ` (${lineCount} lines)`);
				if (args.note) {
					text += theme.fg("dim", ` — ${args.note}`);
				}
				return new Text(text, 0, 0);
			},

			renderResult(result, { isPartial }, theme, _context) {
				if (isPartial) return new Text(theme.fg("warning", "Saving..."), 0, 0);

				const content = result.content[0];
				if (content?.type === "text" && content.text.startsWith("Error")) {
					return new Text(theme.fg("error", content.text.split("\n")[0]), 0, 0);
				}

				const details = result.details as SaveDraftDetails | undefined;
				if (details) {
					return new Text(theme.fg("success", `saved ${details.path} (v${details.version})`), 0, 0);
				}
				return new Text(theme.fg("success", "saved"), 0, 0);
			},
		}),
	);
}
