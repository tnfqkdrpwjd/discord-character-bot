import { requestApi } from './bcDiceClient.js';

import type {
  GameSystem,
  GameSystemDetail,
  GameSystemResponse,
  DiceRollResponse,
} from '../types.js';

// ========================================
// Game System List
// ========================================

let gameSystemCache: GameSystem[] | null = null;

/**
 * BCDice에서 사용할 수 있는 게임 시스템 목록을 가져옵니다.
 *
 * /v2/game_system
 */
export async function getGameSystems(): Promise<GameSystem[]> {
  if (gameSystemCache) {
    return gameSystemCache;
  }

  const result = await requestApi<GameSystemResponse>('/v2/game_system');

  gameSystemCache = result.game_system;

  return gameSystemCache;
}

// ========================================
// Game System Detail
// ========================================

/**
 * 특정 게임 시스템의 상세 정보를 가져옵니다.
 *
 * /v2/game_system/{id}
 */
export async function getGameSystem(id: string): Promise<GameSystemDetail> {
  return requestApi<GameSystemDetail>(`/v2/game_system/${encodeURIComponent(id)}`);
}

// ========================================
// Dice Roll
// ========================================

/**
 * 지정한 게임 시스템으로 주사위를 굴립니다.
 *
 * /v2/game_system/{id}/roll
 */
export async function rollDice(
  systemId: string,
  command: string,
): Promise<DiceRollResponse> {
  return requestApi<DiceRollResponse>(
    `/v2/game_system/${encodeURIComponent(systemId)}/roll`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        command,
      }),
    },
  );
}
