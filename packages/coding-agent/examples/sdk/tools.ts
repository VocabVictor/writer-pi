/**
 * Tools Configuration
 *
 * Use tool names to choose which built-in tools are enabled.
 *
 * Tool names are matched against all available tools. If you use a custom `cwd`,
 * createAgentSession() applies that cwd when it builds the actual built-in tools.
 *
 * For custom tools, see extensions.ts - custom tools are registered via the
 * extensions system using pi.registerTool().
 */

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

// Reading-only mode (no writing tools)
const { session: readSession } = await createAgentSession({
	tools: ["read"],
	sessionManager: SessionManager.inMemory(),
});
console.log("Read-only session created");
readSession.dispose();

// Custom tool selection
const { session: customToolsSession } = await createAgentSession({
	tools: ["read", "save_draft", "diff_versions"],
	sessionManager: SessionManager.inMemory(),
});
console.log("Custom tools session created");
customToolsSession.dispose();

// With custom cwd
const customCwd = "/path/to/project";
const { session: customCwdSession } = await createAgentSession({
	cwd: customCwd,
	tools: ["read", "save_draft", "revise_paragraph"],
	sessionManager: SessionManager.inMemory(customCwd),
});
console.log("Custom cwd session created");
customCwdSession.dispose();

// Or pick specific tools for custom cwd
const { session: specificToolsSession } = await createAgentSession({
	cwd: customCwd,
	tools: ["read", "update_context"],
	sessionManager: SessionManager.inMemory(customCwd),
});
console.log("Specific tools with custom cwd session created");
specificToolsSession.dispose();
