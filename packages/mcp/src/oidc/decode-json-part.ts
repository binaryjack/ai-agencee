import { base64urlDecode } from './base64url-decode.js';

export function decodeJsonPart<T>(part: string): T {
  const bytes = base64urlDecode(part);
  return JSON.parse(Buffer.from(bytes).toString('utf-8')) as T;
}
