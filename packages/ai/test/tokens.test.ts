import { once } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { beforeAll, describe, expect, it } from "vitest";
import { getModel, getModels, stream } from "../src/compat.ts";
import type { Api, Context, Model, StreamOptions } from "../src/types.ts";

type StreamOptionsWithExtras = StreamOptions & Record<string, unknown>;

import { hasAzureOpenAICredentials, resolveAzureDeploymentName } from "./azureutils.ts";
import { hasBedrockCredentials } from "./bedrockutils.ts";
import { hasCloudflareAiGatewayCredentials, hasCloudflareWorkersAICredentials } from "./cloudflareutils.ts";
import { allowCredentialRefresh, readApiKey, resolveApiKey } from "./oauth.ts";

let anthropicOAuthToken = readApiKey("anthropic");
let githubCopilotToken = readApiKey("github-copilot");
let openaiCodexToken = readApiKey("openai-codex");

beforeAll(async () => {
	// Refresh expired OAuth tokens only once tests run; module load and skip-only runs stay network-free.
	allowCredentialRefresh();
	anthropicOAuthToken = (await resolveApiKey("anthropic")) ?? anthropicOAuthToken;
	githubCopilotToken = (await resolveApiKey("github-copilot")) ?? githubCopilotToken;
	openaiCodexToken = (await resolveApiKey("openai-codex")) ?? openaiCodexToken;
});

async function testTokensOnAbort<TApi extends Api>(llm: Model<TApi>, options: StreamOptionsWithExtras = {}) {
	const context: Context = {
		messages: [
			{
				role: "user",
				content: "Write a long poem with 20 stanzas about the beauty of nature.",
				timestamp: Date.now(),
			},
		],
		systemPrompt: "You are a helpful assistant.",
	};

	const controller = new AbortController();
	const response = stream(llm, context, { ...options, signal: controller.signal });

	let abortFired = false;
	let text = "";
	for await (const event of response) {
		if (!abortFired && (event.type === "text_delta" || event.type === "thinking_delta")) {
			text += event.delta;
			if (text.length >= 1000) {
				abortFired = true;
				controller.abort();
			}
		}
	}

	const msg = await response.result();

	expect(msg.stopReason).toBe("aborted");

	// OpenAI providers, OpenAI Codex, zai, and Amazon Bedrock only send usage in the final chunk,
	// so when aborted they have no token stats. Anthropic and Google send usage information early in the stream.
	// MiniMax and Kimi report input tokens but not output tokens differently on aborted requests.
	if (
		llm.api === "openai-completions" ||
		llm.api === "mistral-conversations" ||
		llm.api === "openai-responses" ||
		llm.api === "azure-openai-responses" ||
		llm.api === "openai-codex-responses" ||
		llm.provider === "zai" ||
		llm.provider === "amazon-bedrock" ||
		llm.provider === "vercel-ai-gateway"
	) {
		expect(msg.usage.input).toBe(0);
		expect(msg.usage.output).toBe(0);
	} else if (llm.provider === "minimax") {
		// MiniMax M2.7 does not report token usage for aborted requests.
		expect(msg.usage.input).toBe(0);
		expect(msg.usage.output).toBe(0);
	} else if (llm.provider === "kimi-coding") {
		// Kimi reports input tokens early but output tokens only in the final chunk.
		expect(msg.usage.input).toBeGreaterThan(0);
		expect(msg.usage.output).toBe(0);
	} else {
		expect(msg.usage.input).toBeGreaterThan(0);
		expect(msg.usage.output).toBeGreaterThan(0);

		// Some providers (Copilot) have zero cost rates
		if (llm.cost.input > 0) {
			expect(msg.usage.cost.input).toBeGreaterThan(0);
			expect(msg.usage.cost.total).toBeGreaterThan(0);
		}
	}
}

