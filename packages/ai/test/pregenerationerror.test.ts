import { describe, expect, it } from "vitest";
import { streamSimple as streamAnthropic } from "../src/api/anthropic.ts";
import { streamSimple as streamAzure } from "../src/api/azureopenairesponses.ts";
import { streamSimple as streamGoogle } from "../src/api/google.ts";
import { streamSimple as streamMistral } from "../src/api/mistral.ts";
import { streamSimple as streamCodex } from "../src/api/openaicodexresponses.ts";
import { streamSimple as streamOpenAICompletions } from "../src/api/openaicompletions.ts";
import { streamSimple as streamOpenAIResponses } from "../src/api/openairesponses.ts";
import type { Api, AssistantMessageEventStream, Model } from "../src/types.ts";
import { normalizeContext } from "../src/utils/transcript.ts";

function model<TApi extends Api>(api: TApi): Model<TApi> {
	return {
		id: "test-model",
		name: "Test",
		api,
		provider: "test-provider",
		baseUrl: "https://example.invalid",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1_000,
		maxTokens: 100,
	};
}

function expectMissingAuthThrows(create: () => AssistantMessageEventStream): void {
	expect(create).toThrow("No API key for provider: test-provider");
}

describe("direct API authentication", () => {
	it("throws synchronously when auth is missing", () => {
		const context = normalizeContext({ messages: [] });
		expectMissingAuthThrows(() => streamAnthropic(model("anthropic-messages"), context, {}));
		expectMissingAuthThrows(() => streamAzure(model("azure-openai-responses"), context, {}));
		expectMissingAuthThrows(() => streamGoogle(model("google-generative-ai"), context, {}));
		expectMissingAuthThrows(() => streamMistral(model("mistral-conversations"), context, {}));
		expectMissingAuthThrows(() => streamCodex(model("openai-codex-responses"), context, {}));
		expectMissingAuthThrows(() => streamOpenAICompletions(model("openai-completions"), context, {}));
		expectMissingAuthThrows(() => streamOpenAIResponses(model("openai-responses"), context, {}));
	});
});
