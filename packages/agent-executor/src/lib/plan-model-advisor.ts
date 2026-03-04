/**
 * PlanModelAdvisor — LLM model selection advisor for the Plan System
 *
 * Runs before Phase 0.  Shows the user:
 *   • Which providers are available (API keys detected)
 *   • Which model is recommended for each phase + WHY
 *   • Estimated cost range for the full plan
 *   • How to override (--provider flag)
 *
 * When a ModelRouter is available, the advisor can ITSELF use the cheapest
 * model (haiku) to generate a plain-language explanation of why each model
 * family is best for each phase — so the recommendation is AI-generated
 * rather than hardcoded marketing text.
 */

import type { ModelRouter } from './model-router.js';
import type { TaskType } from './llm-provider.js';
import type { QualityGrade } from './plan-types.js';
import { ChatRenderer } from './chat-renderer.js';

// ─── Phase → task-type mapping ────────────────────────────────────────────────

/** Each plan phase uses a different task type for its primary LLM calls */
export const PHASE_TASK_MAP: Record<string, TaskType> = {
  discover:   'file-analysis',          // haiku — Q&A acknowledgements, cheap
  synthesize: 'architecture-decision',  // opus  — complex plan reasoning
  decompose:  'api-design',             // sonnet — backlog generation per agent
  wire:       'hard-barrier-resolution',// opus  — dependency + conflict resolution
  execute:    'code-generation',        // sonnet — implementation tasks
};

export interface PhaseModelAdvice {
  phase:      string;
  taskType:   TaskType;
  family:     string;     // haiku | sonnet | opus
  modelId:    string;     // actual resolved model ID
  reason:     string;     // WHY this model for this phase
  costNote:   string;     // rough token estimate
}

export interface ModelAdvisorReport {
  availableProviders: string[];
  activeProvider:     string;
  phases:             PhaseModelAdvice[];
  totalEstimate:      string;
  warnings:           string[];
}

// ─── Static reasons (fallback when LLM unavailable) ──────────────────────────

const STATIC_REASONS: Record<string, { reason: string; costNote: string }> = {
  discover: {
    reason:   'Discovery is structured Q&A + lightweight acknowledgement. Haiku is fast and cheap — no complex reasoning needed.',
    costNote: '~100-300 tokens per question. Negligible cost.',
  },
  synthesize: {
    reason:   'Plan synthesis requires understanding the full discovery context and making architectural judgements about which agents, dependencies and gates are needed. Opus handles long-range reasoning best.',
    costNote: '~2000-4000 tokens for full plan JSON. ~$0.01-0.05.',
  },
  decompose: {
    reason:   'Sprint planning backlog generation per agent needs balanced reasoning — Sonnet produces structured output reliably without the cost of Opus.',
    costNote: '~500-1500 tokens per agent. ~$0.01-0.03/agent.',
  },
  wire: {
    reason:   'Conflict arbitration and dependency resolution requires multi-step reasoning about trade-offs and consequences. Opus avoids oversimplifying complex architectural decisions.',
    costNote: '~1000-2000 tokens per decision. ~$0.02-0.08/decision.',
  },
  execute: {
    reason:   'Code generation tasks (DAG execution) use Sonnet — it produces production-quality TypeScript/JavaScript with good error handling at a reasonable cost.',
    costNote: 'Varies by lane complexity. ~$0.02-0.20/lane.',
  },
};

// ─── PlanModelAdvisor ─────────────────────────────────────────────────────────

export class PlanModelAdvisor {
  constructor(
    private readonly renderer: ChatRenderer,
    private readonly modelRouter?: ModelRouter,
  ) {}

