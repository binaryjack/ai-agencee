---
name: node
version: 1.0.0
description: Node.js runtime best practices
---
## Node.js Rules

- Use `import`/`export` (ESM) for new modules — set `"type": "module"` in `package.json`
- Use `node:` prefix for all built-in imports: `import fs from 'node:fs/promises'`
- Handle uncaught exceptions and unhandled promise rejections with `process.on('uncaughtException')` + graceful shutdown
- Use `process.env` for configuration — validate and parse env variables at startup with Zod or a typed helper
- Never log secrets or tokens — redact before writing to stdout/stderr or any log sink
- Use `node:crypto` for cryptographic operations — never roll your own crypto
- Prefer `fs/promises` (async) over synchronous `fs` methods in request handlers and hot paths
- Use `AbortController`/`AbortSignal` to cancel long-running async operations and fetch calls
- Set a `timeout` on all outbound HTTP requests using `AbortController` — never leave requests open-ended
- Use `node:worker_threads` for CPU-intensive work — do not block the event loop
- Listen on `SIGTERM` and `SIGINT` for graceful shutdown: drain connections, close DB pools, flush logs
- Pin Node.js version in `.nvmrc` and `engines` field in `package.json` — use Node ≥20 LTS
- Avoid synchronous operations in request paths: `readFileSync`, `execSync`, `JSON.parse` on large payloads
- Use structured logging (JSON) with log levels (debug, info, warn, error) — avoid `console.log` in production code
- Export a `createServer()` factory function — do not call `.listen()` at module load time
