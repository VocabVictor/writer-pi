---
name: release
description: Prepare and verify pi releases locally. Use for release preparation and local release smoke tests.
---

# Releasing pi

This repository has no release pipeline: CI only builds, checks, and tests `main`; nothing here publishes packages to npm, builds release binaries, or writes release markers. Releases are prepared locally.

Run repository commands from the repo root (two directories above this skill), unless instructed otherwise.

**Lockstep versioning**: all packages share one version; every release updates all together. `patch` = fixes + additions, `minor` = breaking changes. No major releases.

1. **Update CHANGELOGs**: ask the user whether they ran the `/cl` prompt on the latest commit on `main`. If not, they must run `/cl` first to audit and update each package's `[Unreleased]` section before releasing.

2. **Local smoke test**: build and pack an unpublished release into an isolated directory outside the repo (so it can't resolve workspace files), then smoke test it:
   ```bash
   npm run release:local -- --out /tmp/pi-local-release --force
   cd /tmp

   /tmp/pi-local-release/node/pi --help
   /tmp/pi-local-release/node/pi --version
   /tmp/pi-local-release/node/pi -p "Say exactly: ok"

   /tmp/pi-local-release/bun/pi --help
   /tmp/pi-local-release/bun/pi -p "Say exactly: ok"
   ```
   The bare commands start interactive mode; run each in tmux per [interactive-testing.md](interactive-testing.md), submit a prompt, and wait for the model reply. Failures are release blockers unless the user explicitly accepts the risk.

3. **Run the release script**:
   ```bash
   PI_ALLOW_LOCKFILE_CHANGE=1 npm_config_min_release_age=0 npm run release:patch    # fixes + additions
   PI_ALLOW_LOCKFILE_CHANGE=1 npm_config_min_release_age=0 npm run release:minor    # breaking changes
   ```
   Use `npm_config_min_release_age=0` only for the release command. The repo's normal npm age gate can otherwise block the release lockfile refresh when the current workspace package version was published recently. Review any lockfile or shrinkwrap diffs the release creates before push.

   The release script bumps all package versions, updates changelogs, regenerates release artifacts, runs `npm run check` and the tests, commits `Release vX.Y.Z`, tags `vX.Y.Z`, adds fresh `## [Unreleased]` changelog sections, commits `Add [Unreleased] section for next cycle`, then pushes `main` and the tag. It does not publish to npm. Do not rerun the release script after a tag was pushed.
