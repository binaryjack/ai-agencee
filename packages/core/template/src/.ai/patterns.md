# Design Patterns - ULTRA_HIGH Standards

## Forbidden Patterns ❌
```
useImperativeHandle
class 
 any 
camelCase
verbose
```

## Required Patterns ✅

### File Naming
- `kebab-case` for file names
- One item per file (one export per file)

### Type Definitions
- `*.types.ts` for all type definitions
- Use strict types (no `any`)
- Use union types with explicit handling

### Function Declaration
```typescript
// Required Pattern
export const Name = function(...) { ... }
```

### Methods & Prototypes
```typescript
// Use prototype/* for methods
MyFunction.prototype.method = function() { ... }
```

### Property Visibility
```typescript
// Non-enumerable properties
Object.defineProperty(this, 'x', { enumerable: false })
```

### File Structure
- `feature.ts` - Constructor/main implementation
- `create-feature.ts` - Factory function
- `index.ts` - Exports only (no logic)

## Architecture Patterns

### Functional Architecture
- Use pure functions
- Avoid side effects
- Use function composition
- No class-based code

### Module Pattern
```typescript
// feature.ts
export const create-feature = function(config) {
  return {
    method: function() { ... }
  }
}

// index.ts
export { create-feature } from './create-feature'
export type { FeatureConfig } from './feature.types'
```

## Testing Pattern
- Minimum 95% code coverage required
- Test files in `__tests__` directory
- Test file naming: `{feature}.test.ts`

## Performance Pattern
- Target: <=10% solid-js benchmark
- Profile before optimization
- Monitor bundle size
