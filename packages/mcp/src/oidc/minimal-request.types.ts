export interface MinimalRequest {
  headers: Record<string, string | string[] | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
