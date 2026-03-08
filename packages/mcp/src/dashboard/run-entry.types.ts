export interface RunEntry {
  runId: string;
  dagName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}
