# Refactoring Roadmap
# Quality Improvement Action Plan

**Created:** March 29, 2026  
**Status:** PROPOSED  
**Timeline:** 6 weeks  
**Assignee:** TBD

---

## Overview

This roadmap addresses the violations identified in [QUALITY-VIOLATIONS-AUDIT.md](./QUALITY-VIOLATIONS-AUDIT.md) in a phased approach that minimizes disruption while maximizing quality improvements.

**Goals:**
- Reduce technical debt by 70%
- Improve maintainability index from 4/10 to 8/10
- Achieve 80%+ test coverage on critical paths
- Establish sustainable architectural patterns

---

## Phase 1: Foundation (Week 1-2)

**Objective:** Eliminate quick wins and establish infrastructure for future improvements

### Task 1.1: Create Constants & Configuration Module

**Priority:** CRITICAL  
**Effort:** 2 days  
**Files:** `packages/cli/src/constants/*`

#### Deliverables:

```
packages/cli/src/constants/
├── paths.ts          # File paths and directories
├── providers.ts      # LLM provider configurations
├── templates.ts      # Template metadata
├── urls.ts           # External URLs
└── index.ts          # Barrel export
```

#### Implementation:

**`packages/cli/src/constants/paths.ts`**
```typescript
import { join } from 'path';

/**
 * Centralized path constants for CLI package
 * All paths relative to package root
 */
export const PATHS = {
  // Template directories
  TEMPLATES_ROOT: join(__dirname, '../../templates'),
  TEMPLATES_DEMOS: join(__dirname, '../../templates/demos'),
  TEMPLATES_USE_CASES: join(__dirname, '../../templates/use-cases'),
  TEMPLATES_AGENTS: join(__dirname, '../../templates/agents'),
  
  // Project structure
  PROJECT_AGENTS_DIR: 'agents',
  PROJECT_CACHE_DIR: '.agents',
  PROJECT_CONFIG_FILE: '.agencee.json',
  
  // User files
  ENV_FILE: '.env',
  GITIGNORE_FILE: '.gitignore',
} as const;

export type PathKey = keyof typeof PATHS;
```

**`packages/cli/src/constants/providers.ts`**
```typescript
/**
 * LLM provider configuration
 */
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    signupUrl: 'https://console.anthropic.com',
    models: {
      haiku: 'claude-3-haiku-20240307',
      sonnet: 'claude-3-sonnet-20240229',
      opus: 'claude-3-opus-20240229',
    },
  },
  openai: {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    signupUrl: 'https://platform.openai.com',
    models: {
      gpt4: 'gpt-4-turbo-preview',
      gpt35: 'gpt-3.5-turbo',
    },
  },
  mock: {
    name: 'Mock Provider',
    envVar: null,
    signupUrl: null,
    models: {
      deterministic: 'mock-deterministic',
    },
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

export function getProviderConfig(name: ProviderName) {
  return PROVIDERS[name];
}
```

#### Migration Strategy:

1. Create constants modules
2. Update imports gradually (file by file)
3. Use ESLint rule to prevent direct strings
4. Remove old hardcoded values

**Impact:** 20+ files affected, eliminates 50+ hardcoded strings

---

### Task 1.2: Implement TypeScript Path Aliases

**Priority:** CRITICAL  
**Effort:** 1 day

#### Deliverables:

