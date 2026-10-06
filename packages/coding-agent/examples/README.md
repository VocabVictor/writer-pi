# Examples

Example code for the pi-coding-agent SDK, process integration, and extensions.

## CLI integration

[`rpcclient.ts`](rpcclient.ts) uses the typed `RpcClient` to run Pi in a child process, stream events, and wait for the run to settle.

Build the coding-agent package before running it from a repository checkout:

```bash
node examples/rpcclient.ts "Explain this repository"
```

## Directories

### [sdk/](sdk/)
Programmatic usage via `createAgentSession()`. Shows how to customize models, prompts, tools, extensions, and session management.

### [extensions/](extensions/)
Example extensions demonstrating:
- Lifecycle event handlers (tool interception, safety gates, context modifications)
- Custom tools (todo lists, questions, subagents, output truncation)
- Commands and keyboard shortcuts
- Custom UI (footers, headers, editors, overlays)
- Git integration (checkpoints, auto-commit)
- System prompt modifications and custom compaction
- External integrations (SSH, file watchers, system theme sync)
- Custom providers (Anthropic with custom streaming, GitLab Duo)

### [plugins/example/](plugins/example/)
An experimental plugin package that Pi automatically builds into separate Session-worker and TUI Chord facets.

## Documentation

- [SDK Examples](sdk/README.md)
- [CLI Integration](../docs/cliintegration.md)
- [Extensions Documentation](../docs/extensions.md)
- [Skills Documentation](../docs/skills.md)
