import { anthropicOAuth } from "./auth/oauth/anthropic.ts";
import { githubCopilotOAuth } from "./auth/oauth/githubcopilot.ts";
import { kimiCodingOAuth } from "./auth/oauth/kimicoding.ts";
import { registerBundledOAuthFlowLoaders } from "./auth/oauth/load.ts";
import { metaOAuth } from "./auth/oauth/meta.ts";
import { openaiChatGPTOAuth } from "./auth/oauth/openaichatgpt.ts";
import { openaiCodexOAuth } from "./auth/oauth/openaicodex.ts";
import { openRouterOAuth } from "./auth/oauth/openrouter.ts";
import { createRadiusOAuth } from "./auth/oauth/radius.ts";
import { xaiOAuth } from "./auth/oauth/xai.ts";

/** Register OAuth flows statically embedded in the standalone Bun binary. */
export function registerBunOAuthFlows(): void {
	registerBundledOAuthFlowLoaders({
		anthropic: () => anthropicOAuth,
		openaiCodex: () => openaiCodexOAuth,
		openaiChatGPT: () => openaiChatGPTOAuth,
		githubCopilot: () => githubCopilotOAuth,
		openrouter: () => openRouterOAuth,
		kimiCoding: () => kimiCodingOAuth,
		meta: () => metaOAuth,
		xai: () => xaiOAuth,
		radius: createRadiusOAuth,
	});
}
