import { rollDice } from '../api/diceApi.js';
import type { GuildConfig } from '../types.js';

/**
 * 팔레트 한 줄에서
 *
 *   "CC<=70 성공한다!"
 *
 * 를
 *
 *   command = "CC<=70"
 *   text = "성공한다!"
 *
 * 로 분리합니다.
 *
 * 첫 번째 공백을 기준으로 나눕니다.
 */
function splitDiceCommand(line: string): {
  command: string;
  text: string;
} {
  const trimmed = line.trim();

  const spaceIndex = trimmed.indexOf(' ');

  // 공백이 없다면 전체를 주사위 명령어로 취급
  if (spaceIndex === -1) {
    return {
      command: trimmed,
      text: '',
    };
  }

  return {
    command: trimmed.slice(0, spaceIndex),
    text: trimmed.slice(spaceIndex + 1),
  };
}

/**
 * 팔레트 한 줄을 BCDice로 처리합니다.
 *
 * 예:
 *
 * "CC<=70 성공 관찰한다!"
 *
 * ↓
 *
 * BCDice:
 * CC<=70
 *
 * ↓
 *
 * "CC<=70 ＞ 43 ＞ 성공"
 *
 * 최종:
 *
 * "CC<=70 ＞ 43 ＞ 성공 관찰한다!"
 */
export async function processDiceCommand(
  line: string,
  guildConfig: GuildConfig,
): Promise<string> {
  const { command, text } = splitDiceCommand(line);

  if (!command) {
    throw new Error('주사위 명령어가 없습니다.');
  }

  const result = await rollDice(guildConfig.diceSystemId, command);

  if (!result.ok) {
    throw new Error('주사위 처리에 실패했습니다.');
  }

  if (!text) {
    return result.text;
  }

  return `${result.text} ${text}`;
}
