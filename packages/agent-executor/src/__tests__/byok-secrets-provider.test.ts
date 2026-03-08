/**
 * Unit tests for ByokSecretsProvider.
 *
 * Verifies: construction from ByokProviderCredentials, get/has semantics,
 * undefined-value filtering, and integration with CompositeSecretsProvider.
 */

import { ByokSecretsProvider } from '../lib/secrets/byok-secrets-provider/byok-secrets-provider'
import { CompositeSecretsProvider } from '../lib/secrets/composite-secrets-provider/composite-secrets-provider'
import { StaticSecretsProvider } from '../lib/secrets/static-secrets-provider/static-secrets-provider'

// ─── construction ─────────────────────────────────────────────────────────────

describe('ByokSecretsProvider — construction', () => {
  it('stores all provided keys', async () => {
    const p = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'sk-ant-test' })
    expect(await p.has('ANTHROPIC_API_KEY')).toBe(true)
    expect(await p.get('ANTHROPIC_API_KEY')).toBe('sk-ant-test')
  })

  it('stores multiple keys at once', async () => {
    const p = new ByokSecretsProvider({
      ANTHROPIC_API_KEY: 'sk-ant-test',
      OPENAI_API_KEY:    'sk-openai-test',
      GEMINI_API_KEY:    'gemini-test',
    })
    expect(await p.get('ANTHROPIC_API_KEY')).toBe('sk-ant-test')
    expect(await p.get('OPENAI_API_KEY')).toBe('sk-openai-test')
    expect(await p.get('GEMINI_API_KEY')).toBe('gemini-test')
  })

  it('filters out undefined values silently', async () => {
    const p = new ByokSecretsProvider({
      ANTHROPIC_API_KEY: 'sk-ant-test',
      OPENAI_API_KEY:    undefined,
    })
    expect(await p.has('ANTHROPIC_API_KEY')).toBe(true)
    expect(await p.has('OPENAI_API_KEY')).toBe(false)
  })

  it('accepts an empty credentials object without error', () => {
    expect(() => new ByokSecretsProvider({})).not.toThrow()
  })
})

// ─── get() ────────────────────────────────────────────────────────────────────

describe('ByokSecretsProvider.get()', () => {
  it('returns the stored value for a known key', async () => {
    const p = new ByokSecretsProvider({ AWS_ACCESS_KEY_ID: 'AKIATEST' })
    expect(await p.get('AWS_ACCESS_KEY_ID')).toBe('AKIATEST')
  })

  it('returns undefined for an unknown key', async () => {
    const p = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'x' })
    expect(await p.get('NONEXISTENT_KEY')).toBeUndefined()
  })

  it('is case-sensitive — wrong casing returns undefined', async () => {
    const p = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'x' })
    expect(await p.get('anthropic_api_key')).toBeUndefined()
  })

  it('returns arbitrary extra keys stored via index signature', async () => {
    const p = new ByokSecretsProvider({ MY_CUSTOM_PROVIDER_KEY: 'custom-value' })
    expect(await p.get('MY_CUSTOM_PROVIDER_KEY')).toBe('custom-value')
  })
})

// ─── has() ────────────────────────────────────────────────────────────────────

describe('ByokSecretsProvider.has()', () => {
  it('returns true for a key that was provided', async () => {
    const p = new ByokSecretsProvider({ OPENAI_API_KEY: 'sk-test' })
    expect(await p.has('OPENAI_API_KEY')).toBe(true)
  })

  it('returns false for a key not in the credentials', async () => {
    const p = new ByokSecretsProvider({ OPENAI_API_KEY: 'sk-test' })
    expect(await p.has('ANTHROPIC_API_KEY')).toBe(false)
  })

  it('returns false for empty provider', async () => {
    const p = new ByokSecretsProvider({})
    expect(await p.has('ANYTHING')).toBe(false)
  })
})

// ─── CompositeSecretsProvider integration ─────────────────────────────────────

describe('ByokSecretsProvider inside CompositeSecretsProvider', () => {
  it('resolves BYOK key before the fallback provider', async () => {
    const byok     = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'byok-key' })
    const fallback = new StaticSecretsProvider({ ANTHROPIC_API_KEY: 'fallback-key' })
    const composite = new CompositeSecretsProvider([byok, fallback])

    expect(await composite.get('ANTHROPIC_API_KEY')).toBe('byok-key')
  })

  it('falls through to the next provider when BYOK does not have the key', async () => {
    const byok     = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'byok-key' })
    const fallback = new StaticSecretsProvider({ OPENAI_API_KEY: 'fallback-openai' })
    const composite = new CompositeSecretsProvider([byok, fallback])

    expect(await composite.get('OPENAI_API_KEY')).toBe('fallback-openai')
  })

  it('returns undefined when no provider in the chain has the key', async () => {
    const composite = new CompositeSecretsProvider([
      new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'x' }),
    ])
    expect(await composite.get('GEMINI_API_KEY')).toBeUndefined()
  })

  it('has() returns true if any provider in chain has the key', async () => {
    const byok     = new ByokSecretsProvider({})
    const fallback = new StaticSecretsProvider({ GOOGLE_API_KEY: 'gcp' })
    const composite = new CompositeSecretsProvider([byok, fallback])

    expect(await composite.has('GOOGLE_API_KEY')).toBe(true)
  })

  it('has() returns false when no provider in chain has the key', async () => {
    const composite = new CompositeSecretsProvider([
      new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'x' }),
      new StaticSecretsProvider({ OPENAI_API_KEY: 'y' }),
    ])
    expect(await composite.has('AWS_ACCESS_KEY_ID')).toBe(false)
  })
})

// ─── BYOK security contract ───────────────────────────────────────────────────

describe('ByokSecretsProvider — security contract', () => {
  it('isolates keys between separate instances', async () => {
    const p1 = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'key-tenant-1' })
    const p2 = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'key-tenant-2' })

    expect(await p1.get('ANTHROPIC_API_KEY')).toBe('key-tenant-1')
    expect(await p2.get('ANTHROPIC_API_KEY')).toBe('key-tenant-2')
  })

  it('internal _secrets map is not directly shared between instances', () => {
    const p1 = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'key-1' })
    const p2 = new ByokSecretsProvider({ ANTHROPIC_API_KEY: 'key-2' })

    // Mutating p1's internal map must not affect p2
    ;(p1 as unknown as { _secrets: Map<string, string> })._secrets.set('ANTHROPIC_API_KEY', 'mutated')
    expect((p2 as unknown as { _secrets: Map<string, string> })._secrets.get('ANTHROPIC_API_KEY')).toBe('key-2')
  })

  it('stores AWS Bedrock credential keys', async () => {
    const p = new ByokSecretsProvider({
      AWS_ACCESS_KEY_ID:     'AKIATEST123',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG',
      AWS_SESSION_TOKEN:     'session-token-xyz',
      AWS_REGION:            'eu-west-1',
    })
    expect(await p.get('AWS_ACCESS_KEY_ID')).toBe('AKIATEST123')
    expect(await p.get('AWS_SECRET_ACCESS_KEY')).toBe('wJalrXUtnFEMI/K7MDENG')
    expect(await p.get('AWS_SESSION_TOKEN')).toBe('session-token-xyz')
    expect(await p.get('AWS_REGION')).toBe('eu-west-1')
  })
})