Update all `tsconfig.json` files in packages:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@cli/*": ["packages/cli/src/*"],
      "@cli/constants": ["packages/cli/src/constants"],
      "@cli/services": ["packages/cli/src/services"],
      "@cli/utils": ["packages/cli/src/utils"],
      
      "@engine/*": ["packages/agent-executor/src/*"],
      "@engine/lib": ["packages/agent-executor/src/lib/*"],
      
      "@mcp/*": ["packages/mcp/src/*"],
      "@core/*": ["packages/core/src/*"],
      "@connectors/*": ["packages/connectors/src/*"]
    }
  }
}
```

#### Migration:

Use find-and-replace with regex:
```bash
# Example: Replace ../../../lib/model-router with @engine/lib/model-router
find packages -name "*.ts" -exec sed -i 's|from ['"'"'"]\.\.\/\.\.\/\.\.\/lib\/model-router|from @engine/lib/model-router|g' {} +
```

**Impact:** 100+ import statements cleaned

---

### Task 1.3: Create Logger Service

**Priority:** HIGH  
**Effort:** 3 days

#### Deliverables:

```
packages/cli/src/services/
├── logger/
│   ├── logger.ts           # Core logger implementation
│   ├── console-transport.ts # Console output
│   ├── file-transport.ts    # File logging (optional)
│   ├── types.ts            # Logger types
│   └── index.ts
```

#### Implementation:

**`packages/cli/src/services/logger/logger.ts`**
```typescript
import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export class Logger {
  private static testMode = false;
  private static testLogs: LogEntry[] = [];
  
  constructor(
    private minLevel: LogLevel = LogLevel.INFO,
    private namespace?: string
  ) {}
  
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  success(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, chalk.green(`✅ ${message}`), context);
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.minLevel) return;
    
    const entry: LogEntry = {
      level,
      message: this.namespace ? `[${this.namespace}] ${message}` : message,
      timestamp: new Date(),
      context,
    };
    
    if (Logger.testMode) {
      Logger.testLogs.push(entry);
      return;
    }
    
    this.output(entry);
  }
  
  private output(entry: LogEntry): void {
    const prefix = this.getPrefix(entry.level);
    const message = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      default:
        console.log(message);
    }
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(chalk.dim(JSON.stringify(entry.context, null, 2)));
    }
  }
  
  private getPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return chalk.gray('[DEBUG]');
      case LogLevel.INFO:  return chalk.blue('[INFO]');
      case LogLevel.WARN:  return chalk.yellow('[WARN]');
      case LogLevel.ERROR: return chalk.red('[ERROR]');
      default: return '';
    }
  }
  
  // Testing utilities
  static setTestMode(enabled: boolean): void {
    Logger.testMode = enabled;
    Logger.testLogs = [];
  }
  
  static getTestLogs(): LogEntry[] {
    return Logger.testLogs;
  }
  
  static clearTestLogs(): void {
    Logger.testLogs = [];
  }
}

// Global logger instance
export const logger = new Logger();
```

#### Migration Example:

**Before:**
```typescript
console.log('\n✅ Setup complete!\n');
console.error('❌ Setup failed:', error);
process.exit(1);
```

**After:**
```typescript
logger.success('Setup complete!');
logger.error('Setup failed', { error: error.message });
throw new SetupError('Setup failed', { cause: error });
```

**Impact:** Replace 200+ console.log calls

---

### Task 1.4: Define Core Domain Types

**Priority:** HIGH  
**Effort:** 3 days

#### Deliverables:

```
packages/cli/src/types/
├── dag.types.ts        # DAG structure types
├── command.types.ts    # CLI command types
├── config.types.ts     # Configuration types
├── provider.types.ts   # LLM provider types
└── index.ts
```

#### Implementation:

**`packages/cli/src/types/dag.types.ts`**
```typescript
/**
 * Comprehensive DAG type definitions
 * Replaces: any, Record<string, any>, inline types
 */

export interface Dag {
  name: string;
  description: string;
  lanes: DagLane[];
  globalBarriers: string[];
  capabilityRegistry: CapabilityRegistry;
  modelRouterFile: string;
}

export interface DagLane {
  id: string;
  agentFile: string;
  supervisorFile: string;
  dependsOn: string[];
  capabilities: string[];
}

export interface CapabilityRegistry {
  [capability: string]: string | string[];
}

// Type guards
export function isDag(value: unknown): value is Dag {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.lanes) &&
    obj.lanes.every(isDagLane)
  );
}

