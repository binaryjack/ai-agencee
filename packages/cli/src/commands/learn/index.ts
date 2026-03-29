/**
 * Learn Command — Interactive Tutorials (Phase 3.2)
 * 
 * Guided walkthroughs for mastering ai-starter-kit.
 */

import prompts from 'prompts'
import { findProjectRoot } from '../dag/find-project-root.js'
import { TUTORIALS, getTutorial, checkPrerequisites, type Tutorial, type TutorialStep } from './tutorials.js'
import {
  getTutorialProgress,
  markStepComplete,
  markTutorialComplete,
  getCompletedTutorials,
} from './progress.js'

interface LearnOptions {
  tutorial?: string
  reset?: boolean
  project?: string
}

/**
 * Main learn command entry point
 */
export async function runLearn(options: LearnOptions = {}): Promise<void> {
  const projectRoot = options.project ?? findProjectRoot()

  // Handle reset flag
  if (options.reset) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Reset all tutorial progress? This cannot be undone.',
      initial: false,
    })

    if (confirm) {
      const { resetProgress } = await import('./progress.js')
      await resetProgress(projectRoot)
      console.log('\n✅ Tutorial progress reset.\n')
    }
    return
  }

  // Get completed tutorials for prerequisite checks
  const completedTutorials = await getCompletedTutorials(projectRoot)

  // If no tutorial specified, show menu
  if (!options.tutorial) {
    await showTutorialMenu(projectRoot, completedTutorials)
    return
  }

  // Run specific tutorial
  const tutorial = getTutorial(options.tutorial)
  if (!tutorial) {
    console.error(`\n❌ Unknown tutorial: ${options.tutorial}\n`)
    console.log('Available tutorials:')
    TUTORIALS.forEach((t) => {
      console.log(`  • ${t.id} — ${t.name}`)
    })
    process.exit(1)
  }

  await runTutorial(projectRoot, tutorial, completedTutorials)
}

/**
 * Show interactive tutorial menu
 */
async function showTutorialMenu(
  projectRoot: string,
  completedTutorials: string[]
): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║        ai-agencee Interactive Tutorials 🎓               ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('Master ai-starter-kit with guided walkthroughs.\n')

  // Build choices with completion status
  const choices = TUTORIALS.map((t) => {
    const isComplete = completedTutorials.includes(t.id)
    const prereqCheck = checkPrerequisites(t.id, completedTutorials)
    const isLocked = !prereqCheck.met

    let statusEmoji = '  '
    let title = `${t.emoji}  ${t.name}`

    if (isComplete) {
      statusEmoji = '✅'
      title = `${title} (completed)`
    } else if (isLocked) {
      statusEmoji = '🔒'
      title = `${title} (locked)`
    } else {
      statusEmoji = '→'
    }

    return {
      title: `${statusEmoji} ${title}`,
      description: `${t.description} • ${t.durationMin} min`,
      value: t.id,
      disabled: isLocked,
    }
  })

  const { tutorialId } = await prompts({
    type: 'select',
    name: 'tutorialId',
    message: 'Choose a tutorial:',
    choices,
    initial: 0,
  })

  if (!tutorialId) {
    console.log('\n✋ Cancelled.\n')
    return
  }

  const tutorial = getTutorial(tutorialId)!
  await runTutorial(projectRoot, tutorial, completedTutorials)
}

/**
 * Run a specific tutorial
 */
