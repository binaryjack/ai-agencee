export interface ProjectContext {
  projectRoot:   string
  fingerprint:   string
  techStack:     string[]
  agentFiles:    string[]
  rulesPath:     string | null
  cachedAt:      number
}

export interface SecretFinding {
  file:     string
  line:     number
  pattern:  string
  severity: 'high' | 'medium'
  masked:   string
}

export interface ProjectIntelligence {
  version:      '1.0'
  generatedAt:  string
  projectRoot:  string
  techStack:    string[]
  fileCount:    number
  agentFiles:   string[]
  secrets:      SecretFinding[]
}
