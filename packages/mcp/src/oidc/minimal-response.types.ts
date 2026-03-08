export interface MinimalResponse {
  status(code: number): MinimalResponse;
  json(body: unknown): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
