/**
 * @file handlers/create-tech-pack/pack-template.ts
 * @description Generate .pack.md file content from wizard input
 */

export interface PackTemplateInput {
  name:         string
  displayName:  string
  category:     string
  description:  string
  version?:     string
  conventions?: string
  patterns?:    string
  antiPatterns?: string
  fileNaming?:  string
  organization?: string
  extensions?:  string[]
  relatedTechs?: string[]
  ecosystem?:   string
  codeExample?: string
  template?:    string
}

/**
 * Generate .pack.md file content
 * @param input - Tech pack configuration from wizard
 * @returns Markdown content with YAML frontmatter
 */
export const generatePackTemplate = (input: PackTemplateInput): string => {
  const lines: string[] = []
  
  // YAML Frontmatter
  lines.push('---')
  lines.push(`name: ${input.name}`)
  lines.push(`displayName: ${input.displayName}`)
  lines.push(`category: ${input.category}`)
  lines.push(`description: ${input.description}`)
  lines.push(`version: ${input.version || '1.0.0'}`)
  
  if (input.extensions && input.extensions.length > 0) {
    lines.push('extensions:')
    input.extensions.forEach(ext => {
      lines.push(`  - ${ext}`)
    })
  }
  
  if (input.relatedTechs && input.relatedTechs.length > 0) {
    lines.push('relatedTechs:')
    input.relatedTechs.forEach(tech => {
      lines.push(`  - ${tech}`)
    })
  }
  
  lines.push('---')
  lines.push('')
  
  // Main Content
  lines.push(`# ${input.displayName}`)
  lines.push('')
  lines.push(input.description)
  lines.push('')
  
  // Coding Conventions
  if (input.conventions) {
    lines.push('## Coding Conventions')
    lines.push('')
    lines.push(input.conventions)
    lines.push('')
  }
  
  // Recommended Patterns
  if (input.patterns) {
    lines.push('## Recommended Patterns')
    lines.push('')
    lines.push(input.patterns)
    lines.push('')
  }
  
  // Anti-patterns
  if (input.antiPatterns) {
    lines.push('## Anti-patterns')
    lines.push('')
    lines.push(input.antiPatterns)
    lines.push('')
  }
  
  // File Structure
  if (input.fileNaming || input.organization) {
    lines.push('## File Structure')
    lines.push('')
    
    if (input.fileNaming) {
      lines.push('### File Naming')
      lines.push('')
      lines.push(input.fileNaming)
      lines.push('')
    }
    
    if (input.organization) {
      lines.push('### Directory Organization')
      lines.push('')
      lines.push(input.organization)
      lines.push('')
    }
  }
  
  // Ecosystem
  if (input.ecosystem) {
    lines.push('## Ecosystem')
    lines.push('')
    lines.push(input.ecosystem)
    lines.push('')
  }
  
  // Code Example
  if (input.codeExample) {
    lines.push('## Example')
    lines.push('')
    lines.push('```')
    lines.push(input.codeExample)
    lines.push('```')
    lines.push('')
  }
  
  // Template
  if (input.template) {
    lines.push('## Template')
    lines.push('')
    lines.push('```')
    lines.push(input.template)
    lines.push('```')
    lines.push('')
  }
  
  return lines.join('\n')
}
