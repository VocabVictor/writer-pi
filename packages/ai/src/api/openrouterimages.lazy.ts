import type { ProviderImages } from "../types.ts";

export const openrouterImagesApi = (): ProviderImages => ({
	generateImages: async (model, context, options) =>
		(await import("./openrouterimages.ts")).generateImages(model, context, options),
});
