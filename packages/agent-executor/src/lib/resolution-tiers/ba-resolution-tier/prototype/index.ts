import { BAResolutionTier } from '../ba-resolution-tier.js'
import { canHandle, resolve } from './methods.js'

Object.assign((BAResolutionTier as unknown as { prototype: object }).prototype, {
  canHandle,
  resolve,
});
