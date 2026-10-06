<p align="center">
  <a href="https://pi.dev">
    <img alt="Pi logo" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://www.npmjs.com/package/@earendil-works/pi-coding-agent"><img alt="npm" src="https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square&logo=npm&logoColor=white" /></a>
</p>

> See [CONTRIBUTING.md](https://github.com/VocabVictor/writer-pi/blob/main/CONTRIBUTING.md) for the issue quality bar before opening an issue or PR.

# Pi

Pi is a minimal, extensible AI agent for the terminal. Adapt Pi to your workflow, not the other way around.

Ask Pi to create the prompt templates, skills, extensions, and themes you need, or install a Pi package. Use Pi directly, automate it in print, JSON, or RPC mode, or build applications with the TypeScript SDK.

## Getting started

Install the command-line interface with npm:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

This requires Node.js 22.19 or newer and installs both the `pi` and `writer-pi` commands (they run the same CLI). Pi does not require dependency lifecycle scripts for a normal npm installation.

On macOS or Linux, you can instead use the installer:

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

Start Pi in the directory where you want it to work:

```bash
cd /path/to/project
pi
```

writer-pi ships a built-in default provider: a self-hosted GLM vLLM endpoint (Anthropic Messages compatible, no real auth), so it works before any login. `FREE_GLM_BASE_URL` and `FREE_GLM_MODEL` point it elsewhere, `PI_NO_LOCAL_LLM=1` disables it, and stored credentials, `models.json` overrides, and `/login` providers all win over the default through the normal layers. Switch models with `/model` inside Pi, then give writer-pi a task.

See the [documentation](docs/index.md) for full setup and usage instructions.

## Writing tools and commands

writer-pi is a writing agent built on the Pi harness: writing is the product, not an extension. Sessions carry the reading and writing tools only — `read`, `save_draft`, `revise_paragraph`, `diff_versions`, `revert_version`, and `update_context` (genre-scoped persistent context) — with no shell or file-editing coding tools.

The writing flows are code-driven, and every step is saved to disk. `/draft`, `/continue`, `/outline`, `/revise`, and `/voice` start a flow; `/writing`, `/drafts`, `/diff`, `/revert`, and `/genre` inspect and manage the project. Flow commands take dimension arguments: `--genre=<genre>`, `--voice=<style|sample>`, `--format=<format>`, and `--long` for long-form writing.

Drafts are written to `drafts/draft-NNN.md` and versions are never overwritten, so `diff_versions` compares two versions and `revert_version` restores an earlier one as a new version.

## Development

Clone the repository, install its dependencies, and run Pi from source:

```bash
git clone https://github.com/earendil-works/pi
cd pi
npm install --ignore-scripts
./run.sh
```

`run.sh` can be called from any directory and preserves the caller's working directory.

Before submitting changes, run:

```bash
npm run check
./test.sh
```

Read [CONTRIBUTING.md](https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md) before opening an issue or pull request. It defines the contribution gate, issue quality bar, and required checks. Read [AGENTS.md](https://github.com/earendil-works/pi/blob/main/AGENTS.md) for repository-specific implementation, testing, dependency, and release rules.

## License

MIT