  /**
   * Build and display the full recommendation.
   * Uses LLM (haiku) to generate phase reasons when available,
   * falls back to static text otherwise.
   */
  async display(grade: QualityGrade = 'enterprise'): Promise<ModelAdvisorReport> {
    const r = this.renderer;
    const router = this.modelRouter;

    const available  = router?.registeredProviders ?? [];
    const active     = router?.defaultProvider ?? 'none';
    const warnings: string[] = [];

    if (available.length === 0) {
      warnings.push('No LLM provider available — all AI reasoning will use deterministic fallbacks.');
      warnings.push('Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI-backed planning.');
    }

    // Build phase advice
    const phases: PhaseModelAdvice[] = [];
    for (const [phase, taskType] of Object.entries(PHASE_TASK_MAP)) {
      let family = 'sonnet';
      let modelId = 'unavailable';

      if (router && available.length > 0) {
        try {
          const profile = router.profileFor(taskType);
          family  = profile.family;
          modelId = router.modelIdFor(taskType);
        } catch { /* provider not configured */ }
      } else {
        // Derive family from task type without a router
        const familyMap: Record<TaskType, string> = {
          'file-analysis':          'haiku',
          'contract-extraction':    'haiku',
          'validation':             'haiku',
          'prompt-synthesis':       'sonnet',
          'code-generation':        'sonnet',
          'refactoring':            'sonnet',
          'api-design':             'sonnet',
          'architecture-decision':  'opus',
          'hard-barrier-resolution':'opus',
          'security-review':        'opus',
        };
        family  = familyMap[taskType] ?? 'sonnet';
        modelId = `[${family}]`;
      }

      const staticReason = STATIC_REASONS[phase]!;

      // Optionally use LLM to generate a richer reason
      let reason   = staticReason.reason;
      let costNote = staticReason.costNote;

      if (router && available.length > 0) {
        try {
          const resp = await router.route('file-analysis', {
            messages: [
              {
                role: 'system',
                content:
                  'You are an AI architecture advisor. In 1-2 sentences, explain why '
                  + `using the ${family} model family is optimal for the "${phase}" phase `
                  + 'of an AI-driven project planning system. Be specific about the '
                  + 'capability vs cost trade-off. No markdown.',
              },
              { role: 'user', content: `Phase: ${phase}, task type: ${taskType}, grade: ${grade}` },
            ],
            maxTokens: 120,
          });
          if (resp.content.trim().length > 10) {
            reason = resp.content.trim();
          }
        } catch { /* use static reason */ }
      }

      phases.push({ phase, taskType, family, modelId, reason, costNote });
    }

    // Estimate total cost
    const totalEstimate = this._estimateTotal(grade, available.length > 0);

    const report: ModelAdvisorReport = {
      availableProviders: available,
      activeProvider:     active,
      phases,
      totalEstimate,
      warnings,
    };

    // Render the report
    this._render(report);
    return report;
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  private _render(report: ModelAdvisorReport): void {
    const r = this.renderer;

    r.separator('═');
    r.say('system', '🧠 MODEL ADVISOR — Phase-by-Phase Recommendation');
    r.separator('─');

    // Provider status
    if (report.availableProviders.length > 0) {
      r.say('system', `Active provider : ${report.activeProvider}`);
      r.say('system', `Available       : ${report.availableProviders.join(', ')}`);
    } else {
      r.warn('No providers registered — running in heuristic (no-LLM) mode');
      r.say('system', 'To enable AI: set ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }

    r.newline();
    r.say('system', 'Recommended model per phase:');
    r.newline();

    for (const p of report.phases) {
      const familyIcon = p.family === 'opus' ? '🔵' : p.family === 'sonnet' ? '🟡' : '🟢';
      r.say('system', `  ${familyIcon} ${p.phase.padEnd(12)} ${p.family.padEnd(8)} ${p.modelId}`);
      r.say('system', `     ↳ ${p.reason}`);
      r.say('system', `     💰 ${p.costNote}`);
      r.newline();
    }

    r.separator('─');
    r.say('system', `Total plan estimate: ${report.totalEstimate}`);

    if (report.warnings.length > 0) {
      r.newline();
      for (const w of report.warnings) r.warn(w);
    }

    r.say('system', 'Override provider with: --provider anthropic | openai | vscode');
    r.separator('═');
    r.newline();
  }

  private _estimateTotal(grade: QualityGrade, hasProvider: boolean): string {
    if (!hasProvider) return '$0.00 (no LLM provider — heuristic mode)';
    switch (grade) {
      case 'poc-stub':   return '~$0.01–0.05 (haiku throughout)';
      case 'mvp':        return '~$0.05–0.30 (haiku + sonnet mix)';
      case 'enterprise': return '~$0.30–2.00 (haiku + sonnet + opus)';
    }
  }
}
