import { config } from '../config.js';

export async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${config.bcDiceApiUrl}${path}`, init);

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}
