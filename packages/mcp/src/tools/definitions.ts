/**
 * @file tools/definitions.ts
 * @description Tool definitions separated from main server logic
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/**
 * Core initialization and validation tools
 */
export const coreTools: Tool[] = [
  {
    name: 'init',
    description: 'Initialize AI session with ULTRA_HIGH standards and project rules',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strict: {
          type: 'boolean',
          description: 'Enable STRICT_MODE',
          default: true,
        },
      },
    },
  },
  {
    name: 'check',
    description: 'Validate current project structure against rules',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'rules',
    description: 'Get project coding rules and standards',
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['markdown', 'text'],
          description: 'Output format',
          default: 'markdown',
        },
      },
    },
  },
  {
    name: 'patterns',
    description: 'Get design patterns and architecture guidelines',
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['markdown', 'text'],
          description: 'Output format',
          default: 'markdown',
        },
      },
    },
  },
  {
    name: 'bootstrap',
    description: 'Initialize project structure and configuration',
    inputSchema: {
      type: 'object' as const,
      properties: {
        force: {
          type: 'boolean',
          description: 'Force overwrite existing files',
          default: false,
        },
      },
    },
  },
]

/**
 * Agent management and workflow tools
 */
export const agentTools: Tool[] = [
  {
    name: 'agent-dag',
    description: 'Execute multi-agent DAG workflow',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dagFile: {
          type: 'string',
          description: 'Path to DAG configuration file',
          default: '.agencee/config/agents/dag.json',
        },
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
        verbose: {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        },
        budgetCapUSD: {
          type: 'number',
          description: 'Budget cap in USD',
        },
      },
    },
  },
  {
    name: 'agent-validate',
    description: 'Validate agent configuration and capabilities',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentName: {
          type: 'string',
          description: 'Name of the agent to validate',
        },
        dagFile: {
          type: 'string',
          description: 'Path to DAG configuration file',
          default: 'agents/dag.json',
        },
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
      },
    },
  },
  {
    name: 'agent-capabilities',
    description: 'Get available agent capabilities and tools',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentName: {
          type: 'string',
          description: 'Optional specific agent name',
        },
      },
    },
  },
]

/**
 * Creation and generation tools
 */
export const creationTools: Tool[] = [
  {
    name: 'create-agent',
    description: 'Create a new agent configuration',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Agent name',
        },
        description: {
          type: 'string',
          description: 'Agent description',
        },
        role: {
          type: 'string',
          description: 'Agent role (e.g., backend, frontend, testing)',
        },
        model: {
          type: 'string',
          description: 'Model configuration',
          default: 'claude-3-5-sonnet-20241022',
        },
      },
      required: ['name', 'description', 'role'],
    },
  },
  {
    name: 'create-dag',
    description: 'Create a new DAG workflow configuration',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'DAG name',
        },
        description: {
          type: 'string',
          description: 'DAG description',
        },
        agents: {
          type: 'array',
          description: 'Array of agent names to include',
          items: { type: 'string' },
        },
      },
      required: ['name', 'description'],
    },
  },
  {
    name: 'create-rule',
    description: 'Create a new coding rule or guideline',
    inputSchema: {
      type: 'object' as const,
      properties: {
        rule: {
          type: 'string',
          description: 'Rule description',
        },
        category: {
          type: 'string',
          description: 'Rule category (e.g., naming, structure, types)',
        },
        severity: {
          type: 'string',
          enum: ['error', 'warning', 'info'],
          description: 'Rule severity level',
          default: 'error',
        },
      },
      required: ['rule', 'category'],
    },
  },
  {
    name: 'create-tech-pack',
    description: 'Create a new technology pack .pack.md file with coding rules and conventions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Tech pack name (kebab-case, e.g., "typescript", "react")',
        },
        displayName: {
          type: 'string',
          description: 'Display name (e.g., "TypeScript", "React")',
        },
        category: {
          type: 'string',
          enum: ['language', 'framework', 'library', 'tool', 'platform', 'testing', 'database'],
          description: 'Technology category',
        },
        description: {
          type: 'string',
          description: 'Brief description of the technology',
        },
        version: {
          type: 'string',
          description: 'Version number',
          default: '1.0.0',
        },
        conventions: {
          type: 'string',
          description: 'Coding conventions and naming rules',
        },
        patterns: {
          type: 'string',
          description: 'Recommended patterns and best practices',
        },
        antiPatterns: {
          type: 'string',
          description: 'Anti-patterns to avoid',
        },
        fileNaming: {
          type: 'string',
          description: 'File naming conventions',
        },
        organization: {
          type: 'string',
          description: 'Directory organization patterns',
        },
        extensions: {
          type: 'array',
          description: 'File extensions (e.g., [".ts", ".tsx"])',
          items: { type: 'string' },
        },
        relatedTechs: {
          type: 'array',
          description: 'Related technology names',
          items: { type: 'string' },
        },
        ecosystem: {
          type: 'string',
          description: 'Ecosystem notes (npm, tooling, community)',
        },
        codeExample: {
          type: 'string',
          description: 'Example code snippet',
        },
        template: {
          type: 'string',
          description: 'Template code',
        },
        destination: {
          type: 'string',
          enum: ['local', 'package'],
          description: 'Destination: "local" (agents/technologies/) or "package" (packages/tech-registry/packs/)',
          default: 'local',
        },
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
      },
      required: ['name', 'displayName', 'category', 'description'],
    },
  },
]

