/**
 * Arbiter — Phase 3 conflict resolution + escalation chain
 *
 * Escalation chain:
 *   1. BA tries to resolve (prefers simpler, more standard option)
 *   2. If architectural: delegate to Architecture agent
 *   3. If still unresolved OR is a product decision: escalate to User (PO)
 *
 * After a decision is made, the Arbiter broadcasts the outcome to all
 * affected agents and triggers any micro-alignments needed.
 */

import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { BacklogBoard } from './backlog.js'
import { ChatRenderer, promptChoice } from './chat-renderer.js'
import type { ModelRouter } from './model-router.js'
import type {
    ActorId,
    DecisionOption,
    PendingDecision,
    PlanDefinition
} from './plan-types.js'

// ─── Decision registry ────────────────────────────────────────────────────────

export interface ArbiterDecision {
  id: string;
  question: string;
  raisedBy: ActorId;
  chosenOption: DecisionOption;
  resolvedBy: ActorId;  // 'ba' | 'architecture' | 'user'
  rationale: string;
  affectedActors: ActorId[];
  unlockedItems: string[];
  resolvedAt: string;
}

// ─── Pre-defined common conflicts ─────────────────────────────────────────────

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
    context: 'Auth affects every layer — API security, session handling, and frontend routing.',
    options: [
      { label: 'JWT stateless',  description: 'JSON Web Tokens, no server state',      implications: 'Simple to scale, harder to revoke' },
      { label: 'Session-based',  description: 'Server-side sessions (Redis / DB)',      implications: 'Easy revocation, requires session store' },
      { label: 'Auth0 / Clerk',  description: 'Managed identity provider',             implications: 'Fast to implement, vendor dependency' },
      { label: 'NextAuth / Lucia', description: 'Open-source auth library',             implications: 'Full control, more setup' },
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
      { label: 'SQLite',      description: 'Embedded, zero-config',                 implications: 'POC/solo use only — not production-scalable' },
      { label: 'PlanetScale', description: 'Serverless MySQL (Vitess)',              implications: 'Great for edge deployments' },
    ],
    raisedBy: 'architecture',
    affectedActors: ['backend', 'testing'],
  },
  'css-approach': {
    question: 'CSS / styling approach',
    context: 'Affects Frontend development velocity, bundle size, and design consistency.',
    options: [
      { label: 'Tailwind CSS',  description: 'Utility-first, zero runtime',     implications: 'Fast iteration, verbose HTML' },
      { label: 'CSS Modules',   description: 'Scoped CSS, build-time only',      implications: 'Clean, standard, more files' },
      { label: 'MUI / shadcn',  description: 'Full component library',           implications: 'Fastest UI, opinionated styling' },
      { label: 'Styled Components', description: 'CSS-in-JS',                   implications: 'Dynamic styles, runtime overhead' },
    ],
    raisedBy: 'frontend',
    affectedActors: ['frontend', 'e2e'],
  },
};

// ─── Arbiter ──────────────────────────────────────────────────────────────────

export class Arbiter {
  private readonly renderer: ChatRenderer;
  private readonly stateDir: string;
  private readonly modelRouter?: ModelRouter;
  private decisions: ArbiterDecision[] = [];

  constructor(renderer: ChatRenderer, projectRoot: string, modelRouter?: ModelRouter) {
    this.renderer    = renderer;
    this.stateDir    = path.join(projectRoot, '.agents', 'plan-state');
    this.modelRouter = modelRouter;
  }

  // ─── Main entry: raise a decision ─────────────────────────────────────────