export function isDagLane(value: unknown): value is DagLane {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.agentFile === 'string' &&
    typeof obj.supervisorFile === 'string' &&
    Array.isArray(obj.dependsOn) &&
    Array.isArray(obj.capabilities)
  );
}
```

**Impact:** Replace 30+ `any` types

---

## Phase 2: Service Layer (Week 3-4)

**Objective:** Introduce service layer and dependency injection

### Task 2.1: Create File Service

**Priority:** HIGH  
**Effort:** 2 days

```typescript
// packages/cli/src/services/file-service.ts

export class FileService {
  constructor(private logger: Logger) {}
  
  async readJson<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error(`Failed to read JSON file: ${filePath}`, { error });
      throw new FileReadError(filePath, { cause: error });
    }
  }
  
  async writeJson<T>(filePath: string, data: T, pretty = true): Promise<void> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await this.write(filePath, content);
  }
  
  async write(filePath: string, content: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.debug(`Wrote file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to write file: ${filePath}`, { error });
      throw new FileWriteError(filePath, { cause: error });
    }
  }
  
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### Task 2.2: Create Template Service

**Priority:** MEDIUM  
**Effort:** 3 days

```typescript
// packages/cli/src/services/template-service.ts

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  files: string[];
}

export class TemplateService {
  constructor(
    private fileService: FileService,
    private logger: Logger
  ) {}
  
  async listTemplates(): Promise<TemplateMetadata[]> {
    const templatesDir = PATHS.TEMPLATES_USE_CASES;
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    
    const templates: TemplateMetadata[] = [];
    
    for (const entry of entries.filter(e => e.isDirectory())) {
      const metadataPath = path.join(templatesDir, entry.name, 'template.json');
      
      if (await this.fileService.exists(metadataPath)) {
        const metadata = await this.fileService.readJson<TemplateMetadata>(metadataPath);
        templates.push(metadata);
      }
    }
    
    return templates;
  }
  
  async installTemplate(templateId: string, targetDir: string): Promise<void> {
    this.logger.info(`Installing template: ${templateId}`, { targetDir });
    
    const templateDir = path.join(PATHS.TEMPLATES_USE_CASES, templateId);
    
    if (!(await this.fileService.exists(templateDir))) {
      throw new TemplateNotFoundError(templateId);
    }
    
    // Copy template files
    await this.copyTemplateFiles(templateDir, targetDir);
    
    this.logger.success(`Template installed: ${templateId}`);
  }
  
  private async copyTemplateFiles(source: string, target: string): Promise<void> {
    // Implementation...
  }
}
```

---

### Task 2.3: Create DAG Service

**Priority:** HIGH  
**Effort:** 3 days

```typescript
// packages/cli/src/services/dag-service.ts

export class DagService {
  constructor(
    private fileService: FileService,
    private modelRouter: IModelRouter,
    private logger: Logger
  ) {}
  
  async generateFromDescription(description: string): Promise<Dag> {
    this.logger.info('Generating DAG from description');
    
    const systemPrompt = await this.loadSystemPrompt();
    const userPrompt = `Create a DAG workflow for: "${description}"`;
    
    const response = await this.modelRouter.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'haiku',
      max_tokens: 4000,
    });
    
    const dagJson = this.extractJson(response.content);
    
    if (!isDag(dagJson)) {
      throw new InvalidDagError('Generated DAG failed validation');
    }
    
    return dagJson;
  }
  
  async validate(dag: Dag): Promise<ValidationResult> {
    return validateDagContract(dag);
  }
  
  async save(dag: Dag, filePath: string): Promise<void> {
    await this.fileService.writeJson(filePath, dag);
    this.logger.success(`DAG saved: ${filePath}`);
  }
  
  async load(filePath: string): Promise<Dag> {
    const dag = await this.fileService.readJson<Dag>(filePath);
    
    if (!isDag(dag)) {
      throw new InvalidDagError(`Invalid DAG file: ${filePath}`);
    }
    
    return dag;
  }
  
  private async loadSystemPrompt(): Promise<string> {
    const promptPath = path.join(__dirname, '../prompts/dag-generator.prompt.md');
    const content = await fs.readFile(promptPath, 'utf-8');
    return content;
  }
  
  private extractJson(content: string): unknown {
    let jsonStr = content.trim();
    
    // Handle markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    }
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      throw new JsonParseError('Failed to extract JSON from LLM response', { cause: error });
    }
  }
}
```

