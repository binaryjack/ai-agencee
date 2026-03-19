export const SECRETS_PATTERNS = [
  { name: 'github-pat',     regex: /ghp_[A-Za-z0-9]{36}/,                              severity: 'high'   as const },
  { name: 'openai-key',     regex: /sk-[A-Za-z0-9T_]{48,}/,                            severity: 'high'   as const },
  { name: 'anthropic-key',  regex: /sk-ant-[A-Za-z0-9\-]{80,}/,                        severity: 'high'   as const },
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/,                                 severity: 'high'   as const },
  { name: 'bearer-token',   regex: /Bearer\s+[A-Za-z0-9+/]{40,}/,                      severity: 'high'   as const },
  { name: 'pg-conn-string', regex: /postgresql:\/\/[^@\s]+:[^@\s]+@/,                  severity: 'high'   as const },
  { name: 'mongo-conn',     regex: /mongodb\+srv:\/\/[^@\s]+:[^@\s]+@/,                severity: 'high'   as const },
  { name: 'env-literal',    regex: /(?:API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*["'][^"']{8,}/, severity: 'medium' as const },
]
