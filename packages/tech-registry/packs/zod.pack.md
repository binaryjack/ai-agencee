---
name: zod
version: 1.0.0
description: Zod validation schema patterns
---
## Zod Rules

- Define schemas adjacent to the types they validate — colocate, do not scatter
- Use `z.infer<typeof MySchema>` to derive TypeScript types from schemas; avoid duplicating type definitions
- Use `z.object().strict()` at system boundaries (HTTP request bodies, config files, env) to reject unknown keys
- Use `z.discriminatedUnion` for tagged unions instead of `z.union` when a discriminant field exists
- Prefer `.optional()` over `.nullable()` unless the data layer or API explicitly returns `null`
- Always call `.parse()` at system entry points and keep `.safeParse()` for handled validation flows
- Use `z.coerce.number()` and `z.coerce.date()` for HTTP params that arrive as strings
- Use `z.preprocess()` only for irreversible transformations like trimming or normalising enums
- Chain `.min()`, `.max()`, `.email()`, `.url()`, `.regex()` directly on string/number schemas — avoid custom `.refine()` for standard constraints
- Use `.transform()` to produce a different output type from a validated input (e.g., `string → Date`)
- Use `.brand()` to create nominal types for values that carry domain significance (e.g., `BrandedUserId`)
- Name schemas with a `Schema` suffix and types without — `const UserSchema = z.object(...)`, `type User = z.infer<...>`
- Compose schemas with `.merge()`, `.extend()`, `.pick()`, `.omit()` rather than copying fields
- Test schemas independently — write unit tests that assert valid/invalid inputs for each schema
- Use `z.enum()` backed by `as const` arrays to keep enum values as a single source of truth
