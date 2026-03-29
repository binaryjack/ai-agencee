/**
 * Tutorial Progress Tracking (Phase 3.2)
 * 
 * Persists tutorial completion state across sessions.
 */

import { AGENCEE_DIR } from '@ai-agencee/engine'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { TutorialProgress } from './tutorials.js'

/**
 * Progress file location: .agencee/tutorial-progress.json
 */
function getProgressFilePath(projectRoot: string): string {
  return path.join(projectRoot, AGENCEE_DIR, 'tutorial-progress.json')
}

/**
 * Load all tutorial progress
 */
export async function loadProgress(projectRoot: string): Promise<TutorialProgress[]> {
  const progressFile = getProgressFilePath(projectRoot)

  try {
    const content = await fs.readFile(progressFile, 'utf-8')
    return JSON.parse(content) as TutorialProgress[]
  } catch {
    // File doesn't exist or is invalid → return empty array
    return []
  }
}

/**
 * Save all tutorial progress
 */
export async function saveProgress(
  projectRoot: string,
  progress: TutorialProgress[]
): Promise<void> {
  const progressFile = getProgressFilePath(projectRoot)

  // Ensure .agencee/ directory exists
  const dir = path.dirname(progressFile)
  await fs.mkdir(dir, { recursive: true })

  await fs.writeFile(progressFile, JSON.stringify(progress, null, 2), 'utf-8')
}

/**
 * Get progress for a specific tutorial
 */
export async function getTutorialProgress(
  projectRoot: string,
  tutorialId: string
): Promise<TutorialProgress | undefined> {
  const allProgress = await loadProgress(projectRoot)
  return allProgress.find((p) => p.tutorialId === tutorialId)
}

/**
 * Update progress for a specific tutorial
 */
export async function updateTutorialProgress(
  projectRoot: string,
  tutorialId: string,
  update: Partial<TutorialProgress>
): Promise<void> {
  const allProgress = await loadProgress(projectRoot)
  
  const existingIndex = allProgress.findIndex((p) => p.tutorialId === tutorialId)

  if (existingIndex >= 0) {
    // Update existing
    allProgress[existingIndex] = { ...allProgress[existingIndex]!, ...update }
  } else {
    // Create new
    allProgress.push({
      tutorialId,
      completedSteps: [],
      lastStepIndex: 0,
      startedAt: new Date().toISOString(),
      ...update,
    })
  }

  await saveProgress(projectRoot, allProgress)
}

/**
 * Mark a tutorial step as complete
 */
export async function markStepComplete(
  projectRoot: string,
  tutorialId: string,
  stepId: string,
  stepIndex: number
): Promise<void> {
  const progress = await getTutorialProgress(projectRoot, tutorialId)

  const completedSteps = progress?.completedSteps ?? []
  if (!completedSteps.includes(stepId)) {
    completedSteps.push(stepId)
  }

  await updateTutorialProgress(projectRoot, tutorialId, {
    completedSteps,
    lastStepIndex: stepIndex,
  })
}

/**
 * Mark a tutorial as fully complete
 */
export async function markTutorialComplete(
  projectRoot: string,
  tutorialId: string
): Promise<void> {
  await updateTutorialProgress(projectRoot, tutorialId, {
    completedAt: new Date().toISOString(),
  })
}

/**
 * Get list of completed tutorial IDs
 */
export async function getCompletedTutorials(projectRoot: string): Promise<string[]> {
  const allProgress = await loadProgress(projectRoot)
  return allProgress
    .filter((p) => p.completedAt !== undefined)
    .map((p) => p.tutorialId)
}

/**
 * Reset all tutorial progress (for testing)
 */
export async function resetProgress(projectRoot: string): Promise<void> {
  await saveProgress(projectRoot, [])
}
