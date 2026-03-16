#!/usr/bin/env node
/**
 * run-scenarios.js — Interactive menu runner for all 21 demo scenarios
 *
 * Runs one of the 21 demo scenarios (or all) using the built-in MockProvider
 * so no API keys are required.  Every DAG path is absolute (derived from
 * __dirname) so this script is CWD-independent.
 *
 * Usage:
 *   node scripts/run-scenarios.js           # interactive menu
 *   node scripts/run-scenarios.js 1         # run scenario 01 directly
 *   node scripts/run-scenarios.js 9         # run scenario 09 directly
 *   node scripts/run-scenarios.js all       # run all scenarios in sequence
 *
 * Convenience scripts (after pnpm build):
 *   pnpm demo:01  through  pnpm demo:21
 *   pnpm demo:menu
 *   pnpm demo:all
 */

'use strict';

const { spawnSync }   = require('child_process');
const readline        = require('readline');
const path            = require('path');

const root  = path.resolve(__dirname, '..');
const cliJs = path.join(root, 'packages', 'cli', 'dist', 'bin', 'ai-kit.js');

// ─── Scenario registry ────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: '01',
    label: 'App Boilerplate',
    description: 'RETRY × 2 (scaffold lane)  ·  parallel backend+frontend  ·  hard-barrier before integration',
    dag: path.join(root, 'agents', 'demos', '01-app-boilerplate', 'boilerplate.dag.json'),
    tags: ['retry', 'hard-barrier', 'parallel'],
  },
  {
    id: '02',
    label: 'Enterprise Skeleton',
    description: 'HANDOFF (db-schema → auth-module)  ·  needs-human-review gate  ·  parallel first group',
    dag: path.join(root, 'agents', 'demos', '02-enterprise-skeleton', 'enterprise.dag.json'),
    tags: ['handoff', 'human-review', 'parallel'],
  },
  {
    id: '03',
    label: 'Website Build',
    description: 'ESCALATE terminal 🚨 (SEO lane)  ·  partial DAG continues  ·  publish-readiness still runs',
    dag: path.join(root, 'agents', 'demos', '03-website-build', 'website.dag.json'),
    tags: ['escalate', 'partial-dag'],
  },
  {
    id: '04',
    label: 'Feature in Context',
    description: 'read-contract  ·  soft-align cross-lane sync  ·  timeoutMs + fallback',
    dag: path.join(root, 'agents', 'demos', '04-feature-in-context', 'feature.dag.json'),
    tags: ['read-contract', 'soft-align', 'barrier'],
  },
  {
    id: '05',
    label: 'MVP Sprint',
    description: 'Flaky rapid-frontend (RETRY × 2)  ·  market-scan RETRY × 1  ·  mixed-result sprint',
    dag: path.join(root, 'agents', 'demos', '05-mvp-sprint', 'mvp.dag.json'),
    tags: ['retry', 'flaky', 'mixed-results'],
  },
  {
    id: '06',
    label: 'Resilience Showcase',
    description: 'ALL error types in one run: APPROVE · RETRY · HANDOFF · ESCALATE · hard-barrier · needs-human-review',
    dag: path.join(root, 'agents', 'demos', '06-resilience-showcase', 'resilience.dag.json'),
    tags: ['all-types', 'showcase'],
  },
  {
    id: '07',
    label: 'PR Review',
    description: 'Multi-lane code + security review on a pull request diff',
    dag: path.join(root, 'agents', 'demos', '07-pr-review', 'pr-review.dag.json'),
    tags: ['pr-review', 'parallel'],
  },
  {
    id: '08',
    label: 'Zero-to-Deployed',
    description: 'Full pipeline: scaffold → test → build → deploy in sequence',
    dag: path.join(root, 'agents', 'demos', '08-zero-to-deployed', 'zero-to-deployed.dag.json'),
    tags: ['deploy', 'sequential'],
  },
  {
    id: '09',
    label: 'Security Audit',
    description: 'Parallel CVE · secrets · OWASP scan → risk-report → Slack alert',
    dag: path.join(root, 'agents', 'demos', '09-security-audit', 'security-audit.dag.json'),
    tags: ['security', 'parallel', 'pii-scrubbing'],
  },
  {
    id: '10',
    label: 'Incident Autopilot',
    description: 'On-call triage: root-cause analysis, runbook lookup, auto-remediation',
    dag: path.join(root, 'agents', 'demos', '10-incident-autopilot', 'incident.dag.json'),
    tags: ['incident', 'escalate'],
  },
  {
    id: '11',
    label: 'App Bootstrapper',
    description: 'Interactive project initialiser: picks stack, generates scaffold, writes tests',
    dag: path.join(root, 'agents', 'demos', '11-app-bootstrapper', 'app-bootstrapper.dag.json'),
    tags: ['scaffold', 'interactive'],
  },
  {
    id: '12',
    label: 'Feature in Context',
    description: 'Context-aware feature agent: reads contracts, aligns with existing codebase',
    dag: path.join(root, 'agents', 'demos', '12-feature-in-context', 'feature-in-context.dag.json'),
    tags: ['context', 'contracts'],
  },
  {
    id: '13',
    label: 'Dev Onboarding',
    description: 'Generates onboarding docs, architecture overview, and first-task suggestions',
    dag: path.join(root, 'agents', 'demos', '13-dev-onboarding', 'dev-onboarding.dag.json'),
    tags: ['docs', 'onboarding'],
  },
  {
    id: '14',
    label: 'Tech Migration Advisor',
    description: 'Evaluates migration paths, estimates effort, generates a phased plan',
    dag: path.join(root, 'agents', 'demos', '14-tech-migration-advisor', 'tech-migration-advisor.dag.json'),
    tags: ['migration', 'planning'],
  },
  {
    id: '15',
    label: 'Data Migration Critical',
    description: 'Schema diff, transform scripts, validation gates, and rollback plan',
    dag: path.join(root, 'agents', 'demos', '15-data-migration-critical', 'data-migration-critical.dag.json'),
    tags: ['data', 'migration', 'hard-barrier'],
  },
  {
    id: '16',
    label: 'CI/CD Pipeline Builder',
    description: 'Generates GitHub Actions / GitLab CI config from project conventions',
    dag: path.join(root, 'agents', 'demos', '16-cicd-pipeline-builder', 'cicd-pipeline-builder.dag.json'),
    tags: ['cicd', 'devops'],
  },
  {
    id: '17',
    label: 'Living Documentation',
    description: 'Auto-generates and keeps API docs, ADRs, and README in sync',
    dag: path.join(root, 'agents', 'demos', '17-living-documentation', 'living-documentation.dag.json'),
    tags: ['docs', 'adr'],
  },
  {
    id: '18',
    label: 'Multitenant Hardening',
    description: 'RBAC audit, tenant isolation check, PII scan across all tenants',
    dag: path.join(root, 'agents', 'demos', '18-multitenant-hardening', 'multitenant-hardening.dag.json'),
    tags: ['security', 'multitenant', 'rbac'],
  },
  {
    id: '19',
    label: 'Eval Pipeline',
    description: 'LLM eval harness: golden-set scoring, regression detection, cost report',
    dag: path.join(root, 'agents', 'demos', '19-eval-pipeline', 'eval-pipeline.dag.json'),
    tags: ['eval', 'quality'],
  },
  {
    id: '20',
    label: 'Pause & Resume Workflow',
    description: 'Long-running DAG with mid-run state persistence and graceful resume',
    dag: path.join(root, 'agents', 'demos', '20-pause-resume-workflow', 'pause-resume.dag.json'),
    tags: ['state', 'resume'],
  },
  {
    id: '21',
    label: 'Budget-Controlled Run',
    description: 'Demonstrates hard budget cap: lanes abort once spend limit is hit',
    dag: path.join(root, 'agents', 'demos', '21-budget-controlled-run', 'budget-sprint.dag.json'),
    tags: ['budget', 'cost-control'],
  },
];

