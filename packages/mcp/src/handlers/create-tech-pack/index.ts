/**
 * @file handlers/create-tech-pack/index.ts
 * @description MCP handler to create new technology packs with XML structure (PLAN-24)
 * Generates per-technology directories with XML-based rules
 */

import { TECHNOLOGIES_DIR } from '@ai-agencee/engine'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { findProjectRoot } from '../../find-project-root.js'
import { escapeXml } from '../../lib/xml-utils.js'

export interface RuleTopic {
  name: string
  displayName?: string
  doRules: Array<{
    text: string
    priority?: 'high' | 'medium' | 'low'
    enforcement?: 'error' | 'warning' | 'info'
    examples?: string[]
  }>
  doNotRules: Array<{
    text: string
    priority?: 'high' | 'medium' | 'low'
    enforcement?: 'error' | 'warning' | 'info'
    examples?: string[]
  }>
  rationale: string
  sources?: string[]
}

export interface CreateTechPackInput {
  // Basic metadata
  name: string // kebab-case, e.g. 'c-sharp'
  displayName: string // e.g. 'C#'
  version?: string // default: '1.0.0'
  releaseDate?: string
  category: 'language' | 'framework' | 'library' | 'tool' | 'platform' | 'database'
  description: string

  // Documentation
  officialDocs?: string
  styleGuide?: string

  // Frameworks & ecosystem
  frameworks?: string[]

  // Rules (per topic)
  ruleTopics?: RuleTopic[]

  // Destination
  destination?: 'workspace' | 'package' // default: 'workspace'
  projectRoot?: string
}

export interface CreateTechPackResult {
  success: boolean
  path: string // Directory path
  files: string[] // All created files
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
 * Generate technology description XML
 */
const generateTechnologyXml = (input: CreateTechPackInput): string => {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<technology>',
    `  <name>${escapeXml(input.displayName)}</name>`,
    `  <version>${escapeXml(input.version || '1.0.0')}</version>`,
  ]

  if (input.releaseDate) {
    lines.push(`  <releaseDate>${escapeXml(input.releaseDate)}</releaseDate>`)
  }

  lines.push(
    `  <category>${input.category}</category>`,
    `  <description>${escapeXml(input.description)}</description>`,
  )

  if (input.frameworks && input.frameworks.length > 0) {
    lines.push('  <frameworks>')
    for (const framework of input.frameworks) {
      lines.push(`    <framework>${escapeXml(framework)}</framework>`)
    }
    lines.push('  </frameworks>')
  }

  if (input.officialDocs) {
    lines.push(`  <officialDocs>${escapeXml(input.officialDocs)}</officialDocs>`)
  }

  if (input.styleGuide) {
    lines.push(`  <styleGuide>${escapeXml(input.styleGuide)}</styleGuide>`)
  }

  lines.push('</technology>', '')

  return lines.join('\n')
}

/**
 * Generate do.xml
 */
const generateDoRulesXml = (topicName: string, rules: RuleTopic['doRules']): string => {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rules category="do" topic="${escapeXml(topicName)}">`,
  ]

  for (const rule of rules) {
    const attrs: string[] = []
    if (rule.priority) attrs.push(`priority="${rule.priority}"`)
    if (rule.enforcement) attrs.push(`enforcement="${rule.enforcement}"`)

    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
    lines.push(`  <rule${attrString}>${escapeXml(rule.text)}</rule>`)
  }

  lines.push('</rules>', '')

  return lines.join('\n')
}

/**
 * Generate doNot.xml
 */
const generateDoNotRulesXml = (topicName: string, rules: RuleTopic['doNotRules']): string => {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rules category="doNot" topic="${escapeXml(topicName)}">`,
  ]

  for (const rule of rules) {
    const attrs: string[] = []
    if (rule.priority) attrs.push(`priority="${rule.priority}"`)
    if (rule.enforcement) attrs.push(`enforcement="${rule.enforcement}"`)

    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
    lines.push(`  <rule${attrString}>${escapeXml(rule.text)}</rule>`)
  }

  lines.push('</rules>', '')

  return lines.join('\n')
}

/**
 * Generate rationale.xml
 */