  async raise(params: {
    question: string;
    context: string;
    options: DecisionOption[];
    raisedBy: ActorId;
    affectedActors: ActorId[];
    blockedItemIds: string[];
    preferSimple?: boolean;
  }): Promise<ArbiterDecision> {
    const r = this.renderer;
    const pending: PendingDecision = {
      id: randomUUID(),
      question: params.question,
      context: params.context,
      options: params.options,
      raisedBy: params.raisedBy,
      affectedActors: params.affectedActors,
      blockedItemIds: params.blockedItemIds,
      raisedAt: new Date().toISOString(),
    };

    // Step 1: BA attempts to resolve
    const baResolution = await this._baResolve(pending, params.preferSimple ?? true);
    if (baResolution) {
      r.say('ba', `I can resolve this: "${params.question}" → ${baResolution.label}`);
      r.system(`Rationale: ${baResolution.description} — ${baResolution.implications}`);
      r.newline();
      return this._record(pending, baResolution, 'ba', `BA resolved: ${baResolution.implications}`);
    }

    // Step 2: Architectural question — delegate to Architecture
    const isArchitectural = params.raisedBy === 'architecture' || params.affectedActors.includes('architecture');
    if (isArchitectural && params.options.length > 0) {
      r.say('architecture', `This is in my domain — let me assess: "${params.question}"`);
      const archPick = await this._architectureResolve(pending);
      if (archPick) {
        r.say('architecture', `Architecture recommendation: ${archPick.label} — ${archPick.description}`);
        r.say('ba', `Architecture has resolved this. Proceeding with: ${archPick.label}`);
        r.newline();
        return this._record(pending, archPick, 'architecture', `Architecture decided: ${archPick.implications}`);
      }
    }

    // Step 3: Escalate to User
    const escalationMsg = await this._escalationContext(pending);
    r.say('ba', escalationMsg);
    r.decision(pending);

    const choice = await promptChoice(r, params.options.length);

    let chosen: DecisionOption;
    const indexFromLetter = choice.toUpperCase().charCodeAt(0) - 65;

    if (indexFromLetter >= 0 && indexFromLetter < params.options.length) {
      chosen = params.options[indexFromLetter];
    } else {
      // Custom answer
      chosen = {
        label: choice,
        description: 'Custom user-specified option',
        implications: 'Will be evaluated by affected agents',
      };
    }

    r.say('user', `Selected: ${chosen.label}`);
    this._broadcastDecision(pending, chosen, params.affectedActors);

    return this._record(pending, chosen, 'user', `PO decided: ${chosen.label}`);
  }

  // ─── Run standard decision set for a plan ────────────────────────────────

  async runStandardDecisions(
    plan: PlanDefinition,
    board: BacklogBoard,
  ): Promise<void> {
    const r = this.renderer;
    r.say('ba', 'Running standard architecture decision points…');
    r.newline();

    const hasAgent = (id: ActorId) => plan.steps.some((s) => s.agent === id);

    // Api style
    await this.raise({
      ...COMMON_DECISIONS['api-style'],
      id: undefined as never,
      raisedAt: undefined as never,
      blockedItemIds: board.getAll()
        .filter((i) => i.question.toLowerCase().includes('api'))
        .map((i) => i.id),
    } as Parameters<typeof this.raise>[0]);

    // Auth
    await this.raise({
      ...COMMON_DECISIONS['auth-strategy'],
      id: undefined as never,
      raisedAt: undefined as never,
      blockedItemIds: board.getAll()
        .filter((i) => i.question.toLowerCase().includes('auth'))
        .map((i) => i.id),
    } as Parameters<typeof this.raise>[0]);

    // Database (only if backend is in the plan)
    if (hasAgent('backend')) {
      await this.raise({
        ...COMMON_DECISIONS['database'],
        id: undefined as never,
        raisedAt: undefined as never,
        blockedItemIds: board.getAll()
          .filter((i) => i.question.toLowerCase().includes('database') || i.question.toLowerCase().includes('orm'))
          .map((i) => i.id),
      } as Parameters<typeof this.raise>[0]);
    }

    // CSS (only if frontend is in the plan)
    if (hasAgent('frontend')) {
      await this.raise({
        ...COMMON_DECISIONS['css-approach'],
        id: undefined as never,
        raisedAt: undefined as never,
        blockedItemIds: board.getAll()
          .filter((i) => i.question.toLowerCase().includes('design system') || i.question.toLowerCase().includes('css'))
          .map((i) => i.id),
      } as Parameters<typeof this.raise>[0]);
    }

    this._save();
    r.say('ba', `Arbitration complete — ${this.decisions.length} decisions recorded.`);
    r.newline();
  }

