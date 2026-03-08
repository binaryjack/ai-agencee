import * as https from 'https';

export function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 404) {
          reject(new Error(`Agent not found in registry (HTTP 404): ${url}`));
          return;
        }
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`Registry request failed with HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      })
      .on('error', reject);
  });
}
