---
name: javascript
version: 1.0.0
description: Modern JavaScript patterns
---
## JavaScript Rules

- Use ES2022+ syntax — optional chaining (`?.`), nullish coalescing (`??`), logical assignment
- Prefer `const` by default; use `let` only when reassignment is truly needed; never use `var`
- Use named function expressions or arrow functions; avoid anonymous functions in module scope
- Destructure objects and arrays at parameter or assignment sites to keep code readable
- Use `Array.prototype.at(-1)` instead of `arr[arr.length - 1]` for last-element access
- Avoid `arguments` object — use rest parameters (`...args`) instead
- Use `for...of` over `.forEach` when you need `break` or `return` semantics
- Prefer `structuredClone()` over JSON round-trip for deep copying plain objects
- Never mutate function parameters — treat them as readonly
- Use `import.meta.url` + `fileURLToPath` for `__dirname`/`__filename` equivalents in ESM
- Keep modules pure where possible — side effects only at module initialisation boundary
- Avoid deeply nested callbacks — use async/await with `try/catch` instead
- Always handle promise rejections — never fire-and-forget without `.catch` or `await`
- Use logical OR assignment (`||=`) and nullish coalescing assignment (`??=`) for defaults
