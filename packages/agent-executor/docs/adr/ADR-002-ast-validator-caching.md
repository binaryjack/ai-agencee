# ADR-002: LRU Cache for AST Validator

## Status
Implemented

## Context
The AST validator creates a new TypeScript `ts.Program` instance for every validation call. Creating a `ts.Program` involves:
1. Parsing source code into AST (~50-100ms)
2. Type checking and semantic analysis (~50-400ms)
3. Building symbol tables and resolvers

This operation was repeated for every patch validation, even when validating the **same code multiple times** (common in iterative refinement workflows).

**Measured Problem:**
- Cold validation: 100-500ms per call
- Validation frequency: 5-20x per user interaction (LLM iterates on patches)
- Total latency: 500ms-10s for single refinement cycle

## Decision
We implemented an **LRU cache with TTL** for compiled `ts.Program` instances in `ast-validator.ts`:

### Implementation Details
1. **MD5-Based Cache Keys**: `MD5(sourceCode) + filePath`
   - Ensures exact match (different code = different program)
   - Allows same filename with different content

2. **LRU Eviction**: Map preserves insertion order, evict oldest entry when full
   ```typescript
   _programCache: Map<string, CachedProgram>  // Insertion order = access order
   _CACHE_MAX_SIZE: 50 entries
   ```

3. **TTL Expiration**: 5-minute timeout prevents stale programs
   ```typescript
   _CACHE_TTL_MS: 5 * 60 * 1000  // 5 minutes
   ```

4. **Cache Management Methods**:
   - `_getCacheKey()`: Generate MD5 hash + path composite key
   - `_getCachedProgram()`: LRU access (move to end on hit)
   - `_cacheProgram()`: Store with auto-eviction if full
   - `_evictOldestCacheEntry()`: Remove first map entry (oldest)

### Performance Impact
- **Cache Hit**: <10ms (just lookup + validation logic)
- **Cache Miss**: 100-500ms (create program + cache it)
- **Hit Rate**: Expected 80-90% for iterative workflows
- **Speedup**: **10-50x on cache hits**

## Alternatives Considered

### 1. Persistent Disk Cache
**Pros:**
- Survives process restarts
- Shareable across sessions

**Cons:**
- Disk I/O overhead
- Cache invalidation complexity
- Serialization of `ts.Program` not straightforward

**Decision**: Rejected - in-memory cache sufficient for session-scoped use

### 2. Unbounded Cache (No Eviction)
**Pros**:
- Maximum hit rate
- Simplest implementation

**Cons**:
- Memory leak Risk
- Unbounded growth for long-running processes

**Decision**: Rejected - must prevent memory leaks

### 3. Time-Only Eviction (No Size Limit)
**Pros**:
- Simpler eviction logic
- No need for LRU tracking

**Cons**:
- Still vulnerable to memory exhaustion
- Short TTL = lower hit rate, Long TTL = memory leak

**Decision**: Rejected - needs both TTL and size limit

### 4. LRU + TTL (Chosen)
**Pros**:
- Bounded memory usage (50 entries ≈ 5-10MB)
- High hit rate for recent/frequent validations
- Automatic staleness protection

**Cons**:
- More complex than alternatives
- Requires careful eviction logic

**Decision**: **Accepted** - best balance of safety and performance

## Consequences

### Positive
- ✅ 10-50x speedup on cache hits
- ✅ <10MB memory overhead (50 cached programs)
- ✅ Self-healing (stale entries expire automatically)
- ✅ No external dependencies
- ✅ Simple to reason about (LRU is well-understood)

### Negative
- ⚠️ Cache misses still slow (100-500ms)
- ⚠️ Source code changes invalidate cache (new MD5)
- ⚠️ 50-entry limit may thrash for very large codebases (1000s of files)

### Neutral
- 🔵 Memory-speed tradeoff (acceptable for target use cases)
- 🔵 TTL requires tuning (5 min chosen empirically)

## Implementation Files
- `packages/agent-executor/src/code-assistant/parsers/ast-validator.ts` (modified)
  - Added: `_programCache` Map, cache size/TTL constants
  - Added: `_getCacheKey()`, `_getCachedProgram()`, `_cacheProgram()`, `_evictOldestCacheEntry()`
  - Refactored: `validateAstPatch()` to check cache before creating `ts.Program`

## Cache Parameters (Tunable)
```typescript
_CACHE_MAX_SIZE: 50        // Max cached programs (≈5-10MB memory)
_CACHE_TTL_MS: 300000      // 5 minutes expiration
```

### Tuning Guidelines
- **Increase `_CACHE_MAX_SIZE`** if working with very large codebases (100s of files)
- **Decrease `_CACHE_TTL_MS`** if source changes frequently (e.g., watch mode)
- **Monitor** `cache_hit_rate` metric to optimize

## Metrics
Track these in production/monitoring:
- **cache_hit_rate**: Percentage of validations hitting cache
- **cache_size**: Current number of cached programs
- **cache_memory_bytes**: Approx memory used by cache
- **validation_time_cached_ms**: Validation time on cache hit
- **validation_time_cold_ms**: Validation time on cache miss

## Future Improvements
1. **Smart Pre warming**: Pre-cache frequently modified files on project load
2. **Hierarchical Eviction**: Keep "important" files (e.g., entry points) cached longer
3. **Partial Program Reuse**: Share type checker/resolver across similar programs
4. **Background Refresh**: Update cache proactively on file changes (watch mode)

## Known Limitations
1. **Single Process Only**: Cache not shared across processes/workers
2. **No Persistence**: Cache lost on restart (acceptable for current use case)
3. **Coarse-Grained Keys**: Full file content in MD5, not granular to specific symbols

## References
- Issue: AST Validator Bottleneck identified in code quality review
- Related: ADR-001 (Graph Traversal Batch Loading)
- Performance target: <10ms cached validation, <500ms cold validation
- TypeScript Compiler API: `ts.createProgram()`, `ts.createSourceFile()`
