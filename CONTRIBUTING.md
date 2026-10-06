# Contributing to writer-pi

This guide exists to save both sides time.

## Philosophy

First things first: **writer-pi is a writing agent, and writing is the core**.

The writing flows, slash commands, tools and genre system live in
`packages/coding-agent/src/writer/`. The agent harness underneath stays minimal
and extensible. PRs that bloat the core, or re-scope writer-pi back into a
general coding agent, will likely be rejected.

## The One Rule

**You must understand your code.** If you cannot explain what your changes do and how they interact with the rest of the system, your PR will be closed.

Using AI to write code is fine. Submitting AI-generated slop without understanding it is not.

If you use an agent, run it from the `writer-pi` root directory so it picks up `AGENTS.md` automatically. Your agent must follow the rules and guidelines in that file.

## Quality Bar For Issues

If you open an issue, use one of the two GitHub issue templates.

If you open an issue, keep it short, concrete, and worth reading.

- Keep it concise. If it does not fit on one screen, it is too long.
- Write in your own voice (do not use an LLM to generate text, if you must, follow up with a clearly AI labeled comment).
- State the bug or request clearly.
- Explain why it matters.
- If you want to implement the change yourself, say so.

## Blocking

If you ignore this document twice, or if you spam the tracker with agent-generated issues, your GitHub account will be permanently blocked.

If you send a large volume of issues through automation, your GitHub account will be permanently blocked. No taksies backsies.

## Before Submitting a PR

Before submitting a PR:

```bash
npm run check
./test.sh
```

Both must pass.

`npm run check` deliberately omits `check:package-install`. That script packs the
release packages as tarballs and installs them into a scratch directory to verify
the published artifact actually installs, which is too slow for a routine check.
Run it manually before publishing, or whenever a change touches packaging,
exports, or dependency layout.

Changelog entries go under `## [Unreleased]` in `packages/*/CHANGELOG.md` (see `AGENTS.md`).

## Questions?

Open a [GitHub Issue](https://github.com/VocabVictor/writer-pi/issues).
