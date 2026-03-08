import { ArchResolutionTier } from '../arch-resolution-tier.js'
import { canHandle, resolve } from './methods.js'

Object.assign((ArchResolutionTier as unknown as { prototype: object }).prototype, {
  canHandle,
  resolve,
});