async function runTutorial(
  projectRoot: string,
  tutorial: Tutorial,
  completedTutorials: string[]
): Promise<void> {
  // Check prerequisites
  const prereqCheck = checkPrerequisites(tutorial.id, completedTutorials)
  if (!prereqCheck.met) {
    console.error(`\n❌ Prerequisites not met for "${tutorial.name}".\n`)
    console.log('Complete these tutorials first:')
    for (const missing of prereqCheck.missing) {
      const prereqTutorial = getTutorial(missing)
      console.log(`  • ${prereqTutorial?.name ?? missing}`)
    }
    console.log()
    return
  }

  // Load progress
  const progress = await getTutorialProgress(projectRoot, tutorial.id)
  const startStepIndex = progress?.lastStepIndex ?? 0

  // Show tutorial header
  console.log('\n' + '━'.repeat(60))
  console.log(`${tutorial.emoji}  ${tutorial.name}`)
  console.log('━'.repeat(60))
  console.log(`${tutorial.description} • ${tutorial.durationMin} minutes\n`)

  // Execute steps
  for (let i = startStepIndex; i < tutorial.steps.length; i++) {
    const step = tutorial.steps[i]!
    const stepNumber = i + 1

    const shouldContinue = await executeStep(projectRoot, tutorial, step, stepNumber, i)

    if (!shouldContinue) {
      console.log('\n✋ Tutorial paused. Run "ai-kit learn" to resume.\n')
      return
    }
  }

  // Mark tutorial as complete
  await markTutorialComplete(projectRoot, tutorial.id)

  // Show completion message
  console.log('\n' + '━'.repeat(60))
  console.log('\x1b[32m\x1b[1m✅ Tutorial Complete!\x1b[0m')
  console.log('━'.repeat(60))
  if (tutorial.completionMessage) {
    console.log(`\n${tutorial.completionMessage}\n`)
  }

  // Suggest next tutorial
  const nextTutorial = TUTORIALS.find(
    (t) =>
      !completedTutorials.includes(t.id) &&
      t.id !== tutorial.id &&
      checkPrerequisites(t.id, [...completedTutorials, tutorial.id]).met
  )

  if (nextTutorial) {
    const { startNext } = await prompts({
      type: 'confirm',
      name: 'startNext',
      message: `Start next tutorial: "${nextTutorial.name}"?`,
      initial: true,
    })

    if (startNext) {
      await runTutorial(projectRoot, nextTutorial, [...completedTutorials, tutorial.id])
    }
  } else {
    console.log('🎉 You\'ve completed all available tutorials!\n')
    console.log('You\'re now ready to:')
    console.log('  • Create custom DAGs')
    console.log('  • Optimize workflows')
    console.log('  • Share templates with your team\n')
  }
}

/**
 * Execute a single tutorial step
 */
async function executeStep(
  projectRoot: string,
  tutorial: Tutorial,
  step: TutorialStep,
  stepNumber: number,
  stepIndex: number
): Promise<boolean> {
  console.log(`\n\x1b[1m[Step ${stepNumber}/${tutorial.steps.length}] ${step.title}\x1b[0m`)
  console.log('─'.repeat(60))
  console.log(step.explanation)

  if (step.command) {
    console.log(`\n\x1b[36m  $ ${step.command}\x1b[0m\n`)
  }

  // Auto-advance or wait for user
  if (step.nextAction === 'auto') {
    // Auto-advance (no user input needed)
    await markStepComplete(projectRoot, tutorial.id, step.id, stepIndex)
    return true
  }

  // Wait for user to type 'next' or 'quit'
  const { action } = await prompts({
    type: 'text',
    name: 'action',
    message: 'Type "next" to continue, "quit" to exit:',
    validate: (value) => {
      const v = value.toLowerCase().trim()
      return v === 'next' || v === 'quit' || v === 'q' || v === 'n'
        ? true
        : 'Type "next" or "quit"'
    },
  })

  const normalizedAction = action?.toLowerCase().trim()

  if (normalizedAction === 'quit' || normalizedAction === 'q') {
    // Save progress before quitting
    await markStepComplete(projectRoot, tutorial.id, step.id, stepIndex)
    return false
  }

  // Mark step as complete
  await markStepComplete(projectRoot, tutorial.id, step.id, stepIndex)
  return true
}

/**
 * Export for CLI
 */
export default runLearn
