---
name: add-llm-provider
description: Checklist for adding a new LLM provider to packages/ai. Covers core types, provider implementation, lazy registration, model generation, the full test matrix, coding-agent wiring, and docs.
---

# Adding a New LLM Provider (packages/ai)

A new provider touches multiple files. Work through these steps in order.

## 1. Core Types (`packages/ai/src/types.ts`)

- Add API identifier to `Api` type union (e.g. `"bedrock-converse-stream"`).
- Create options interface extending `StreamOptions`.
- Add mapping to `ApiOptionsMap`.
- Add provider name to `KnownProvider` type union.

## 2. Provider Implementation (`packages/ai/src/providers/`)

Create a provider file exporting:

- `stream<Provider>()` returning `AssistantMessageEventStream`.
- `streamSimple<Provider>()` for `SimpleStreamOptions` mapping.
- Provider-specific options interface.
- Message/tool conversion functions.
- Response parsing that emits standardized events (`text`, `tool_call`, `thinking`, `usage`, `stop`).

## 3. Provider Exports and Lazy Registration

- Add a package subpath export in `packages/ai/package.json` pointing at `./dist/providers/<provider>.js`.
- Add `export type` re-exports in `packages/ai/src/index.ts` for provider option types that should remain available from the root entry.
- Add a lazy wrapper `packages/ai/src/api/<api>.lazy.ts` using `lazyApi()`; do not statically import provider implementation modules there.
- Add credential detection in `packages/ai/src/envapikeys.ts`.

## 4. Model Generation (`packages/ai/scripts/models.ts`)

- Add logic to fetch/parse models from the provider source.
- Map to the standardized `Model` interface.

## 5. Tests (`packages/ai/test/`)

- Always add the provider to `stream.test.ts` with at least one representative model, even if it reuses an existing API impl such as `openai-completions`.
- Add the provider to the broader matrix where applicable: `tokens.test.ts`, `abort.test.ts`, `empty.test.ts`, `contextoverflow.test.ts`, `unicodesurrogate.test.ts`, `toolcallwithoutresult.test.ts`, `imagetoolresult.test.ts`, `totaltokens.test.ts`, `crossproviderhandoff.test.ts`.
- For `crossproviderhandoff.test.ts`, add at least one provider/model pair. If the provider exposes multiple model families (e.g. GPT and Claude), add at least one pair per family.
- For non-standard auth, create a utility (e.g. `bedrockutils.ts`) with credential detection.

## 6. Coding Agent (`packages/coding-agent/`)

- `src/core/modelresolver.ts`: add default model ID to `defaultModelPerProvider`.
- `packages/ai/src/providers/<provider>.ts`: set the `name` on the provider's `apiKey` auth so `/login` and related UI show the provider for built-in API-key auth.
- `src/cli/args.ts`: add env var documentation.
- `README.md`: add provider setup instructions.
- `docs/providers.md`: add setup instructions, env var, and `auth.json` key.

## 7. Documentation

- `packages/ai/README.md`: add to providers table, document options/auth, add env vars.
- `packages/ai/CHANGELOG.md`: add entry under `## [Unreleased]`.
