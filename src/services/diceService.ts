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
 * command_pattern(게임 시스템별 정규식)에 안 맞으면 다이스 명령어가 아니라고 보고
 * API를 호출하지 않은 채 원문을 그대로 반환합니다. (일반 대사가 섞여 있어도 에러 없이 통과)
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
    return line;
  }

  // 다이스 명령어처럼 생기지 않았으면 API를 호출하지 않고 원문 그대로 반환
  let pattern: RegExp;
  try {
    pattern = new RegExp(guildConfig.diceSystemCommandPattern, 'i');
  } catch {
    // 패턴 자체가 유효하지 않으면 판별 없이 그냥 원문 통과
    return line;
  }

  if (!pattern.test(command)) {
    return line;
  }

  const result = await rollDice(guildConfig.diceSystemId, command);

  if (!result.ok) {
    // 패턴은 맞았지만 실제로는 처리하지 못한 경우 (오타 등) - 원문 그대로 반환
    return line;
  }

  if (!text) {
    return result.text;
  }

  return `${result.text} ${text}`;
}
