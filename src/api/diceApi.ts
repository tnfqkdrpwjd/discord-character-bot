import { requestApi } from "./bcDiceClient.js";

import type {
  GameSystem,
  GameSystemDetail,
  DiceRollResponse,
} from "../types.js";

type GameSystemResponse = {
  game_system: GameSystem[];
};

let gameSystemCache: GameSystem[] | null = null;

/**
 * BCDice에서 사용할 수 있는 게임 시스템 목록을 가져옵니다.
 */
export async function getGameSystems(): Promise<GameSystem[]> {
  if (gameSystemCache) {
    return gameSystemCache;
  }

  const result = await requestApi<GameSystemResponse>("/v2/game_system");

  gameSystemCache = result.game_system;

  return gameSystemCache;
}

/**
 * 특정 게임 시스템의 상세 정보를 가져옵니다.
 */
export async function getGameSystem(id: string): Promise<GameSystemDetail> {
  return requestApi<GameSystemDetail>(
    `/v2/game_system/${encodeURIComponent(id)}`,
  );
}

/**
 * 지정한 게임 시스템으로 주사위를 굴립니다.
 */
export async function rollDice(
  gameSystemId: string,
  command: string,
): Promise<DiceRollResponse> {
  return requestApi<DiceRollResponse>(
    `/v2/game_system/${encodeURIComponent(gameSystemId)}/roll`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
      }),
    },
  );
}
