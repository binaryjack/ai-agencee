---
name: react
version: 1.0.0
description: React declarative component patterns
frameworks: next,remix,vite
---
## React Rules

- Prefer function components — never use class components in new code
- colocate state as close to the consuming component as possible; lift only when necessary
- Use `useReducer` for complex state machines; `useState` for simple on/off toggles
- Extract custom hooks when a component uses more than two related `useState`/`useEffect` pairs
- Derive computed values inline or via `useMemo` — never store derivable state in `useState`
- Pass callbacks with `useCallback` only when the reference stability matters (child memo, effect dep)
- Use `React.memo` only after profiling confirms unnecessary re-renders
- Always specify the full `useEffect` dependency array — never suppress `react-hooks/exhaustive-deps`
- Avoid direct DOM mutation inside render — use refs or portals where DOM access is needed
- Keep components small and focused; extract JSX blocks >20 lines into named sub-components
- Use `key` prop with stable, unique identifiers — never use array index as key in dynamic lists
- Represent API states as discriminated unions (`idle | loading | success | error`) rather than booleans
- Prefer `Suspense` + `lazy` for code-splitting over manual loading state management
- Avoid prop drilling beyond two levels — use Context or state management libraries for global state
- Use `useId` for accessibility-linked `id`/`aria-*` attributes generated at runtime
