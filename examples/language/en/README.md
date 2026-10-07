# en Example: a neighborhood essay from source notes

Start writer-pi in this directory:

```bash
cd examples/language/en
writer-pi
```

Then enter in the interactive UI:

```
/draft Write a neighborhood essay about the corner hardware store
```

brief.md carries the requirements (target language, form, length, banned words); sources/hardware.md holds the facts.
Non-interactive real generation:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft Write a neighborhood essay about the corner hardware store" --no-session
```

The pipeline runs automatically: draft, save, program checks, semantic checks, revisions.
The final piece is in article.md; drafts/ holds the version files.
