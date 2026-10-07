# waitfor

waitfor is a small Node.js tool that polls an HTTP endpoint until it responds. It retries a URL at a fixed interval and exits as soon as the endpoint answers, which is useful when a script needs to wait for a service to come up before continuing. It is published to npm as `waitfor-http` and offers both a CLI and a JavaScript API.

## Install

Requires Node.js >= 22.19.0.

```sh
npm install waitfor-http
```

Or try it without installing: `npx waitfor-http` (see CLI usage below for the full command).

Commands run in a POSIX shell with Node.js >= 22.19.0 installed.

## CLI usage

```sh
npx waitfor-http --url http://localhost:3000/health --timeout 30000 --interval 1000
```

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `--url` | Yes | — | Endpoint to poll |
| `--timeout` | No | `30000` | Give up after this long (ms) and exit with code 1 |
| `--interval` | No | `1000` | Delay between attempts (ms) |

On the first successful response the command prints the status code and exits with code 0. If the endpoint does not respond within `--timeout`, it exits with code 1.

## API usage

```ts
import { waitFor } from "waitfor-http";

const res = await waitFor("http://localhost:3000/health", { timeout: 30000 });
console.log(res.status, res.body);
```

`waitFor(url, options)` resolves with `{ status, body }` once the endpoint responds, and rejects on timeout. Both options are numbers in milliseconds: `timeout` and `interval`.

The package is ESM only. Save the example as a `.mjs` file (or set `"type": "module"` in `package.json`) and run it with Node.js >= 22.19.0; top-level `await` works in an ES module.

## Contributing

PRs are welcome. Run `npm test` before submitting.

## License

MIT