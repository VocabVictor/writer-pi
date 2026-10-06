import { anthropicMessagesApi } from "../api/anthropic.lazy.ts";
import { openAICompletionsApi } from "../api/openaicompletions.lazy.ts";
import { openAIResponsesApi } from "../api/openairesponses.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadGitHubCopilotOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { GITHUB_COPILOT_MODELS } from "./githubcopilot.models.ts";

export function githubCopilotProvider(): Provider<"anthropic-messages" | "openai-completions" | "openai-responses"> {
	return createProvider({
		id: "github-copilot",
		name: "GitHub Copilot",
		baseUrl: "https://api.individual.githubcopilot.com",
		auth: {
			apiKey: envApiKeyAuth("GitHub Copilot token", ["COPILOT_GITHUB_TOKEN"]),
			oauth: lazyOAuth({ name: "GitHub Copilot", isSubscription: true, load: loadGitHubCopilotOAuth }),
		},
		models: Object.values(GITHUB_COPILOT_MODELS),
		filterModels: (models, credential) => {
			if (credential?.type !== "oauth") return models;
			const availableModelIds = credential.availableModelIds;
			if (!Array.isArray(availableModelIds) || !availableModelIds.every((id) => typeof id === "string")) {
				return models;
			}
			const available = new Set(availableModelIds);
			return models.filter((model) => available.has(model.id));
		},
		api: {
			"anthropic-messages": anthropicMessagesApi(),
			"openai-completions": openAICompletionsApi(),
			"openai-responses": openAIResponsesApi(),
		},
	});
}
