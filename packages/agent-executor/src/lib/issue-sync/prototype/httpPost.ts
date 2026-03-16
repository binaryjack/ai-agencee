export async function httpPost(
  url:     string,
  headers: Record<string, string>,
  body:    unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
