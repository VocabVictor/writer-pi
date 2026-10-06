/**
 * Prompt Customizer Extension
 *
 * Demonstrates using systemPromptOptions to add context-aware prompt sections
 * without replacing or reparsing the complete rendered prompt.
 *
 * Usage:
 * 1. Copy this file to ~/.pi/agent/extensions/ or your project's .pi/extensions/
 * 2. Use the extension — it automatically adapts to your active tools and skills
 */

import type { BuildSystemPromptOptions, ExtensionAPI } from "@earendil-works/pi-coding-agent";

function buildToolGuidance(options: BuildSystemPromptOptions): string {
	const hasTool = (name: string) => options.selectedTools?.includes(name) ?? false;
	const rules: string[] = [];

	if (hasTool("read")) {
		rules.push(
			"- Use `read` for file contents; it supports text and images.",
			"- For large files, use `offset` and `limit` to read in chunks.",
		);
	}
	if (hasTool("save_draft")) {
		rules.push("- Use `save_draft` to save the full manuscript as a new draft version.");
	}
	if (hasTool("revise_paragraph")) {
		rules.push("- Use `revise_paragraph` for paragraph-level edits; copy the original paragraph verbatim.");
	}
	if (options.skills && options.skills.length > 0) {
		rules.push(`- Available skills: ${options.skills.map((skill) => skill.name).join(", ")}.`);
	}

	return rules.join("\n");
}

export default function promptCustomizer(pi: ExtensionAPI) {
	pi.on("before_agent_start", (event) => {
		const guidance = buildToolGuidance(event.systemPromptOptions);
		if (guidance) {
			event.systemPromptOptions.sections.tool_guidance = guidance;
		} else {
			delete event.systemPromptOptions.sections.tool_guidance;
		}
	});
}