describe("Token Statistics on Abort", () => {
	// Xiaomi and other OpenAI-compatible endpoints send usage only in the final chunk,
	// so an aborted stream has no token counts; this pins the transport contract the
	// xiaomi blocks below assert against the live API without needing credentials.
	describe("OpenAI-compatible transport (mocked endpoint)", () => {
		it("reports zero usage when aborted before the final usage chunk", async () => {
			const server = http.createServer((req, res) => {
				if (req.method !== "POST" || req.url !== "/chat/completions") {
					res.writeHead(404).end();
					return;
				}
				res.writeHead(200, {
					"content-type": "text/event-stream",
					"cache-control": "no-cache",
					connection: "keep-alive",
				});
				res.on("error", () => {});
				// Stream deltas but never reach the usage-bearing final chunk; the abort closes the socket.
				for (let i = 0; i < 200; i++) {
					res.write(
						`data: ${JSON.stringify({
							id: "chatcmpl-mock",
							object: "chat.completion.chunk",
							created: 0,
							model: "mimo-v2.5-pro",
							choices: [{ index: 0, delta: { content: "word " }, finish_reason: null }],
						})}\n\n`,
					);
				}
			});
			server.listen(0, "127.0.0.1");
			await once(server, "listening");

			try {
				const { port } = server.address() as AddressInfo;
				const xiaomi = getModel("xiaomi", "mimo-v2.5-pro");
				const llm = { ...xiaomi, baseUrl: `http://127.0.0.1:${port}` };
				const context: Context = {
					messages: [{ role: "user", content: "Write a long poem.", timestamp: Date.now() }],
					systemPrompt: "You are a helpful assistant.",
				};

				const controller = new AbortController();
				const response = stream(llm, context, { apiKey: "mock-key", signal: controller.signal });
				let text = "";
				for await (const event of response) {
					if (event.type === "text_delta") {
						text += event.delta;
						if (text.length >= 50) controller.abort();
					}
				}

				const msg = await response.result();
				expect(msg.stopReason).toBe("aborted");
				expect(msg.usage.input).toBe(0);
				expect(msg.usage.output).toBe(0);
			} finally {
				server.close();
				await once(server, "close");
			}
		});
	});

	describe.skipIf(!process.env.GEMINI_API_KEY)("Google Provider", () => {
		const llm = getModel("google", "gemini-2.5-flash");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm, { thinking: { enabled: true } });
		});
	});

	describe.skipIf(!process.env.OPENAI_API_KEY)("OpenAI Completions Provider", () => {
		const { compat: _compat, ...baseModel } = getModel("openai", "gpt-4o-mini")!;
		void _compat;
		const llm: Model<"openai-completions"> = {
			...baseModel,
			api: "openai-completions",
		};

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.OPENAI_API_KEY)("OpenAI Responses Provider", () => {
		const llm = getModel("openai", "gpt-5.4-mini");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm, { reasoningEffort: "low" });
		});
	});

	describe.skipIf(!hasAzureOpenAICredentials())("Azure OpenAI Responses Provider", () => {
		const llm = getModel("azure-openai-responses", "gpt-4o-mini");
		const azureDeploymentName = resolveAzureDeploymentName(llm.id);
		const azureOptions = azureDeploymentName ? { azureDeploymentName } : {};

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm, azureOptions);
		});
	});

	describe.skipIf(!process.env.ANTHROPIC_API_KEY)("Anthropic Provider", () => {
		const llm = getModel("anthropic", "claude-sonnet-4-6");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.XAI_API_KEY)("xAI Provider", () => {
		const llm = getModel("xai", "grok-4.3");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.GROQ_API_KEY)("Groq Provider", () => {
		const llm = getModel("groq", "openai/gpt-oss-20b");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.CEREBRAS_API_KEY)("Cerebras Provider", () => {
		const preferredCerebrasModelIds: string[] = ["gpt-oss-120b", "zai-glm-4.7", "llama3.1-8b"];
		const cerebrasModels = getModels("cerebras");
		const llm = cerebrasModels.find((model) => preferredCerebrasModelIds.includes(model.id)) ?? cerebrasModels[0];

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			if (!llm) {
				throw new Error("No Cerebras models available");
			}

			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!hasCloudflareWorkersAICredentials())("Cloudflare Workers AI Provider", () => {
		const llm = getModel("cloudflare-workers-ai", "@cf/moonshotai/kimi-k2.6");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!hasCloudflareAiGatewayCredentials())("Cloudflare AI Gateway Provider", () => {
		const llm = getModel("cloudflare-ai-gateway", "workers-ai/@cf/moonshotai/kimi-k2.6");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.HF_TOKEN)("Hugging Face Provider", () => {
		const llm = getModel("huggingface", "moonshotai/Kimi-K2.5");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.TOGETHER_API_KEY)("Together AI Provider", () => {
		const llm = getModel("together", "moonshotai/Kimi-K3");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.BASETEN_API_KEY)("Baseten Provider", () => {
		const llm = getModel("baseten", "zai-org/GLM-5.2");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm, { reasoningEffort: "high" });
		});
	});

	describe.skipIf(!process.env.ZAI_API_KEY)("zAI Provider", () => {
		const llm = getModel("zai", "glm-5.2");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.MISTRAL_API_KEY)("Mistral Provider", () => {
		const llm = getModel("mistral", "devstral-medium-latest");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.MINIMAX_API_KEY)("MiniMax Provider", () => {
		const llm = getModel("minimax", "MiniMax-M2.7");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.KIMI_API_KEY)("Kimi For Coding Provider", () => {
		const llm = getModel("kimi-coding", "kimi-for-coding");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.META_API_KEY)("Meta Provider", () => {
		const llm = getModel("meta", "muse-spark-1.3");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.AI_GATEWAY_API_KEY)("Vercel AI Gateway Provider", () => {
		const llm = getModel("vercel-ai-gateway", "google/gemini-2.5-flash");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.XIAOMI_API_KEY)("Xiaomi MiMo (API billing) Provider", () => {
		const llm = getModel("xiaomi", "mimo-v2.5-pro");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.XIAOMI_TOKEN_PLAN_CN_API_KEY)("Xiaomi MiMo Token Plan (CN) Provider", () => {
		const llm = getModel("xiaomi-token-plan-cn", "mimo-v2.5-pro");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.XIAOMI_TOKEN_PLAN_AMS_API_KEY)("Xiaomi MiMo Token Plan (AMS) Provider", () => {
		const llm = getModel("xiaomi-token-plan-ams", "mimo-v2.5-pro");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.XIAOMI_TOKEN_PLAN_SGP_API_KEY)("Xiaomi MiMo Token Plan (SGP) Provider", () => {
		const llm = getModel("xiaomi-token-plan-sgp", "mimo-v2.5-pro");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.QWEN_TOKEN_PLAN_API_KEY)("Qwen Token Plan Provider", () => {
		const llm = getModel("qwen-token-plan", "qwen3.7-max");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.QWEN_TOKEN_PLAN_API_KEY)("Qwen Token Plan Individual Provider", () => {
		const llm = getModel("qwen-token-plan-individual", "qwen3.8-max");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	describe.skipIf(!process.env.QWEN_TOKEN_PLAN_CN_API_KEY)("Qwen Token Plan (CN) Provider", () => {
		const llm = getModel("qwen-token-plan-cn", "qwen3.7-max");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});

	// =========================================================================
	// OAuth-based providers (credentials from ~/.pi/agent/oauth.json)
	// =========================================================================

	describe("Anthropic OAuth Provider", () => {
		const llm = getModel("anthropic", "claude-sonnet-4-6");

		it.skipIf(!anthropicOAuthToken)(
			"should include token stats when aborted mid-stream",
			{ retry: 3, timeout: 30000 },
			async () => {
				await testTokensOnAbort(llm, { apiKey: anthropicOAuthToken });
			},
		);
	});

	describe("GitHub Copilot Provider", () => {
		it.skipIf(!githubCopilotToken)(
			"claude-haiku-4.5 - should include token stats when aborted mid-stream",
			{ retry: 3, timeout: 30000 },
			async () => {
				const llm = getModel("github-copilot", "claude-haiku-4.5");
				await testTokensOnAbort(llm, { apiKey: githubCopilotToken });
			},
		);

		it.skipIf(!githubCopilotToken)(
			"claude-sonnet-4 - should include token stats when aborted mid-stream",
			{ retry: 3, timeout: 30000 },
			async () => {
				const llm = getModel("github-copilot", "claude-sonnet-4.6");
				await testTokensOnAbort(llm, { apiKey: githubCopilotToken });
			},
		);
	});

	describe("OpenAI Codex Provider", () => {
		it.skipIf(!openaiCodexToken)(
			"gpt-5.5 - should include token stats when aborted mid-stream",
			{ retry: 3, timeout: 30000 },
			async () => {
				const llm = getModel("openai-codex", "gpt-5.5");
				await testTokensOnAbort(llm, { apiKey: openaiCodexToken });
			},
		);
	});

	describe.skipIf(!hasBedrockCredentials())("Amazon Bedrock Provider", () => {
		const llm = getModel("amazon-bedrock", "global.anthropic.claude-sonnet-4-5-20250929-v1:0");

		it("should include token stats when aborted mid-stream", { retry: 3, timeout: 30000 }, async () => {
			await testTokensOnAbort(llm);
		});
	});
});