/**
 * Utility and management tools
 */
export const utilityTools: Tool[] = [
  {
    name: 'cli',
    description: 'Execute CLI commands within the project context',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Command to execute',
        },
        args: {
          type: 'array',
          description: 'Command arguments',
          items: { type: 'string' },
          default: [],
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'audit',
    description: 'Perform comprehensive project audit',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['security', 'quality', 'performance', 'full'],
          description: 'Type of audit to perform',
          default: 'full',
        },
        outputFormat: {
          type: 'string',
          enum: ['json', 'markdown', 'text'],
          description: 'Output format',
          default: 'markdown',
        },
      },
    },
  },
  {
    name: 'preview-prompt',
    description: 'Preview agent prompt with current project context',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentName: {
          type: 'string',
          description: 'Agent name to preview',
        },
        modelFamily: {
          type: 'string',
          enum: ['sonnet', 'haiku', 'opus', 'gpt4', 'gpt35'],
          description: 'Model family for prompt optimization',
          default: 'sonnet',
        },
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
      },
      required: ['agentName'],
    },
  },
  {
    name: 'analyze-project',
    description: 'Analyze project structure and provide intelligence',
    inputSchema: {
      type: 'object' as const,
      properties: {
        focus: {
          type: 'string',
          description: 'Focus area for analysis',
        },
        depth: {
          type: 'string',
          enum: ['shallow', 'medium', 'deep'],
          description: 'Analysis depth',
          default: 'medium',
        },
      },
    },
  },
  {
    name: 'pull-rules',
    description: 'Pull and merge coding rules from external source',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          description: 'Source URL or path',
        },
        merge: {
          type: 'boolean',
          description: 'Merge with existing rules',
          default: true,
        },
      },
    },
  },
  {
    name: 'push-rules',
    description: 'Push coding rules to external destination',
    inputSchema: {
      type: 'object' as const,
      properties: {
        destination: {
          type: 'string',
          description: 'Destination URL or path',
        },
        includeCustom: {
          type: 'boolean',
          description: 'Include custom rules',
          default: false,
        },
      },
    },
  },
  {
    name: 'tech-catalog',
    description: 'Get available technology packs from tech-registry (local + package)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
      },
    },
  },
  {
    name: 'dag-dry-run',
    description: 'Validate a DAG file — check agent files, detect cycles, verify capabilities — without executing any LLM calls',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dagFile: {
          type: 'string',
          description: 'Path to DAG JSON file (relative to projectRoot or absolute)',
          default: '.agencee/config/agents/dag.json',
        },
        projectRoot: {
          type: 'string',
          description: 'Project root directory',
        },
      },
    },
  },
]

/**
 * All tool definitions combined
 */
export const allToolDefinitions: Tool[] = [
  ...coreTools,
  ...agentTools,
  ...creationTools,
  ...utilityTools,
]

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): Tool | undefined {
  return allToolDefinitions.find(tool => tool.name === name)
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: 'core' | 'agents' | 'creation' | 'utility'): Tool[] {
  switch (category) {
    case 'core':
      return coreTools
    case 'agents':
      return agentTools
    case 'creation':
      return creationTools
    case 'utility':
      return utilityTools
    default:
      return []
  }
}