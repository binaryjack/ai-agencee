import { PromptInjectionDetector } from '../prompt-injection-detector.js';
import { enforce } from './enforce.js';
import { scan }    from './scan.js';

Object.assign((PromptInjectionDetector as Function).prototype, {
  scan, enforce,
});
