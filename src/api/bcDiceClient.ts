import { config } from "../config.js";

export async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${config.bcDiceApiUrl}${path}`, init);

  if (!res.ok) {
    const body = await res.text();

    throw new Error(`API Error: ${res.status} ${body}`);
  }

  return res.json() as Promise<T>;
}
