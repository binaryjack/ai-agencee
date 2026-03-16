import type { IRateLimiter } from '../rate-limiter.js';

export async function reset(this: IRateLimiter, principal: string): Promise<void> {
  await this._load();
  this._state[principal] = this._empty();
  await this._save();
}
