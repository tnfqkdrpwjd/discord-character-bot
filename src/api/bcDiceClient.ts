import { config } from '../config.js';

export async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${config.bcDiceApiUrl}${path}`;

  console.log(
    `[bcdice] 요청 → ${init?.method ?? 'GET'} ${url}` +
      (init?.body ? `\n  body: ${init.body}` : ''),
  );

  const res = await fetch(url, init);

  const rawBody = await res.text();
  console.log(`[bcdice] 응답 ← ${res.status}\n  body: ${rawBody}`);

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${rawBody}`);
  }

  return JSON.parse(rawBody) as T;
}