const generateRationaleXml = (topicName: string, rationale: string, sources?: string[]): string => {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rationale topic="${escapeXml(topicName)}">`,
    '  <explanation>',
    `    ${escapeXml(rationale)}`,
    '  </explanation>',
  ]

  if (sources && sources.length > 0) {
    lines.push('  <sources>')
    for (const source of sources) {
      lines.push(`    <source>${escapeXml(source)}</source>`)
    }
    lines.push('  </sources>')
  }

  lines.push('</rationale>', '')

  return lines.join('\n')
}

/**
 * Create a new technology pack with XML structure
 * @param input - Technology configuration
 * @returns Result with directory path and created files
 */
export const runCreateTechPack = async (
  input: CreateTechPackInput
): Promise<CreateTechPackResult> => {
  try {
    // Validation
    if (!input.name) {
      return {
        success: false,
        path: '',
        files: [],
        message: 'Technology name is required',
        error: 'MISSING_NAME',
      }
    }

    if (!validatePackName(input.name)) {
      return {
        success: false,
        path: '',
        files: [],
        message: 'Technology name must be kebab-case (lowercase letters, numbers, and hyphens only)',
        error: 'INVALID_NAME',
      }
    }

    if (!input.displayName) {
      return {
        success: false,
        path: '',
        files: [],
        message: 'Display name is required',
        error: 'MISSING_DISPLAY_NAME',
      }
    }

    if (!input.description) {
      return {
        success: false,
        path: '',
        files: [],
        message: 'Description is required',
        error: 'MISSING_DESCRIPTION',
      }
    }

    if (!input.category) {
      return {
        success: false,
        path: '',
        files: [],
        message: 'Category is required',
        error: 'MISSING_CATEGORY',
      }
    }

    // Determine destination directory
    const pr = input.projectRoot ? path.resolve(input.projectRoot) : findProjectRoot()
    const destination = input.destination || 'workspace'
    
    const baseDir = destination === 'workspace'
      ? path.join(pr, TECHNOLOGIES_DIR)
      : path.join(pr, 'packages', 'tech-registry', 'technologies')
    
    const techDir = path.join(baseDir, input.name)
    const rulesDir = path.join(techDir, 'rules')

    // Check if technology already exists
    try {
      await fs.access(techDir)
      return {
        success: false,
        path: techDir,
        files: [],
        message: `Technology "${input.name}" already exists at ${techDir}`,
        error: 'DIR_EXISTS',
      }
    } catch {
      // Directory doesn't exist - this is what we want
    }

    // Ensure directories exist
    await fs.mkdir(rulesDir, { recursive: true })

    const createdFiles: string[] = []

    // Generate and write technology description XML
    const techXml = generateTechnologyXml(input)
    const techXmlPath = path.join(techDir, `${input.name}.xml`)
    await fs.writeFile(techXmlPath, techXml, 'utf-8')
    createdFiles.push(techXmlPath)

    // Generate and write rule files for each topic
    if (input.ruleTopics && input.ruleTopics.length > 0) {
      for (const topic of input.ruleTopics) {
        const topicDir = path.join(rulesDir, topic.name)
        await fs.mkdir(topicDir, { recursive: true })

        // do.xml
        const doXml = generateDoRulesXml(topic.name, topic.doRules)
        const doPath = path.join(topicDir, 'do.xml')
        await fs.writeFile(doPath, doXml, 'utf-8')
        createdFiles.push(doPath)

        // doNot.xml
        const doNotXml = generateDoNotRulesXml(topic.name, topic.doNotRules)
        const doNotPath = path.join(topicDir, 'doNot.xml')
        await fs.writeFile(doNotPath, doNotXml, 'utf-8')
        createdFiles.push(doNotPath)

        // rationale.xml
        const rationaleXml = generateRationaleXml(topic.name, topic.rationale, topic.sources)
        const rationalePath = path.join(topicDir, 'rationale.xml')
        await fs.writeFile(rationalePath, rationaleXml, 'utf-8')
        createdFiles.push(rationalePath)
      }
    }

    // Update catalog if writing to package
    if (destination === 'package') {
      await updateTechnologyCatalog(
        pr,
        input.name,
        input.displayName,
        input.category,
        input.description,
        input.version || '1.0.0'
      )
    }

    const fileCount = createdFiles.length
    const topicCount = input.ruleTopics?.length || 0

    return {
      success: true,
      path: techDir,
      files: createdFiles,
      message: `Technology "${input.displayName}" created successfully with ${topicCount} rule topics (${fileCount} files)`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      path: '',
      files: [],
      message: `Failed to create technology: ${errorMessage}`,
      error: 'WRITE_ERROR',
    }
  }
}

/**
 * Update packages/tech-registry/catalog.json when adding to package
 */
const updateTechnologyCatalog = async (
  projectRoot: string,
  name: string,
  displayName: string,
  category: string,
  description: string,
  version: string
): Promise<void> => {
  const catalogPath = path.join(projectRoot, 'packages', 'tech-registry', 'catalog.json')
  
  let catalog: {
    technologies: Array<{
      name: string
      displayName: string
      category: string
      description: string
      version: string
      path: string
    }>
  }
  
  try {
    const content = await fs.readFile(catalogPath, 'utf-8')
    catalog = JSON.parse(content)
  } catch {
    // Catalog doesn't exist, create new one
    catalog = { technologies: [] }
  }
  
  // Add new technology to catalog (avoid duplicates)
  const existingIndex = catalog.technologies.findIndex(t => t.name === name)
  const newEntry = {
    name,
    displayName,
    category,
    description,
    version,
    path: `technologies/${name}`,
  }
  
  if (existingIndex >= 0) {
    catalog.technologies[existingIndex] = newEntry
  } else {
    catalog.technologies.push(newEntry)
  }
  
  // Sort by name
  catalog.technologies.sort((a, b) => a.name.localeCompare(b.name))
  
  // Write back
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8')
}
