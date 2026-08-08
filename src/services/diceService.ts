import { rollDice } from "../api/diceApi.js";
import { getGuildConfig } from "../store/cache.js";

/**
 * 팔레트 문장에서 첫 번째 공백까지를
 * BCDice 명령어로 사용합니다.
 *
 * 예:
 *
 * "CC<=70 성공 관찰한다!"
 *
 * command:
 * "CC<=70"
 *
 * message:
 * "성공 관찰한다!"
 */
function splitDiceCommand(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const spaceIndex = trimmed.search(/\s/);

  if (spaceIndex === -1) {
    return {
      command: trimmed,
      message: "",
    };
  }

  return {
    command: trimmed.slice(0, spaceIndex),
    message: trimmed.slice(spaceIndex + 1),
  };
}

/**
 * 팔레트 문장을 BCDice로 처리합니다.
 *
 * 예:
 *
 * 입력:
 * CC<=70 성공 관찰한다!
 *
 * 출력:
 * CC<=70 성공 관찰한다!  CC<=70 ＞ 43 ＞ 成功
 *
 * 다이스 명령으로 판단할 수 없거나
 * 다이스 설정이 되어 있지 않으면
 * 원본 문장을 그대로 반환합니다.
 */
export async function processDiceCommand(
  guildId: string,
  text: string,
): Promise<string> {
  const config = getGuildConfig(guildId);

  if (!config) {
    return text;
  }

  const parsed = splitDiceCommand(text);

  if (!parsed) {
    return text;
  }

  try {
    const result = await rollDice(config.data.diceSystemId, parsed.command);

    if (!result.ok) {
      return text;
    }

    return `${text}  ${result.text}`;
  } catch (err) {
    console.warn(
      "[dice] 주사위 처리 실패:",
      err instanceof Error ? err.message : err,
    );

    return text;
  }
}