---

### Task 2.4: Refactor Commands with DI

**Priority:** HIGH  
**Effort:** 4 days

#### Strategy:

1. Create service container
2. Update command functions to accept services
3. Wire up in main CLI entry point

**Example: Refactored Compose Command**

**Before:**
```typescript
export async function runCompose(options: ComposeOptions): Promise<void> {
  const description = options.description;
  
  const modelRouter = new ModelRouter(/* config */);
  const dagJson = await generateDagFromDescription(description, modelRouter, verbose);
  
  console.log('\n📋 Generated DAG:\n');
  console.log(JSON.stringify(dagJson, null, 2));
  
  const validation = validateDagContract(dagJson);
  
  if (!validation.valid) {
    console.error('❌ Validation failed');
    process.exit(1);
  }
  
  const { approved } = await prompts({ /* ... */ });
  
  await fs.writeFile(outputPath, JSON.stringify(dagJson, null, 2));
  console.log(`✅ DAG saved: ${outputPath}`);
}
```

**After:**
```typescript
export async function runCompose(
  options: ComposeOptions,
  services: {
    dagService: DagService;
    presenter: ComposePresenter;
    logger: Logger;
  }
): Promise<void> {
  const { dagService, presenter, logger } = services;
  
  try {
    logger.info('Starting DAG composition', { description: options.description });
    
    // Generate
    const dag = await dagService.generateFromDescription(options.description);
    
    // Display
    presenter.displayDag(dag);
    
    // Validate
    const validation = await dagService.validate(dag);
    presenter.displayValidation(validation);
    
    if (!validation.valid) {
      throw new ValidationError('DAG validation failed', validation.errors);
    }
    
    // Confirm (unless skipped)
    if (!options.skipApproval && !(await presenter.confirmSave())) {
      logger.info('DAG composition cancelled by user');
      return;
    }
    
    // Save
    const outputPath = options.output || './agents/dag.json';
    await dagService.save(dag, outputPath);
    
    presenter.showSuccess(outputPath);
    
  } catch (error) {
    logger.error('DAG composition failed', { error });
    throw error;
  }
}
```

---

## Phase 3: Extraction & Separation (Week 5-6)

**Objective:** Extract embedded content and split monolithic modules

### Task 3.1: Extract System Prompts

**Priority:** MEDIUM  
**Effort:** 1 day

Move prompts from source code to dedicated files:

```
packages/cli/prompts/
├── dag-generator.prompt.md        # From compose/index.ts
├── security-review.prompt.md      # Future prompts
└── README.md                      # Prompt engineering guide
```

---

### Task 3.2: Extract Template Configurations

**Priority:** MEDIUM  
**Effort:** 2 days

Move embedded templates to JSON files:

```
packages/cli/templates/use-cases/
├── security-scan/
│   ├── template.json
│   ├── dag.json
│   ├── agents/
│   │   ├── security-agent.json
│   │   └── security-supervisor.json
│   └── README.md
├── code-review/
│   └── ...
└── refactoring/
    └── ...
```

---

### Task 3.3: Split Monolithic Commands

**Priority:** MEDIUM  
**Effort:** 3 days

**Target:** `packages/cli/src/commands/setup/index.ts` (380+ lines)

Split into:

```
packages/cli/src/commands/setup/
├── index.ts              # Main command entry (50 lines)
├── wizard.ts             # Interactive prompts (100 lines)
├── initializer.ts        # Project setup (80 lines)
├── api-key-manager.ts    # API key handling (60 lines)
└── presenter.ts          # Output formatting (90 lines)
```

---

### Task 3.4: Create Custom Error Classes

**Priority:** MEDIUM  
**Effort:** 2 days

