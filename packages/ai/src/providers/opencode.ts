import { anthropicMessagesApi } from "../api/anthropic.lazy.ts";
import { googleGenerativeAIApi } from "../api/google.lazy.ts";
import { openAICompletionsApi } from "../api/openaicompletions.lazy.ts";
import { openAIResponsesApi } from "../api/openairesponses.lazy.ts";
import { typesafeSystemOneApi } from "../api/typesafesystemone.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENCODE_CLASSIFIER_MODELS, OPENCODE_MODELS } from "./opencode.models.ts";
import { withOpenCodeSessionHeader } from "./opencodeheaders.ts";

type OpenCodeApi = "anthropic-messages" | "google-generative-ai" | "openai-completions" | "openai-responses";

export function opencodeProvider(): Provider<OpenCodeApi> {
	return createProvider<OpenCodeApi>({
		id: "opencode",
		name: "OpenCode Zen",
		auth: { apiKey: envApiKeyAuth("OpenCode API key", ["OPENCODE_API_KEY"]) },
		models: [...Object.values(OPENCODE_MODELS), ...Object.values(OPENCODE_CLASSIFIER_MODELS)],
		api: {
			"anthropic-messages": withOpenCodeSessionHeader(anthropicMessagesApi()),
			"google-generative-ai": withOpenCodeSessionHeader(googleGenerativeAIApi()),
			"openai-completions": withOpenCodeSessionHeader(openAICompletionsApi()),
			"openai-responses": withOpenCodeSessionHeader(openAIResponsesApi()),
		},
		// OpenCode Zen serves TypeSafe's System One protocol at /zen/v1/systemone.
		classifiers: { "typesafe-system-one": typesafeSystemOneApi() },
	});
}
