import type { TaskType } from '@ai-agencee/engine';

export const BENCHMARK_SUITES: Record<string, Array<{ label: string; prompt: string; taskType: TaskType }>> = {
  'code-review': [
    {
      label: 'simple-fn',
      taskType: 'code-generation' as TaskType,
      prompt: 'Review this TypeScript function for bugs:\nfunction add(a,b){return a+b;}',
    },
    {
      label: 'async-fetch',
      taskType: 'security-review' as TaskType,
      prompt: 'Review this async function for security issues:\nasync function getData(url){const r=await fetch(url);return r.json();}',
    },
  ],
  minimal: [
    {
      label: 'hello',
      taskType: 'file-analysis' as TaskType,
      prompt: 'Reply with exactly the word "pong".',
    },
  ],
};
