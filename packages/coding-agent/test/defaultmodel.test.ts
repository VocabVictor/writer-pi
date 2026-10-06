/**
 * Built-in default model wiring: a fresh install with no credentials and no settings default
 * resolves to the self-hosted GLM endpoint; a stored credential or FREE_GLM_* env still wins.
 * Skipped under PI_NO_LOCAL_LLM, which also skips the built-in registration itself.
 */

import { describe, expect, test } from "vitest";
import { AuthStorage } from "../src/core/authstorage.ts";
import { FREE_GLM_PROVIDER_ID, freeGlmBaseUrl, freeGlmModelId } from "../src/core/freeglm.ts";
import { findInitialModel } from "../src/core/modelresolver.ts";
import { ModelRuntime } from "../src/core/modelruntime.ts";

describe.skipIf(Boolean(process.env.PI_NO_LOCAL_LLM))("built-in default model wiring", () => {
	test("fresh install with no credentials resolves to the built-in GLM endpoint", async () => {
		const runtime = await ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
		const result = await findInitialModel({ scopedModels: [], isContinuing: false, modelRuntime: runtime });

		expect(result.model?.provider).toBe(FREE_GLM_PROVIDER_ID);
		expect(result.model?.id).toBe(freeGlmModelId());
		expect(result.model?.baseUrl).toBe(freeGlmBaseUrl());
		// Long articles need headroom: thinking blocks count toward max_tokens.
		expect(result.model?.maxTokens).toBeGreaterThan(100000);
	});

	test("FREE_GLM_BASE_URL and FREE_GLM_MODEL override the built-in defaults", async () => {
		process.env.FREE_GLM_BASE_URL = "http://127.0.0.1:59999/";
		process.env.FREE_GLM_MODEL = "custom-model";
		try {
			const runtime = await ModelRuntime.create({ credentials: AuthStorage.inMemory(), modelsPath: null });
			const result = await findInitialModel({ scopedModels: [], isContinuing: false, modelRuntime: runtime });

			expect(result.model?.provider).toBe(FREE_GLM_PROVIDER_ID);
			expect(result.model?.id).toBe("custom-model");
			expect(result.model?.baseUrl).toBe("http://127.0.0.1:59999");
		} finally {
			delete process.env.FREE_GLM_BASE_URL;
			delete process.env.FREE_GLM_MODEL;
		}
	});

	test("a stored credential wins over the built-in default", async () => {
		const auth = AuthStorage.inMemory();
		await auth.modify("anthropic", async () => ({ type: "api_key", key: "sk-stored" }));
		const runtime = await ModelRuntime.create({ credentials: auth, modelsPath: null });
		const result = await findInitialModel({ scopedModels: [], isContinuing: false, modelRuntime: runtime });

		expect(result.model?.provider).toBe("anthropic");
	});
});
