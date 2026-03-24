# ADR-003: Transaction Manager & Result Merger Abstractions

## Status
Implemented

## Context
The codebase had two architectural coupling issues that reduced testability and maintainability:

### 1. Transaction Management Coupling
Database transaction logic (BEGIN/COMMIT/ROLLBACK) was duplicated across three methods in `codebase-index-store.ts`:
- `upsertSymbols()`: 10 lines of transaction boilerplate
- `upsertDependencies()`: 10 lines of transaction boilerplate
- `upsertFunctionCalls()`: 10 lines of transaction boilerplate

**Problems:**
- Repeated code (DRY violation)
- Hard to test transaction behavior in isolation
- Business logic mixed with database concerns
- Error handling inconsistencies

### 2. Result Merging Complexity
Context gathering in `gather-context.ts` manually merged results from 3 search strategies (FTS5, semantic, graph traversal) with inline deduplication logic:

```typescript
const seen = new Set(symbols.map(s => s.name + '\0' + s.file_path));
for (const r of semanticHits) {
  const key = r.name + '\0' + r.file_path;
  if (!seen.has(key)) {
    seen.add(key);
    symbols.push({...});
  }
}
```

**Problems:**
- Logic scattered across 100+ lines
- No score-based conflict resolution
- Difficult to test merge strategies
- No clear separation of concerns

## Decision

### Part 1: Transaction Manager Abstraction
Created `transaction-manager.ts` with prototype-based API:

```typescript
await transactionManager.execute(() => {
  // Operations happen within transaction
  db.exec({ sql: 'INSERT INTO ...', bind: [...] });
});
```

**Features:**
- Automatic BEGIN/COMMIT/ROLLBACK
- Nested transaction support (doesn't double-commit)
- Swallows rollback errors (transaction may already be rolled back)
- Manual control available: `begin()`, `commit()`, `rollback()`, `isInTransaction()`

**Refactored Methods:**
```typescript
// Before (10 lines)
this._db!.exec('BEGIN');
try {
  for (const symbol of symbols) {
    this._db!.exec({ sql: '...', bind: [...] });
  }
  this._db!.exec('COMMIT');
} catch (e) {
  try { this._db!.exec('ROLLBACK'); } catch { /* ignore */ }
  throw e;
}

// After (3 lines)
await this._transactionManager!.execute(() => {
  for (const symbol of symbols) {
    this._db!.exec({ sql: '...', bind: [...] });
  }
});
```

### Part 2: Result Merger Abstraction
Created `result-merger.ts` with Map-based deduplication:

```typescript
const merger = createResultMerger(MAX_SYMBOLS);
merger.addMany(ftsResults.map(r => ({ ...r, source: 'fts' })));
merger.addMany(semanticResults.map(r => ({ ...r, source: 'semantic' })));
const dedupedResults = merger.getResults(); // Sorted by score
```

**Features:**
- Automatic deduplication by `name + file_path`
- Score-based conflict resolution (keeps higher score)
- Source tracking (`'fts'` | `'semantic'` | `'graph'`)
- Configurable result limit
- Score-based sorting

**API:**
- `add(result)`: Add single result with deduplication
- `addMany(results)`: Batch add
- `getResults()`: Get sorted, deduplicated results
- `clear()`: Reset state

### Part 3: Enhanced Error Boundaries
Added logging to all error boundaries in `gather-context.ts`:

```typescript
try {
  // FTS search
} catch (error) {
  console.warn('[gather-context] FTS search failed:', error);
}

try {
  // Semantic search
} catch (error) {
  console.warn('[gather-context] Semantic search failed:', error);
}

try {
  // Graph traversal
} catch (error) {
  console.warn('[gather-context] Graph traversal failed for symbol:', symbol.name, error);
}
```

**Benefits:**
- Silent errors now visible in logs
- Easier debugging in production
- Still degrades gracefully (catches errors, logs, continues)

## Alternatives Considered

### 1. No Abstraction (Keep Inline)
**Pros:**  
- Less code files
- No indirection

**Cons:**  
- Violates DRY principle
- Hard to test transaction behavior
- Merge logic scattered

**Decision**: Rejected - maintainability wins over simplicity

### 2. Class-Based Implementation
**Pros:**  
- Familiar OOP pattern
- Better IDE support

**Cons:**  
- Inconsistent with existing prototype-based codebase
- Larger bundle size

**Decision**: Rejected - consistency with existing patterns

### 3. Transaction Wrapper in Store
**Pros:**  
- Keep transaction logic in store

**Cons:**  
- Harder to test
- Single Responsibility Principle violation

**Decision**: Rejected - separation of concerns wins

### 4. Array-Based Result Merging
**Pros:**  
- Simpler data structure

**Cons:**  
- O(n²) deduplication performance
- No efficient score-based updates

**Decision**: Rejected - Map provides O(1) deduplication

## Consequences

### Positive
- ✅ 30 lines of duplicated transaction code → 1 reusable abstraction
- ✅ Transaction logic now unit-testable in isolation
- ✅ Result merging logic centralized and testable
- ✅ Score-based conflict resolution (higher scores win)
- ✅ Better error visibility via logging
- ✅ Cleaner gather-context.ts (reduced cognitive load)

### Negative
- ⚠️ 3 new files added (transaction-manager, result-merger, tests)
- ⚠️ Slight indirection (need to understand abstractions)

### Neutral
- 🔵 Console.warn logging (production logs may be noisy if searches fail frequently)

## Implementation Files

**Transaction Manager:**
- `transaction-manager.ts` (92 lines) - Core implementation
- `transaction-manager.types.ts` (11 lines) - Type definitions
- `create-transaction-manager.ts` (9 lines) - Factory
- `transaction-manager.test.ts` (158 lines) - Full test coverage

**Result Merger:**
- `result-merger.ts` (82 lines) - Core implementation
- `result-merger.types.ts` (20 lines) - Type definitions
- `create-result-merger.ts` (9 lines) - Factory
- `result-merger.test.ts` (166 lines) - Full test coverage

**Refactored Files:**
- `codebase-index-store.ts` - Uses TransactionManager (3 methods refactored)
- `gather-context.ts` - Uses ResultMerger + enhanced error logging

## Metrics

**Transaction Manager Usage:**
```typescript
// Before: ~30 lines of transaction boilerplate
// After:  ~6 lines using execute()
// Reduction: 80% less code
```

**Result Merger Usage:**
```typescript
// Before: ~40 lines of manual deduplication
// After:  ~10 lines using merger API
// Reduction: 75% less code
```

**Test Coverage:**
- Transaction Manager: 14 test cases
- Result Merger: 12 test cases
- Combined: 26 unit tests validating edge cases

## Future Improvements

### Transaction Manager
1. **Savepoint Support**: Nested transactions via SQL savepoints
2. **Retry Logic**: Automatic retry for transient failures (e.g., SQLITE_BUSY)
3. **Metrics**: Track transaction duration, rollback rate

### Result Merger
1. **Weighted Merging**: Different weights for FTS vs semantic vs graph results
2. **Adaptive Limits**: Dynamic maxResults based on query complexity
3. **Explain API**: Return merge decisions for debugging (which results were dropped and why)

## Related ADRs
- ADR-001: Batch Loading Graph Traversal
- ADR-002: AST Validator Caching

Both of those ADRs focus on performance. This ADR focuses on **architecture quality** (coupling, testability, maintainability).
