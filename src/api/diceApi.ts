import { requestApi } from './bcDiceClient.js';
import type { GameSystem } from '../types.js';

type GameSystemResponse = {
  game_system: GameSystem[];
};

let cache: GameSystem[] | null = null;

export async function getGameSystems(): Promise<GameSystem[]> {
  if (cache) return cache;

  const result = await requestApi<GameSystemResponse>('/v2/game_system');

  cache = result.game_system;
  return cache;
}
