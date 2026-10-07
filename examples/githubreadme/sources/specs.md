# Project facts (source of truth for the README)

- Name: waitfor
- One-line: poll an HTTP endpoint until it responds with a given status or body condition
- Language / runtime: TypeScript, Node.js >= 22.19.0, ESM only
- Install: `npm install waitfor-http`
- CLI usage: `npx waitfor-http --url http://localhost:3000/health --timeout 30000 --interval 1000`
  - `--url` (required): endpoint to poll
  - `--timeout` (default 30000, ms): give up after this long, exit code 1
  - `--interval` (default 1000, ms): delay between attempts
  - exits 0 on first successful response, prints the status code
- API usage:
  ```ts
  import { waitFor } from "waitfor-http";
  const res = await waitFor("http://localhost:3000/health", { timeout: 30000 });
  ```
  - `waitFor(url, options)` resolves with `{ status, body }`, rejects on timeout
  - options: `timeout` (number, ms), `interval` (number, ms)
- License: MIT
- Contributing: PRs welcome; run `npm test` before submitting; no contributor list, no CLA
- Repo links: none verified yet (no GitHub URL provided)
- Out of scope: retry/backoff strategies, WebSocket support, browsers
