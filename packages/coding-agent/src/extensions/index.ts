import type { InlineExtension } from "../core/extensions/types.ts";

// writer-pi: no coding builtins. The writing features (system prompt, /draft /revise /voice,
// save_draft / revise_paragraph / diff_versions / revert_version tools, and the writing flow)
// are part of the core (src/writer + system-prompt.ts + core/tools/writer.ts), not extensions.
// The coding builtins from upstream pi (llama.cpp, codemode, tool-search, mcp) are removed.
export const builtInExtensions: InlineExtension[] = [];
