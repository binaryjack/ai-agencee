import * as http from 'http'

export type SseClient = {
  res: http.ServerResponse;
  runId?: string;
};
