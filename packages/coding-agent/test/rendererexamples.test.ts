import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@earendil-works/pi-ai/compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DefaultResourceLoader } from "../src/core/resourceloader.ts";
import { createAgentSession } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/sessionmanager.ts";
import { SettingsManager } from "../src/core/settingsmanager.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

const examplesDir = join(import.meta.dirname, "../examples/extensions");

describe("tool renderer examples", () => {
	let tempDir: string;
	let agentDir: string;

	beforeAll(() => {
		initTheme("dark");
	});

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-tool-renderer-example-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	async function getSystemPrompt(extensionPath: string | undefined, tools: string[]) {
		const settingsManager = SettingsManager.inMemory();
		const resourceLoader = new DefaultResourceLoader({
			cwd: tempDir,
			agentDir,
			settingsManager,
			noExtensions: true,
			noSkills: true,
			noPromptTemplates: true,
			noThemes: true,
			noContextFiles: true,
			additionalExtensionPaths: extensionPath ? [extensionPath] : [],
		});
		await resourceLoader.reload();
		expect(resourceLoader.getExtensions().errors).toEqual([]);
		const { session } = await createAgentSession({
			cwd: tempDir,
			agentDir,
			model: getModel("anthropic", "claude-sonnet-4-5"),
			settingsManager,
			sessionManager: SessionManager.inMemory(tempDir),
			resourceLoader,
			tools,
		});
		try {
			return session.systemPrompt;
		} finally {
			session.dispose();
		}
	}

	it.each([
		{
			name: "built-in tool renderer",
			extensionPath: join(examplesDir, "builtin.ts"),
			tools: ["read", "save_draft"],
		},
		{
			name: "minimal mode",
			extensionPath: join(examplesDir, "minimal.ts"),
			tools: ["read", "save_draft", "revise_paragraph", "diff_versions"],
		},
	])("keeps the system prompt unchanged for the $name example", async ({ extensionPath, tools }) => {
		// Regression test for https://github.com/earendil-works/pi/issues/10072
		const baseline = await getSystemPrompt(undefined, tools);
		const withRenderer = await getSystemPrompt(extensionPath, tools);

		expect(withRenderer).toBe(baseline);
	});

	it("keeps minimal mode's re-registered tools in the default shell", async () => {
		// Regression test for https://github.com/earendil-works/pi/issues/10072
		const settingsManager = SettingsManager.inMemory();
		const resourceLoader = new DefaultResourceLoader({
			cwd: tempDir,
			agentDir,
			settingsManager,
			noExtensions: true,
			noSkills: true,
			noPromptTemplates: true,
			noThemes: true,
			noContextFiles: true,
			additionalExtensionPaths: [join(examplesDir, "minimal.ts")],
		});
		await resourceLoader.reload();
		const { session } = await createAgentSession({
			cwd: tempDir,
			agentDir,
			model: getModel("anthropic", "claude-sonnet-4-5"),
			settingsManager,
			sessionManager: SessionManager.inMemory(tempDir),
			resourceLoader,
			tools: ["save_draft"],
		});
		try {
			const definition = session.getToolDefinition("save_draft");
			if (!definition) throw new Error("minimal mode did not register the save_draft tool");
			// Renderer overrides only; the shell framing is not forced.
			expect(definition.renderShell).toBeUndefined();
		} finally {
			session.dispose();
		}
	});
});
