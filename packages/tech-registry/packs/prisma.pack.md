---
name: prisma
version: 1.0.0
description: Prisma ORM query and schema rules
---
## Prisma Rules

- Define the Prisma schema as the single source of truth for the database shape — never handcraft migrations
- Run `prisma generate` as part of every build and CI step to keep the client in sync
- Use `prisma migrate dev` in development and `prisma migrate deploy` in CI/production
- Never use `prisma db push` in production — always use versioned migrations
- Use typed `select` / `include` options on every query to avoid over-fetching hidden fields
- Prefer `findUniqueOrThrow` / `findFirstOrThrow` over nullable `findUnique`/`findFirst` when a missing record is an error
- Use `createMany`, `updateMany`, and `deleteMany` for bulk operations — avoid `for` loops with single-record mutations
- Wrap multi-step mutations in `$transaction([...])` to guarantee atomicity
- Use `prisma.$transaction(async (tx) => { ... })` interactive transactions for dependent queries
- Validate user input with Zod or similar before passing to Prisma — never pass raw user data directly
- Store `PrismaClient` as a singleton; never create a new instance per request in server code
- Use soft deletes (`deletedAt` timestamp) for records that need GDPR erasure or audit trails
- Index frequently queried foreign keys and filter fields in the schema with `@@index`
- Avoid `@default(cuid())` in tests — use deterministic IDs to keep assertions stable
- Keep model names PascalCase and field names camelCase in the schema file
