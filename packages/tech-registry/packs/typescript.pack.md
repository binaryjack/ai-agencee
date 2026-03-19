---
name: typescript
version: 1.0.0
description: TypeScript strict-mode coding rules
---
## TypeScript Rules

- Always enable `"strict": true` in tsconfig.json — never disable it
- Prefer `unknown` over `any` — never use bare `any`; use `@typescript-eslint/no-explicit-any` to enforce
- Use `satisfies` operator for type narrowing without losing literal types
- Avoid type assertions (`as T`) unless you can prove the assertion is safe at the call site
- Export types with `export type` to keep runtime bundles clean
- Use `const` for immutable bindings; avoid `let` where reassignment is unnecessary
- Prefer named exports over default exports — one export per file
- Use discriminated unions for sum types; add an `_tag` or `kind` field to each variant
- Always annotate return types on public-facing functions and exported const-functions
- Avoid `enum` — use `const` objects + `typeof` lookups for nominal sets
- Use `noUnusedLocals` and `noUnusedParameters` to keep code clean
- Narrow early: place type guards and null checks at the top of a function body
- Prefer `readonly` arrays and `Readonly<T>` for data flowing into components or handlers
- Use `infer` inside conditional types — keep conditional types simple and documented
- Avoid index signatures (`[key: string]: T`) except in boundary/adapter code
