import type { ProviderClassifier } from "../types.ts";

export const llamaCppClassifyApi = (): ProviderClassifier => ({
	classify: async (model, context, options) => (await import("./classify.ts")).classify(model, context, options),
});
