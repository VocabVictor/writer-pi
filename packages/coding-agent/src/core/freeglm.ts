/**
 * Built-in default provider for writer-pi: the user's self-hosted GLM vLLM endpoint
 * (Anthropic Messages compatible, no real auth). Registered as a builtin, so models.json
 * overrides and stored credentials still win over these defaults through the normal layers.
 */

import { type ApiKeyAuth, createProvider, type Model, type Provider } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic.lazy";

export const FREE_GLM_PROVIDER_ID = "free-glm";

const DEFAULT_BASE_URL = "http://10.0.0.126:21517";
const DEFAULT_MODEL_ID = "glm-5.3-flash";
/** vLLM has no real auth; the placeholder keeps the Anthropic client's auth header valid. */
const PLACEHOLDER_TOKEN = "local-vllm-no-auth";
/** Thinking blocks count toward max_tokens, so long articles need headroom. */
const MAX_TOKENS = 128000;
/** vLLM max_model_len for this deployment. */
const CONTEXT_WINDOW = 1048576;

/** Endpoint base URL; FREE_GLM_BASE_URL overrides, like the user's free_glm script. */
export function freeGlmBaseUrl(): string {
	return (process.env.FREE_GLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
}

/** Model id; FREE_GLM_MODEL overrides. */
export function freeGlmModelId(): string {
	return process.env.FREE_GLM_MODEL ?? DEFAULT_MODEL_ID;
}

/** Keyless endpoint: the placeholder is always configured; a stored credential still wins. */
const placeholderAuth: ApiKeyAuth = {
	name: "API key",
	login: async (interaction) => {
		interaction.signal.throwIfAborted();
		const key = await interaction.prompt({ type: "secret", message: "Enter API key" });
		interaction.signal.throwIfAborted();
		return { type: "api_key", key };
	},
	resolve: async ({ credential }) =>
		credential?.key
			? { auth: { apiKey: credential.key }, env: credential.env, source: "stored credential" }
			: { auth: { apiKey: PLACEHOLDER_TOKEN }, source: "configured API key" },
};

/** The built-in GLM vLLM provider, freshly constructed. */
export function freeGlmProvider(): Provider {
	const modelId = freeGlmModelId();
	const baseUrl = freeGlmBaseUrl();
	const model: Model<"anthropic-messages"> = {
		id: modelId,
		name: modelId,
		api: "anthropic-messages",
		provider: FREE_GLM_PROVIDER_ID,
		baseUrl,
		reasoning: true,
		input: ["text"],
		contextWindow: CONTEXT_WINDOW,
		maxTokens: MAX_TOKENS,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	};
	return createProvider({
		id: FREE_GLM_PROVIDER_ID,
		name: "GLM (local vLLM)",
		baseUrl,
		auth: { apiKey: placeholderAuth },
		api: anthropicMessagesApi(),
		models: [model],
	});
}
