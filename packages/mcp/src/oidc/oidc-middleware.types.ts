import type { MinimalRequest } from './minimal-request.types.js'
import type { MinimalResponse } from './minimal-response.types.js'

export type NextFn = (err?: unknown) => void;
export type OidcMiddleware = (req: MinimalRequest, res: MinimalResponse, next: NextFn) => Promise<void>;
