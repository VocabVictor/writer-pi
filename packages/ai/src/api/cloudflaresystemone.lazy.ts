import type { ProviderClassifier } from "../types.ts";

export const cloudflareWorkersAISystemOneApi = (): ProviderClassifier => ({
	classify: async (model, context, options) =>
		(await import("./cloudflaresystemone.ts")).classify(model, context, options),
});
