import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const openAIResponsesApi = (): ProviderStreams => lazyApi(() => import("./openairesponses.ts"));
