export interface RunCheckpointState {
  messages:   unknown[]
  checks:     unknown[]
  retryCount: number
  verdict:    string | null
  laneInput:  unknown
}

export interface CheckpointWriter {
  save(
    runId:     string,
    laneId:    string,
    seq:       number,
    phase:     'pre-check' | 'llm-call' | 'supervisor' | 'post-check',
    state:     RunCheckpointState,
  ): Promise<void>
}

export const createNoopCheckpointWriter = (): CheckpointWriter => ({
  save: async () => { /* no-op in OSS mode */ },
})

export const createHttpCheckpointWriter = (
  apiBase: string,
  token:   string,
): CheckpointWriter => ({
  save: async (runId, laneId, seq, phase, state) => {
    const res = await fetch(`${apiBase}/runs/${runId}/checkpoints`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ laneId, seq, phase, stateJson: state }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Checkpoint save failed ${res.status}: ${text}`)
    }
  },
})
