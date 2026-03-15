import type { CheckContext } from '../../check-context.js'
import type { RawCheckResult } from '../../check-handler.types.js'

export async function execute(this: unknown, ctx: CheckContext): Promise<RawCheckResult> {
  const { check } = ctx

  const token    = process.env['GITHUB_TOKEN'] ?? ''
  const repo     = check.repo ?? process.env['GITHUB_REPOSITORY'] ?? ''
  const prNumber = check.prNumber ?? Number(process.env['GITHUB_PR_NUMBER'] ?? '0')
  const body     = check.body ?? '_AI Agencee automated review complete._'

  if (!token) {
    return {
      passed:        false,
      extraFindings: ['⚠️  github-comment: GITHUB_TOKEN not set — skipping comment'],
    }
  }
  if (!repo || !prNumber) {
    return {
      passed:        false,
      extraFindings: ['⚠️  github-comment: repo or prNumber not configured — skipping comment'],
    }
  }

  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Accept':        'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ body }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        passed:        false,
        extraFindings: [`⚠️  github-comment: HTTP ${res.status} — ${text.slice(0, 200)}`],
      }
    }

    return { passed: true }
  } catch (err) {
    return {
      passed:        false,
      extraFindings: [`⚠️  github-comment: network error — ${String(err)}`],
    }
  }
}
