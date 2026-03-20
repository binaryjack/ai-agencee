/**
 * @file handlers/create-tech-pack/index.ts
 * @description MCP handler to create new tech pack .pack.md files
 * Supports both local overrides (.agencee/config/technologies/) and package registry (packages/tech-registry/packs/)
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { TECHNOLOGIES_DIR } from '@ai-agencee/engine'
import { findProjectRoot } from '../../find-project-root.js'
import type { PackTemplateInput } from './pack-template.js'
import { generatePackTemplate } from './pack-template.js'

export interface CreateTechPackInput extends PackTemplateInput {
  destination?: 'local' | 'package'  // default: 'local'
  projectRoot?: string
}

export interface CreateTechPackResult {
  success: boolean
  filePath: string
  message: string
  error?: string
}

/**
 * Validate tech pack name (must be kebab-case)
 */
const validatePackName = (name: string): boolean => {
  return /^[a-z0-9-]+$/.test(name)
}

/**
 * Create a new tech pack .pack.md file
 * @param input - Tech pack configuration
 * @returns Result with file path and status
 */
export const runCreateTechPack = async (
  input: CreateTechPackInput
): Promise<CreateTechPackResult> => {
  try {
    // Validation
    if (!input.name) {
      return {
        success: false,
        filePath: '',
        message: 'Tech pack name is required',
        error: 'MISSING_NAME',
      }
    }

    if (!validatePackName(input.name)) {
      return {
        success: false,
        filePath: '',
        message: 'Tech pack name must be kebab-case (lowercase letters, numbers, and hyphens only)',
        error: 'INVALID_NAME',
      }
    }

    if (!input.displayName) {
      return {
        success: false,
        filePath: '',
        message: 'Display name is required',
        error: 'MISSING_DISPLAY_NAME',
      }
    }

    if (!input.description) {
      return {
        success: false,
        filePath: '',
        message: 'Description is required',
        error: 'MISSING_DESCRIPTION',
      }
    }

    if (!input.category) {
      return {
        success: false,
        filePath: '',
        message: 'Category is required',
        error: 'MISSING_CATEGORY',
      }
    }

    // Determine destination directory
    const pr = input.projectRoot ? path.resolve(input.projectRoot) : findProjectRoot()
    const destination = input.destination || 'local'
    
    const baseDir = destination === 'local'
      ? path.join(pr, TECHNOLOGIES_DIR)
      : path.join(pr, 'packages', 'tech-registry', 'packs')
    
    const fileName = `${input.name}.pack.md`
    const filePath = path.join(baseDir, fileName)

    // Check if file already exists
    try {
      await fs.access(filePath)
      return {
        success: false,
        filePath,
        message: `Tech pack "${input.name}" already exists at ${filePath}`,
        error: 'FILE_EXISTS',
      }
    } catch {
      // File doesn't exist - this is what we want
    }

    // Ensure directory exists
    await fs.mkdir(baseDir, { recursive: true })

    // Generate content
    const content = generatePackTemplate(input)

    // Write file
    await fs.writeFile(filePath, content, 'utf-8')

    // Update catalog index if writing to package
    if (destination === 'package') {
      await updatePackageIndex(pr, input.name, input.displayName, input.category, input.description, input.version || '1.0.0')
    }

    return {
      success: true,
      filePath,
      message: `Tech pack "${input.displayName}" created successfully at ${filePath}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      filePath: '',
      message: `Failed to create tech pack: ${errorMessage}`,
      error: 'WRITE_ERROR',
    }
  }
}

/**
 * Update packages/tech-registry/catalog.json when adding to package
 */
const updatePackageIndex = async (
  projectRoot: string,
  name: string,
  displayName: string,
  category: string,
  description: string,
  version: string
): Promise<void> => {
  const catalogPath = path.join(projectRoot, 'packages', 'tech-registry', 'catalog.json')
  
  let catalog: {
    packs: Array<{
      name: string
      displayName: string
      category: string
      description: string
      version: string
      file: string
    }>
  }
  
  try {
    const content = await fs.readFile(catalogPath, 'utf-8')
    catalog = JSON.parse(content)
  } catch {
    // Catalog doesn't exist, create new one
    catalog = { packs: [] }
  }
  
  // Add new pack to catalog (avoid duplicates)
  const existingIndex = catalog.packs.findIndex(p => p.name === name)
  const newEntry = {
    name,
    displayName,
    category,
    description,
    version,
    file: `packs/${name}.pack.md`,
  }
  
  if (existingIndex >= 0) {
    catalog.packs[existingIndex] = newEntry
  } else {
    catalog.packs.push(newEntry)
  }
  
  // Sort by name
  catalog.packs.sort((a, b) => a.name.localeCompare(b.name))
  
  // Write back
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8')
}
