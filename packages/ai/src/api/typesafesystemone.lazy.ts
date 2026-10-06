import type { ProviderClassifier } from "../types.ts";

export const typesafeSystemOneApi = (): ProviderClassifier => ({
	classify: async (model, context, options) =>
		(await import("./typesafesystemone.ts")).classify(model, context, options),
});