  // ─── Micro-alignment ──────────────────────────────────────────────────────

  /**
   * Run a targeted alignment between 2 agents after a key decision.
   * When ModelRouter is available, generates substantive alignment notes via LLM.
   */
  async microAlign(
    actorA: ActorId,
    actorB: ActorId,
    topic: string,
    context: string,
  ): Promise<string> {
    const r = this.renderer;
    r.say('ba', `Micro-alignment: ${topic} \u2014 engaging ${actorA} \u2194 ${actorB}`);

    if (this.modelRouter) {
      try {
        const resp = await this.modelRouter.route('api-design', {
          messages: [
            {
              role: 'system',
              content:
                'You are a Technical Architect facilitating alignment between two software agents. '
                + 'Write 2-3 brief bullet points describing what each agent needs to agree on at their '
                + 'shared boundary. Be concrete and specific to the topic. No markdown headers.',
            },
            {
              role: 'user',
              content: `Agents: ${actorA} and ${actorB}\nTopic: ${topic}\nContext: ${context}`,
            },
          ],
          maxTokens: 200,
        });
        const text = resp.content.trim();
        if (text.length > 10) {
          r.system(text);
          r.newline();
          return `${actorA} \u2194 ${actorB}: ${topic} \u2014 aligned`;
        }
      } catch { /* fall through to heuristic */ }
    }

    r.say(actorA, `Acknowledged. My concern on "${topic}": aligning on shared contract.`);
    r.say(actorB, `Confirmed. I'll consume the output from ${actorA} at this boundary.`);
    r.system(`✓ ${actorA} ↔ ${actorB} aligned on: ${topic}`);
    r.newline();
    return `${actorA} ↔ ${actorB}: ${topic} — aligned`;
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  getDecisions(): ArbiterDecision[] { return [...this.decisions]; }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * BA tries to resolve by picking the simplest/most standard option.
   * Uses haiku (validation) when ModelRouter is available.
   */
  private async _baResolve(
    pending: PendingDecision,
    preferSimple: boolean,
  ): Promise<DecisionOption | null> {
    if (!preferSimple) return null;
    const opts = pending.options;
    if (opts.length === 0) return null;
    if (opts.length === 1) return opts[0];

    // LLM-backed: haiku reasons about simplest standard choice
    if (this.modelRouter) {
      try {
        const optList = opts.map((o, i) =>
          `${String.fromCharCode(65 + i)}) ${o.label}: ${o.description} — ${o.implications}`
        ).join('\n');
        const resp = await this.modelRouter.route('validation', {
          messages: [
            {
              role: 'system',
              content:
                'You are a Business Analyst. Given a decision and its options, decide if there is '
                + 'a clearly simplest or most standard option that does NOT require architectural expertise '
                + 'or product input. If yes, reply with ONLY the letter (A/B/C/D). '
                + 'If it requires architectural expertise or product input, reply with exactly: DEFER',
            },
            {
              role: 'user',
              content: `Decision: ${pending.question}\n\nOptions:\n${optList}`,
            },
          ],
          maxTokens: 10,
        });
        const ans = resp.content.trim().toUpperCase();
        if (ans === 'DEFER') return null;
        const idx = ans.charCodeAt(0) - 65;
        if (idx >= 0 && idx < opts.length) return opts[idx];
      } catch { /* fall through to heuristic */ }
    }

    // Heuristic: BA defers multi-option decisions
    return null;
  }

  /**
   * Architecture agent resolves by performing technical trade-off analysis.
   * Uses opus (hard-barrier-resolution) for robust reasoning.
   */
  private async _architectureResolve(pending: PendingDecision): Promise<DecisionOption | null> {
    // LLM-backed: opus analyses trade-offs deeply
    if (this.modelRouter) {
      try {
        const optList = pending.options.map((o, i) =>
          `${String.fromCharCode(65 + i)}) ${o.label}: ${o.description} — ${o.implications}`
        ).join('\n');
        const resp = await this.modelRouter.route('hard-barrier-resolution', {
          messages: [
            {
              role: 'system',
              content:
                'You are a senior software architect. Analyse the technical trade-offs and pick '
                + 'the best option for a production system. Reply with ONLY the option letter (A/B/C/D). '
                + 'No explanation.',
            },
            {
              role: 'user',
              content:
                `Decision: ${pending.question}\n`
                + `Context: ${pending.context}\n\n`
                + `Options:\n${optList}`,
            },
          ],
          maxTokens: 10,
        });
        const ans = resp.content.trim().toUpperCase();
        const idx = ans.charCodeAt(0) - 65;
        if (idx >= 0 && idx < pending.options.length) return pending.options[idx];
      } catch { /* fall through to heuristic */ }
    }

    // Heuristic fallback: keyword scoring
    const signals = ['standard', 'acid', 'scale', 'type-safe', 'relational', 'familiar', 'production'];
    const scored = pending.options.map((opt) => {
      const text = `${opt.label} ${opt.description} ${opt.implications}`.toLowerCase();
      const score = signals.filter((s) => text.includes(s)).length;
      return { opt, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].score > 0 ? scored[0].opt : null;
  }

  /**
   * Generate context message for why this decision requires PO input.
   * Uses haiku (fast) — explains the business impact concisely.
   */
  private async _escalationContext(pending: PendingDecision): Promise<string> {
    if (this.modelRouter) {
      try {
        const resp = await this.modelRouter.route('file-analysis', {
          messages: [
            {
              role: 'system',
              content:
                'You are a Scrum Master escalating a technical decision to the Product Owner. '
                + 'Write ONE sentence explaining the business impact of this decision and why '
                + 'the PO must decide. Be direct and non-technical. No markdown.',
            },
            {
              role: 'user',
              content:
                `Decision: ${pending.question}\n`
                + `Context: ${pending.context}\n`
                + `Affected agents: ${pending.affectedActors.join(', ')}`,
            },
          ],
          maxTokens: 80,
        });
        const text = resp.content.trim();
        if (text.length > 10) return text;
      } catch { /* fall through */ }
    }
    return `This requires your decision as PO. ${pending.affectedActors.length} agents are waiting.`;
  }

  private _broadcastDecision(
    pending: PendingDecision,
    chosen: DecisionOption,
    affected: ActorId[],
  ): void {
    const r = this.renderer;
    r.say('ba', `Broadcasting decision to ${affected.length} agents: "${chosen.label}"`);
    for (const actorId of affected) {
      r.say(actorId, `Decision received — "${pending.question}" → ${chosen.label}. Updating my plan.`);
    }
    r.newline();
  }

  private _record(
    pending: PendingDecision,
    chosen: DecisionOption,
    resolvedBy: ActorId,
    rationale: string,
  ): ArbiterDecision {
    const d: ArbiterDecision = {
      id: pending.id,
      question: pending.question,
      raisedBy: pending.raisedBy,
      chosenOption: chosen,
      resolvedBy,
      rationale,
      affectedActors: pending.affectedActors,
      unlockedItems: pending.blockedItemIds,
      resolvedAt: new Date().toISOString(),
    };
    this.decisions.push(d);
    return d;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private _save(): void {
    fs.mkdirSync(this.stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.stateDir, 'decisions.json'),
      JSON.stringify(this.decisions, null, 2),
    );
  }
}
