export { ChatRenderer, promptChoice, promptUser } from './chat-renderer.js';
export type { IChatRenderer } from './chat-renderer.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
