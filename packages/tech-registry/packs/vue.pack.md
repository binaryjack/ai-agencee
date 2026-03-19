---
name: vue
version: 1.0.0
description: Vue 3 composition API patterns
frameworks: nuxt,vite
---
## Vue 3 Rules

- Use `<script setup>` syntax for all new components — avoid Options API in new code
- Define props with `defineProps<T>()` using a TypeScript interface — avoid runtime props objects
- Define emits with `defineEmits<T>()` using a call signature interface
- Use `ref()` for primitives and `reactive()` for objects; avoid mixing styles in one component
- Access template refs with `useTemplateRef()` (Vue 3.5+) rather than `ref<HTMLElement | null>(null)`
- Prefer `computed()` for derived state — never mutate a `computed` value's underlying ref externally
- Use `watchEffect()` for fire-once reactive side effects; use `watch()` when you need old/new values
- Avoid deep watchers on large objects — pass a specific path or computed value as the watch source
- Use `provide`/`inject` with typed symbols for cross-tree dependencies instead of prop drilling
- Separate business logic into composables (`use*.ts`) — keep components presentation-only
- Use `<Teleport>` for modals and tooltips to avoid z-index and overflow clipping issues
- Use `v-bind` object syntax for dynamic attributes rather than repeated single-bind attributes
- Always use `v-for` with a stable `:key` — never use index as key with dynamic lists
- Use `<Suspense>` + async setup for async component initialisation instead of manual `isLoading` flags
- Keep composable files named `use-*.ts` (kebab-case) and colocate with the component that owns them