// ─── Rendering helpers ────────────────────────────────────────────────────────

function printBanner() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     AI Agencee  ·  Advanced Demo Scenarios (mock)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

function printMenu() {
  SCENARIOS.forEach((s, i) => {
    const num   = String(i + 1).padStart(2);
    const label = s.label.padEnd(28);
    console.log(`  ${num}. ${label}  ${s.description}`);
  });
  const allNum = String(SCENARIOS.length + 1).padStart(2);
  console.log(`\n  ${allNum}. Run ALL scenarios in sequence`);
  console.log('   0. Exit\n');
}

function printScenarioHeader(scenario) {
  const bar = '─'.repeat(62);
  console.log(`\n┌${bar}┐`);
  console.log(`│  Scenario ${scenario.id}: ${scenario.label.padEnd(bar.length - 15)}│`);
  console.log(`│  Tags: ${scenario.tags.join(', ').padEnd(bar.length - 9)}│`);
  console.log(`└${bar}┘\n`);
  console.log(`  DAG : ${scenario.dag}`);
  console.log(`  Mode: mock provider (zero API costs)\n`);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runScenario(scenario, { interactive = false } = {}) {
  printScenarioHeader(scenario);

  const args = [
    cliJs,
    'agent:dag',
    scenario.dag,
    '--provider', 'mock',
    '--verbose',
  ];

  if (interactive) {
    args.push('--interactive');
  }

  const result = spawnSync(process.execPath, args, {
    stdio : 'inherit',
    cwd   : root,
  });

  const ok = result.status === 0;
  if (!ok) {
    // Some scenarios intentionally escalate — non-zero exit is expected
    console.log(`\n  └─ Scenario ${scenario.id} exited with status ${result.status ?? 'null'} (may be intentional for escalation demos)\n`);
  } else {
    console.log(`\n  └─ Scenario ${scenario.id} completed ✓\n`);
  }
  return ok;
}

function runAll() {
  const results = [];
  for (const s of SCENARIOS) {
    const ok = runScenario(s);
    results.push({ id: s.id, label: s.label, ok });
    console.log('  Press Enter to continue to the next scenario...');
    // Brief synchronous pause so output doesn't scroll too fast
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)'], { stdio: 'inherit' });
  }

  // Summary table
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Run-all summary                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  results.forEach(r => {
    const icon  = r.ok ? '✓' : '~';
    const label = `${r.id}: ${r.label}`.padEnd(52);
    console.log(`║  ${icon}  ${label} ║`);
  });
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

// ─── Interactive menu ─────────────────────────────────────────────────────────

function interactiveMenu() {
  printBanner();
  printMenu();

  const rl = readline.createInterface({
    input : process.stdin,
    output: process.stdout,
  });

  rl.question('  Select scenario [0-7]: ', answer => {
    rl.close();
    const choice = answer.trim();

    if (choice === '0' || choice === '') {
      console.log('\n  Bye!\n');
      return;
    }

    const allChoice = String(SCENARIOS.length + 1);
    if (choice === allChoice || choice.toLowerCase() === 'all') {
      runAll();
      return;
    }

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= SCENARIOS.length) {
      console.error(`\n  Unknown choice: "${choice}". Run again and pick 1-${SCENARIOS.length}.\n`);
      process.exit(1);
    }

    const scenario     = SCENARIOS[idx];
    // Scenarios with needs-human-review lanes — offer --interactive
    const hasHumanGate = ['02', '06', '11'].includes(scenario.id);
    if (hasHumanGate) {
      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl2.question('  This scenario has a needs-human-review gate. Run with --interactive? [y/N]: ', ans => {
        rl2.close();
        runScenario(scenario, { interactive: ans.trim().toLowerCase() === 'y' });
      });
    } else {
      runScenario(scenario);
    }
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

printBanner();

const arg = process.argv[2];

if (!arg) {
  interactiveMenu();
} else if (arg === 'all') {
  runAll();
} else {
  const num = parseInt(arg, 10);
  if (isNaN(num) || num < 1 || num > SCENARIOS.length) {
    const ids = SCENARIOS.map((s) => s.id).join(', ');
    console.error(`  Unknown scenario: "${arg}". Use a scenario number (available: ${ids}) or "all".\n`);
    process.exit(1);
  }
  const scenario     = SCENARIOS[num - 1];
  const isInteractive = process.argv.includes('--interactive');
  runScenario(scenario, { interactive: isInteractive });
}
