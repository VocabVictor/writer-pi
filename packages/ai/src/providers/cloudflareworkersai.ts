import { cloudflareWorkersAISystemOneApi } from "../api/cloudflaresystemone.lazy.ts";
import { openAICompletionsApi } from "../api/openaicompletions.lazy.ts";
import { createProvider, type Provider } from "../models.ts";
import { cloudflareWorkersAIAuth } from "./cloudflareauth.ts";
import { cloudflareClassifier, cloudflareStreams } from "./cloudflarestream.ts";
import { CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS, CLOUDFLARE_WORKERS_AI_MODELS } from "./cloudflareworkersai.models.ts";

export function cloudflareWorkersAIProvider(): Provider<"openai-completions"> {
	return createProvider<"openai-completions">({
		id: "cloudflare-workers-ai",
		name: "Cloudflare Workers AI",
		auth: { apiKey: cloudflareWorkersAIAuth() },
		models: [
			...Object.values(CLOUDFLARE_WORKERS_AI_MODELS),
			...Object.values(CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS),
		],
		api: cloudflareStreams(openAICompletionsApi()),
		classifiers: {
			"cloudflare-workers-ai-system-one": cloudflareClassifier(cloudflareWorkersAISystemOneApi()),
		},
	});
}