```typescript
// packages/cli/src/errors/

export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class FileNotFoundError extends CliError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
  }
}

export class ValidationError extends CliError {
  constructor(message: string, public readonly errors: string[]) {
    super(message, 'VALIDATION_ERROR', { errors });
  }
}

export class SetupCancelledError extends CliError {
  constructor() {
    super('Setup cancelled by user', 'SETUP_CANCELLED');
  }
}

// ... more error classes
```

Replace all `process.exit()` with proper error throwing.

---

## Quality Gates

Each phase must meet these criteria before proceeding:

### Phase 1 Gates:
- [ ] Zero hardcoded paths in modified files
- [ ] All imports use path aliases (no ../../../)
- [ ] Logger used instead of console.log in modified files
- [ ] All new types properly defined (no `any`)

### Phase 2 Gates:
- [ ] Services have >80% test coverage
- [ ] Commands accept dependencies via parameters
- [ ] No direct file I/O in command functions
- [ ] All services documented with JSDoc

### Phase 3 Gates:
- [ ] No embedded templates/prompts in source
- [ ] All command files <200 lines
- [ ] Custom errors used instead of process.exit
- [ ] Integration tests pass

---

## Testing Strategy

### Unit Tests
- All services must have unit tests
- Use dependency injection for mocking
- Target: 80% coverage on services

### Integration Tests
- Test command workflows end-to-end
- Use test logger to verify output
- Mock file system operations

### Regression Tests
- Ensure existing functionality unchanged
- Run before and after each phase

---

## Monitoring & Metrics

Track progress with:

```bash
# Count `any` types
grep -r ": any" packages | wc -l

# Count console.log
grep -r "console\." packages/cli/src | wc -l

# Count relative imports (3+ levels)
grep -r "from.*\.\.\/\.\.\/\.\." packages | wc -l

# Average lines per command file
find packages/cli/src/commands -name "*.ts" -exec wc -l {} + | awk '{sum+=$1; count++} END {print sum/count}'
```

**Target Metrics (End of Phase 3):**
- `any` types: <10
- console.log: <20 (only in presenters)
- Deep imports: 0
- Avg command file size: <150 lines

---

## Rollout Plan

### Week 1-2 (Phase 1)
| Task | Days | Assignee | Status |
|------|------|----------|--------|
| 1.1 Constants | 2 | TBD | ⏳ Planned |
| 1.2 Path Aliases | 1 | TBD | ⏳ Planned |
| 1.3 Logger Service | 3 | TBD | ⏳ Planned |
| 1.4 Core Types | 3 | TBD | ⏳ Planned |

### Week 3-4 (Phase 2)
| Task | Days | Assignee | Status |
|------|------|----------|--------|
| 2.1 File Service | 2 | TBD | ⏳ Planned |
| 2.2 Template Service | 3 | TBD | ⏳ Planned |
| 2.3 DAG Service | 3 | TBD | ⏳ Planned |
| 2.4 Refactor Commands | 4 | TBD | ⏳ Planned |

### Week 5-6 (Phase 3)
| Task | Days | Assignee | Status |
|------|------|----------|--------|
| 3.1 Extract Prompts | 1 | TBD | ⏳ Planned |
| 3.2 Extract Templates | 2 | TBD | ⏳ Planned |
| 3.3 Split Commands | 3 | TBD | ⏳ Planned |
| 3.4 Error Classes | 2 | TBD | ⏳ Planned |

---

## Risk Mitigation

### Risk: Breaking Changes
**Mitigation:** 
- Maintain backward compatibility
- Feature flags for new behavior
- Extensive regression testing

### Risk: Merge Conflicts
**Mitigation:**
- Work in short-lived feature branches
- Merge to main daily
- Automated conflict resolution

### Risk: Team Resistance
**Mitigation:**
- Pair programming on refactoring
- Document benefits with examples
- Incremental adoption

---

## Success Criteria

Phase 1-3 complete when:
1. ✅ All quality gates passed
2. ✅ Test coverage >80% on services
3. ✅ CI/CD pipeline green
4. ✅ Documentation updated
5. ✅ Team sign-off on architecture

**Next:** Continuous improvement and monitoring.

---

**End of Roadmap**
