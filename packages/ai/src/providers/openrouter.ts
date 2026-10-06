import { anthropicMessagesApi } from "../api/anthropic.lazy.ts";
import { openAICompletionsApi } from "../api/openaicompletions.lazy.ts";
import { openrouterImagesApi } from "../api/openrouterimages.lazy.ts";
import { typesafeSystemOneApi } from "../api/typesafesystemone.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadOpenRouterOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENROUTER_CLASSIFIER_MODELS, OPENROUTER_IMAGE_MODELS, OPENROUTER_MODELS } from "./openrouter.models.ts";

export function openrouterProvider(): Provider<"anthropic-messages" | "openai-completions"> {
	return createProvider<"anthropic-messages" | "openai-completions">({
		id: "openrouter",
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		auth: {
			apiKey: envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"]),
			oauth: lazyOAuth({
				name: "OpenRouter OAuth",
				loginLabel: "Sign in with OpenRouter",
				load: loadOpenRouterOAuth,
			}),
		},
		models: [
			...Object.values(OPENROUTER_MODELS),
			...Object.values(OPENROUTER_IMAGE_MODELS),
			...Object.values(OPENROUTER_CLASSIFIER_MODELS),
		],
		api: {
			"anthropic-messages": anthropicMessagesApi(),
			"openai-completions": openAICompletionsApi(),
		},
		images: { "openrouter-images": openrouterImagesApi() },
		// OpenRouter serves TypeSafe's System One protocol at /api/v1/systemone.
		classifiers: { "typesafe-system-one": typesafeSystemOneApi() },
	});
}
