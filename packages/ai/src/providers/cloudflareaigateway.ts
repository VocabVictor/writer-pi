import { anthropicMessagesApi } from "../api/anthropic.lazy.ts";
import { openAICompletionsApi } from "../api/openaicompletions.lazy.ts";
import { openAIResponsesApi } from "../api/openairesponses.lazy.ts";
import { createProvider, type Provider } from "../models.ts";
import { CLOUDFLARE_AI_GATEWAY_MODELS } from "./cloudflareaigateway.models.ts";
import { cloudflareAIGatewayAuth } from "./cloudflareauth.ts";
import { cloudflareStreams } from "./cloudflarestream.ts";

type CloudflareAIGatewayApi = "anthropic-messages" | "openai-completions" | "openai-responses";

export function cloudflareAIGatewayProvider(): Provider<CloudflareAIGatewayApi> {
	// The api map is pinned to all three APIs: models.dev's gateway catalog drops and
	// restores `workers-ai/*` (openai-completions) entries over time, and inference from
	// `models` alone would otherwise reject the openai-completions entry whenever the
	// generated catalog happens to contain none.
	return createProvider<CloudflareAIGatewayApi>({
		id: "cloudflare-ai-gateway",
		name: "Cloudflare AI Gateway",
		auth: { apiKey: cloudflareAIGatewayAuth() },
		models: Object.values(CLOUDFLARE_AI_GATEWAY_MODELS),
		api: {
			"anthropic-messages": cloudflareStreams(anthropicMessagesApi()),
			"openai-completions": cloudflareStreams(openAICompletionsApi()),
			"openai-responses": cloudflareStreams(openAIResponsesApi()),
		},
	});
}
