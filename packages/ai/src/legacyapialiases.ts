import { anthropicMessagesApi } from "./api/anthropic.lazy.ts";
import type { AnthropicOptions } from "./api/anthropic.ts";
import { azureOpenAIResponsesApi } from "./api/azureopenairesponses.lazy.ts";
import type { AzureOpenAIResponsesOptions } from "./api/azureopenairesponses.ts";
import { googleGenerativeAIApi } from "./api/google.lazy.ts";
import type { GoogleOptions } from "./api/google.ts";
import { googleVertexApi } from "./api/googlevertex.lazy.ts";
import type { GoogleVertexOptions } from "./api/googlevertex.ts";
import { mistralConversationsApi } from "./api/mistral.lazy.ts";
import type { MistralOptions } from "./api/mistral.ts";
import { openAICodexResponsesApi } from "./api/openaicodexresponses.lazy.ts";
import type { OpenAICodexResponsesOptions } from "./api/openaicodexresponses.ts";
import { openAICompletionsApi } from "./api/openaicompletions.lazy.ts";
import type { OpenAICompletionsOptions } from "./api/openaicompletions.ts";
import { openAIResponsesApi } from "./api/openairesponses.lazy.ts";
import type { OpenAIResponsesOptions } from "./api/openairesponses.ts";
import type { SimpleStreamOptions, StreamFunction } from "./types.ts";

const anthropicMessagesStreams = anthropicMessagesApi();
const azureOpenAIResponsesStreams = azureOpenAIResponsesApi();
const googleGenerativeAIStreams = googleGenerativeAIApi();
const googleVertexStreams = googleVertexApi();
const mistralConversationsStreams = mistralConversationsApi();
const openAICodexResponsesStreams = openAICodexResponsesApi();
const openAICompletionsStreams = openAICompletionsApi();
const openAIResponsesStreams = openAIResponsesApi();

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/anthropic` or `anthropicMessagesApi().stream`. */
export const streamAnthropic = anthropicMessagesStreams.stream as StreamFunction<
	"anthropic-messages",
	AnthropicOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/anthropic` or `anthropicMessagesApi().streamSimple`. */
export const streamSimpleAnthropic = anthropicMessagesStreams.streamSimple as StreamFunction<
	"anthropic-messages",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/azureopenairesponses` or `azureOpenAIResponsesApi().stream`. */
export const streamAzureOpenAIResponses = azureOpenAIResponsesStreams.stream as StreamFunction<
	"azure-openai-responses",
	AzureOpenAIResponsesOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/azureopenairesponses` or `azureOpenAIResponsesApi().streamSimple`. */
export const streamSimpleAzureOpenAIResponses = azureOpenAIResponsesStreams.streamSimple as StreamFunction<
	"azure-openai-responses",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/google` or `googleGenerativeAIApi().stream`. */
export const streamGoogle = googleGenerativeAIStreams.stream as StreamFunction<"google-generative-ai", GoogleOptions>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/google` or `googleGenerativeAIApi().streamSimple`. */
export const streamSimpleGoogle = googleGenerativeAIStreams.streamSimple as StreamFunction<
	"google-generative-ai",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/googlevertex` or `googleVertexApi().stream`. */
export const streamGoogleVertex = googleVertexStreams.stream as StreamFunction<"google-vertex", GoogleVertexOptions>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/googlevertex` or `googleVertexApi().streamSimple`. */
export const streamSimpleGoogleVertex = googleVertexStreams.streamSimple as StreamFunction<
	"google-vertex",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/mistral` or `mistralConversationsApi().stream`. */
export const streamMistral = mistralConversationsStreams.stream as StreamFunction<
	"mistral-conversations",
	MistralOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/mistral` or `mistralConversationsApi().streamSimple`. */
export const streamSimpleMistral = mistralConversationsStreams.streamSimple as StreamFunction<
	"mistral-conversations",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/openaicodexresponses` or `openAICodexResponsesApi().stream`. */
export const streamOpenAICodexResponses = openAICodexResponsesStreams.stream as StreamFunction<
	"openai-codex-responses",
	OpenAICodexResponsesOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/openaicodexresponses` or `openAICodexResponsesApi().streamSimple`. */
export const streamSimpleOpenAICodexResponses = openAICodexResponsesStreams.streamSimple as StreamFunction<
	"openai-codex-responses",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/openaicompletions` or `openAICompletionsApi().stream`. */
export const streamOpenAICompletions = openAICompletionsStreams.stream as StreamFunction<
	"openai-completions",
	OpenAICompletionsOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/openaicompletions` or `openAICompletionsApi().streamSimple`. */
export const streamSimpleOpenAICompletions = openAICompletionsStreams.streamSimple as StreamFunction<
	"openai-completions",
	SimpleStreamOptions
>;

/** @deprecated Use `stream` from `@earendil-works/pi-ai/api/openairesponses` or `openAIResponsesApi().stream`. */
export const streamOpenAIResponses = openAIResponsesStreams.stream as StreamFunction<
	"openai-responses",
	OpenAIResponsesOptions
>;
/** @deprecated Use `streamSimple` from `@earendil-works/pi-ai/api/openairesponses` or `openAIResponsesApi().streamSimple`. */
export const streamSimpleOpenAIResponses = openAIResponsesStreams.streamSimple as StreamFunction<
	"openai-responses",
	SimpleStreamOptions
>;
