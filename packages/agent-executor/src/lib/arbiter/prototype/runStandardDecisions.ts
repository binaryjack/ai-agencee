import type { IBacklogBoard } from '../../backlog/index.js';
import type { ActorId, PendingDecision, PlanDefinition } from '../../plan-types.js';
import type { IArbiter } from '../arbiter.js';

const COMMON_DECISIONS: Record<string, Omit<PendingDecision, 'id' | 'raisedAt' | 'blockedItemIds'>> = {
  'api-style': {
    question: 'API communication style',
    context: 'The API style affects Frontend integration, Backend structure, and documentation strategy.',
    options: [
      { label: 'REST',     description: 'Standard HTTP verbs, OpenAPI spec', implications: 'Familiar, well-tooled, slightly verbose' },
      { label: 'GraphQL',  description: 'Schema-first, flexible queries',    implications: 'More powerful but higher complexity' },
      { label: 'tRPC',     description: 'Type-safe end-to-end TypeScript',   implications: 'Best for full-stack TypeScript, no client codegen' },
    ],
    raisedBy: 'architecture',
    affectedActors: ['backend', 'frontend', 'testing'],
  },
  'auth-strategy': {
    question: 'Authentication strategy',
    context: 'Auth affects every layer \u2013 API security, session handling, and frontend routing.',
    options: [
      { label: 'JWT stateless',    description: 'JSON Web Tokens, no server state',   implications: 'Simple to scale, harder to revoke' },
      { label: 'Session-based',    description: 'Server-side sessions (Redis / DB)',   implications: 'Easy revocation, requires session store' },
      { label: 'Auth0 / Clerk',    description: 'Managed identity provider',          implications: 'Fast to implement, vendor dependency' },
      { label: 'NextAuth / Lucia', description: 'Open-source auth library',           implications: 'Full control, more setup' },
    ],
    raisedBy: 'architecture',
    affectedActors: ['backend', 'frontend', 'security'],
  },
  'database': {
    question: 'Database engine',
    context: 'Database choice affects schema design, query patterns, and hosting.',
    options: [
      { label: 'PostgreSQL',  description: 'Relational, ACID, row-level security', implications: 'Best for structured data + complex queries' },
      { label: 'MongoDB',     description: 'Document store, flexible schema',       implications: 'Good for nested/variable data' },
      { label: 'SQLite',      description: 'Embedded, zero-config',                 implications: 'POC/solo use only \u2013 not production-scalable' },
      { label: 'PlanetScale', description: 'Serverless MySQL (Vitess)',              implications: 'Great for edge deployments' },
    ],
    raisedBy: 'architecture',
    affectedActors: ['backend', 'testing'],
  },
  'css-approach': {
    question: 'CSS / styling approach',
    context: 'Affects Frontend development velocity, bundle size, and design consistency.',
    options: [
      { label: 'Tailwind CSS',      description: 'Utility-first, zero runtime',  implications: 'Fast iteration, verbose HTML' },
      { label: 'CSS Modules',       description: 'Scoped CSS, build-time only',   implications: 'Clean, standard, more files' },
      { label: 'MUI / shadcn',      description: 'Full component library',        implications: 'Fastest UI, opinionated styling' },
      { label: 'Styled Components', description: 'CSS-in-JS',                     implications: 'Dynamic styles, runtime overhead' },
    ],
    raisedBy: 'frontend',
    affectedActors: ['frontend', 'e2e'],
  },
};

export async function runStandardDecisions(
  this: IArbiter,
  plan: PlanDefinition,
  board: IBacklogBoard,
): Promise<void> {
  const r = this._renderer;
  r.say('ba', 'Running standard architecture decision points\u2026');
  r.newline();

  const hasAgent = (id: ActorId) => plan.steps.some((s) => s.agent === id);

  await this.raise({
    ...COMMON_DECISIONS['api-style'],
    blockedItemIds: board.getAll()
      .filter((i) => i.question.toLowerCase().includes('api'))
      .map((i) => i.id),
  });

  await this.raise({
    ...COMMON_DECISIONS['auth-strategy'],
    blockedItemIds: board.getAll()
      .filter((i) => i.question.toLowerCase().includes('auth'))
      .map((i) => i.id),
  });

  if (hasAgent('backend')) {
    await this.raise({
      ...COMMON_DECISIONS['database'],
      blockedItemIds: board.getAll()
        .filter((i) => i.question.toLowerCase().includes('database') || i.question.toLowerCase().includes('orm'))
        .map((i) => i.id),
    });
  }

  if (hasAgent('frontend')) {
    await this.raise({
      ...COMMON_DECISIONS['css-approach'],
      blockedItemIds: board.getAll()
        .filter((i) => i.question.toLowerCase().includes('design system') || i.question.toLowerCase().includes('css'))
        .map((i) => i.id),
    });
  }

  this._save();
  r.say('ba', `Arbitration complete \u2013 ${this._decisions.length} decisions recorded.`);
  r.newline();
}
