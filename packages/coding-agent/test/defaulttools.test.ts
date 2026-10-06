import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@earendil-works/pi-ai/compat";
import { Type } from "typebox";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultResourceLoader } from "../src/core/resourceloader.ts";
import { type CreateAgentSessionOptions, createAgentSession, type InlineExtension } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/sessionmanager.ts";
import { createAgentSessionFromServices, createAgentSessionServices } from "../src/core/sessionservices.ts";
import { SettingsManager } from "../src/core/settingsmanager.ts";

type ToolOptions = Pick<CreateAgentSessionOptions, "tools" | "excludeTools" | "noTools" | "customTools">;

const ALL_WRITING_TOOLS = [
	"read",
	"save_draft",
	"revise_paragraph",
	"diff_versions",
	"revert_version",
	"update_context",
].sort();

describe("defaultTools setting", () => {
	let tempDir: string;
	let agentDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-default-tools-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	async function createSession(
		defaultTools: string[],
		options: ToolOptions = {},
		extensionFactories: InlineExtension[] = [],
	) {
		const settingsManager = SettingsManager.inMemory({ defaultTools });
		const resourceLoader = new DefaultResourceLoader({
			cwd: tempDir,
			agentDir,
			settingsManager,
			extensionFactories,
		});
		await resourceLoader.reload();

		return (
			await createAgentSession({
				cwd: tempDir,
				agentDir,
				model: getModel("anthropic", "claude-sonnet-4-5")!,
				settingsManager,
				sessionManager: SessionManager.inMemory(tempDir),
				resourceLoader,
				...options,
			})
		).session;
	}

	it("uses the configured list as the initial built-in selection", async () => {
		const session = await createSession(["read", "diff_versions"]);

		expect(
			session
				.getAllTools()
				.map((tool) => tool.name)
				.sort(),
		).toEqual(ALL_WRITING_TOOLS);
		expect(session.getActiveToolNames()).toEqual(["read", "diff_versions"]);
		expect(session.systemPrompt).toContain("- read:");
		expect(session.systemPrompt).toContain("- diff_versions:");
		expect(session.systemPrompt).not.toContain("- save_draft:");
		session.dispose();
	});

	it("leaves unselected writing tools inactive", async () => {
		const session = await createSession(["read"]);

		expect(session.getActiveToolNames()).toEqual(["read"]);
		expect(session.systemPrompt).toContain("- read:");
		expect(session.systemPrompt).not.toContain("- revise_paragraph:");
		session.dispose();
	});

	it("activates an inactive extension tool with +name", async () => {
		const session = await createSession(["+inactive_tool", "-update_context"], {}, [
			(pi) => {
				pi.registerTool({
					name: "inactive_tool",
					label: "Inactive Tool",
					description: "Extension tool registered inactive",
					parameters: Type.Object({}),
					execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
					defaultActive: false,
				});
			},
		]);

		// A modifier-only list is appended to the writing-first defaults, so `-update_context` is a no-op.
		expect(session.getActiveToolNames().sort()).toEqual([
			"diff_versions",
			"inactive_tool",
			"read",
			"revert_version",
			"revise_paragraph",
			"save_draft",
		]);
		session.dispose();
	});

	it("keeps extension and SDK custom tools enabled", async () => {
		const session = await createSession(
			["read"],
			{
				customTools: [
					{
						name: "sdk_tool",
						label: "SDK Tool",
						description: "SDK custom tool",
						parameters: Type.Object({}),
						execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
					},
				],
			},
			[
				(pi) => {
					pi.registerTool({
						name: "static_tool",
						label: "Static Tool",
						description: "Statically registered extension tool",
						parameters: Type.Object({}),
						execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
					});
					pi.on("session_start", () => {
						pi.registerTool({
							name: "dynamic_tool",
							label: "Dynamic Tool",
							description: "Dynamically registered extension tool",
							parameters: Type.Object({}),
							execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
						});
					});
				},
			],
		);
		await session.bindExtensions({});

		expect(session.getActiveToolNames().sort()).toEqual(["dynamic_tool", "read", "sdk_tool", "static_tool"]);
		expect(session.getAllTools().map((tool) => tool.name)).toEqual(
			expect.arrayContaining(["save_draft", "dynamic_tool", "sdk_tool", "static_tool"]),
		);
		session.dispose();
	});

	it("preserves explicit tool option precedence", async () => {
		const allowlistedSession = await createSession(["read"], { tools: ["update_context"] });
		expect(allowlistedSession.getActiveToolNames()).toEqual(["update_context"]);
		allowlistedSession.dispose();

		const excludedSession = await createSession(["read", "save_draft"], { excludeTools: ["read"] });
		expect(excludedSession.getActiveToolNames()).toEqual(["save_draft"]);
		excludedSession.dispose();

		const toolLessSession = await createSession(["read"], { noTools: "all" });
		expect(toolLessSession.getAllTools()).toEqual([]);
		expect(toolLessSession.getActiveToolNames()).toEqual([]);
		toolLessSession.dispose();
	});

	describe("reload", () => {
		const inactiveTool: InlineExtension = (pi) => {
			pi.registerTool({
				name: "inactive_tool",
				label: "Inactive Tool",
				description: "Extension tool registered inactive",
				parameters: Type.Object({}),
				execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
				defaultActive: false,
			});
		};

		const writeSettings = (settings: object) =>
			writeFileSync(join(agentDir, "settings.json"), JSON.stringify(settings));

		async function createFileSession(options: ToolOptions = {}) {
			const settingsManager = SettingsManager.create(tempDir, agentDir);
			const resourceLoader = new DefaultResourceLoader({
				cwd: tempDir,
				agentDir,
				settingsManager,
				extensionFactories: [inactiveTool],
			});
			await resourceLoader.reload();
			return (
				await createAgentSession({
					cwd: tempDir,
					agentDir,
					model: getModel("anthropic", "claude-sonnet-4-5")!,
					settingsManager,
					sessionManager: SessionManager.inMemory(tempDir),
					resourceLoader,
					...options,
				})
			).session;
		}

		// #10245
		it("activates only tools newly added to defaultTools", async () => {
			const session = await createFileSession();
			expect(session.getActiveToolNames()).toEqual([
				"read",
				"save_draft",
				"revise_paragraph",
				"diff_versions",
				"revert_version",
			]);
			session.setActiveToolsByName(["read", "revise_paragraph", "save_draft"]);

			writeSettings({ defaultTools: ["+inactive_tool", "+diff_versions"] });
			await session.reload();
			// diff_versions was disabled during the session and is not newly added, so it stays off.
			expect(session.getActiveToolNames().sort()).toEqual([
				"inactive_tool",
				"read",
				"revise_paragraph",
				"save_draft",
			]);

			// Removing tools from the setting does not disable them.
			writeSettings({ defaultTools: ["-read"] });
			await session.reload();
			expect(session.getActiveToolNames().sort()).toEqual([
				"inactive_tool",
				"read",
				"revise_paragraph",
				"save_draft",
			]);
			session.dispose();
		});

		it("keeps explicit tool options on reload", async () => {
			const allowlisted = await createFileSession({ tools: ["read"] });
			writeSettings({ defaultTools: ["+diff_versions"] });
			await allowlisted.reload();
			expect(allowlisted.getActiveToolNames()).toEqual(["read"]);
			allowlisted.dispose();

			writeSettings({});
			const builtinless = await createFileSession({ noTools: "builtin" });
			writeSettings({ defaultTools: ["+diff_versions"] });
			await builtinless.reload();
			expect(builtinless.getActiveToolNames()).toEqual([]);
			builtinless.dispose();

			writeSettings({});
			const excluded = await createFileSession({ excludeTools: ["diff_versions"] });
			writeSettings({ defaultTools: ["+diff_versions", "+inactive_tool"] });
			await excluded.reload();
			expect(excluded.getActiveToolNames().sort()).toEqual([
				"inactive_tool",
				"read",
				"revert_version",
				"revise_paragraph",
				"save_draft",
			]);
			excluded.dispose();
		});
	});

	it("applies through service-based session creation", async () => {
		const settingsManager = SettingsManager.inMemory({ defaultTools: ["update_context"] });
		const services = await createAgentSessionServices({ cwd: tempDir, agentDir, settingsManager });
		const { session } = await createAgentSessionFromServices({
			services,
			sessionManager: SessionManager.inMemory(tempDir),
			model: getModel("anthropic", "claude-sonnet-4-5")!,
		});

		expect(
			session
				.getAllTools()
				.map((tool) => tool.name)
				.sort(),
		).toEqual(ALL_WRITING_TOOLS);
		expect(session.getActiveToolNames()).toEqual(["update_context"]);
		session.dispose();
	});
});
