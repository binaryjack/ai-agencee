import * as http from 'http'

export function sendSseEvent(res: http.ServerResponse, event: string, data: string): void {
  try {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  } catch {
    // Client disconnected before we could write
  }
}
