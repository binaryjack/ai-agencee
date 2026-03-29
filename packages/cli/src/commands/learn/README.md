# Interactive Tutorials (Phase 3.2)

## Overview

The `ai-kit learn` command provides guided walkthroughs for mastering ai-starter-kit modes and features. Each tutorial is interactive, tracks progress across sessions, and validates understanding before proceeding.

## Usage

```bash
# Show tutorial menu
ai-kit learn

# Run specific tutorial
ai-kit learn three-modes

# Reset all progress (for testing)
ai-kit learn --reset
```

## Available Tutorials

### 1. 🚀 Quick Start (3 min)

Get started with ai-starter-kit basics.

**Steps:**
- Initialize project (`ai-kit init`)
- Run zero-config demo
- Understand next steps

**Prerequisites:** None

---

### 2. 🎯 Three Modes (5 min)

Master ASK, PLAN, and RUN modes.

**Steps:**
- ASK mode (zero-cost FTS5 search)
- PLAN mode (workflow generation)  
- RUN mode (DAG execution with preview)

**Prerequisites:** Quick Start

---

### 3. 🎭 Parallel Agents (10 min)

Understand multi-agent orchestration and DAG topology.

**Steps:**
- DAG structure (lanes, dependencies, phases)
- Execution phase preview
- Understanding dependencies
- Quality gates with supervisors

**Prerequisites:** Three Modes

---

### 4. ✅ Quality Gates (8 min)

Configure test-before-commit workflows.

**Steps:**
- Checkpoint types (syntax, compile, test, lint, human-review)
- Supervisor configuration
- Interactive approval mode
- Rollback on failure

**Prerequisites:** Parallel Agents

---

### 5. 💰 Cost Optimization (7 min)

Control LLM costs with estimates and caps.

**Steps:**
- Pre-flight cost estimates
- Budget caps (--budget flag)
- Model tier selection (haiku/sonnet/opus)
- Mock provider for testing

**Prerequisites:** Quality Gates

---

### 6. ♻️ Sustainability (5 min)

Track energy consumption and carbon footprint.

**Steps:**
- Energy consumption tracking (Wh)
- Carbon footprint calculation
- Eco mode (--mode=eco)
- Transparent environmental impact

**Prerequisites:** Cost Optimization

---

## Features

### Progress Tracking

Tutorial progress is saved to `.agencee/tutorial-progress.json`.

**Resume anytime:**
```bash
# Start tutorial
ai-kit learn three-modes

# Quit mid-way (type "quit")
# Resume later (continues from last step)
ai-kit learn three-modes
```

**Progress persists across:**
- Sessions
- Terminal restarts
- Project switches (per-project tracking)

---

### Prerequisite Checking

Tutorials unlock as you complete prerequisites:

```
🎓 Interactive Tutorials

  ✅ 🚀 Quick Start (completed)
  → 🎯 Three Modes (ASK/PLAN/RUN) • 5 min
  🔒 🎭 Parallel Agents (locked)
  🔒 ✅ Quality Gates (locked)
  🔒 💰 Cost Optimization (locked)
  🔒 ♻️ Sustainability (locked)
```

Locked tutorials require prerequisites to be completed first.

---

### Interactive Steps

Each tutorial step:

1. **Shows explanation** with context
2. **Suggests command** to run (when applicable)
3. **Waits for user** to type "next" or "quit"
4. **Validates understanding** (manual validation for now)
5. **Tracks completion** automatically

**Example flow:**

```
[Step 2/5] ASK Mode — Zero-Cost Search
──────────────────────────────────────────────────────────────
ASK mode uses FTS5 (SQLite full-text search) for instant results.

✨ Zero cost • Zero hallucinations • Instant results

Let's search for TypeScript interfaces in your codebase.

  $ ai-kit ask "TypeScript interfaces"

Type "next" to continue, "quit" to exit: next
```

---

### Auto-Suggestions

After completing a tutorial, the system suggests the next available tutorial:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tutorial Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Three Modes tutorial complete! You're ready for advanced features.

