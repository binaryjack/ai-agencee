export interface MinimalResponse {
  status(code: number): MinimalResponse;
  json(body: unknown): void;
}