Start next tutorial: "Parallel Agents & DAG Topology"? (Y/n)
```

---

## Implementation Details

### File Structure

```
packages/cli/src/commands/learn/
├── index.ts          # Main command orchestration
├── tutorials.ts      # Tutorial definitions
├── progress.ts       # Progress tracking (read/write)
└── README.md         # This file
```

### Tutorial Definition

```typescript
interface Tutorial {
  id: string
  name: string
  description: string
  durationMin: number
  emoji: string
  steps: TutorialStep[]
  prerequisites?: string[]
  completionMessage?: string
}

interface TutorialStep {
  id: string
  title: string
  explanation: string
  command?: string
  expectedOutput?: string
  validation?: (output: string) => boolean
  nextAction: 'auto' | 'manual'  // auto: proceed after validation, manual: wait for 'next'
}
```

### Progress Storage

```json
// .agencee/tutorial-progress.json
[
  {
    "tutorialId": "quick-start",
    "completedSteps": ["init", "demo", "complete"],
    "lastStepIndex": 2,
    "completedAt": "2026-03-29T10:30:00.000Z",
    "startedAt": "2026-03-29T10:27:00.000Z"
  },
  {
    "tutorialId": "three-modes",
    "completedSteps": ["ask-intro", "ask-practice"],
    "lastStepIndex": 1,
    "startedAt": "2026-03-29T10:32:00.000Z"
  }
]
```

---

## Testing

### Manual Testing

```bash
# Run all tutorials in sequence
ai-kit learn quick-start
ai-kit learn three-modes
ai-kit learn parallel-agents
ai-kit learn quality-gates
ai-kit learn cost-optimization
ai-kit learn sustainability

# Reset progress
ai-kit learn --reset

# Try resuming mid-tutorial
ai-kit learn three-modes
# (type "quit" after step 2)
ai-kit learn three-modes
# (should resume at step 3)
```

### Validation

- [ ] Tutorial menu shows correct completion status
- [ ] Locked tutorials cannot be started
- [ ] Progress persists across sessions
- [ ] Resume works from last step
- [ ] Completion messages appear
- [ ] Next tutorial suggestions work
- [ ] --reset flag clears all progress

---

## Future Enhancements

1. **Command Validation** (auto-advance on successful execution)
   - Run suggested command automatically
   - Validate output matches expected
   - Proceed to next step automatically

2. **Interactive Demos** (embedded execution)
   - Run commands within tutorial context
   - Show live output
   - Capture and validate results

3. **Video Walkthroughs** (external links)
   - Link to video tutorials
   - Embed terminal recordings
   - Show real-world examples

4. **Certificates** (completion badges)
   - Generate completion certificates
   - Share on social media
   - Team leaderboards

5. **Custom Tutorials** (user-defined)
   - Create tutorials for internal workflows
   - Share with team
   - Import from marketplace

---

## Related Commands

- `ai-kit demo` — Zero-config demos with MockProvider
- `ai-kit setup` — Interactive setup wizard
- `ai-kit doctor` — Health checks
- `ai-kit ask` — Zero-cost search (ASK mode)
- `ai-kit agent:dag --preview` — DAG preview (RUN mode)

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Tutorial completion rate | 70% | 📊 Pending |
| Time to first custom DAG | < 30 min | 📊 Pending |
| % Users who master all 3 modes | 80% | 📊 Pending |
| Support ticket reduction | 50% | 📊 Pending |

---

## Design Decisions

### Why Manual "next" Instead of Auto-Advance?

- **Pacing:** Users read at different speeds
- **Comprehension:** Prevents rushing through content
- **Control:** Users choose when to proceed
- **Reflection:** Time to absorb concepts

Future: Add `--auto` flag for automated progression.

### Why Per-Project Progress?

- **Isolation:** Different projects may need different tutorials
- **Team Sync:** Progress doesn't carry across repos
- **Clean State:** Fresh start for each project

Future: Add global progress option (`--global` flag).

### Why No Command Execution?

- **Safety:** Prevents accidental destructive commands
- **Transparency:** Users see exactly what's running
- **Learning:** Typing reinforces muscle memory

Future: Add `--interactive-exec` for embedded execution.

---

**Created:** Phase 3.2 (March 2026)  
**Effort:** MEDIUM (3-4 days)  
**Impact:** HIGH (deep adoption and mastery)
