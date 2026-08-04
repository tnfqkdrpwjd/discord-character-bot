import type { UserSelectMenuInteraction } from "discord.js";
import { findByName } from "../store/cache.js";
import { saveCharacter } from "../store/channelStore.js";

/** 이미 응답된 인터랙션이면(예: 봇이 중복 실행 중이었던 경우) 조용히 무시합니다. */
async function safeUpdate(interaction: UserSelectMenuInteraction, payload: Parameters<UserSelectMenuInteraction["update"]>[0]) {
  try {
    await interaction.update(payload);
  } catch (err) {
    console.warn(
      "[selects] 인터랙션 응답 실패 (봇이 중복 실행 중이 아닌지 확인하세요):",
      err instanceof Error ? err.message : err
    );
  }
}

export async function handlePermissionSelect(interaction: UserSelectMenuInteraction) {
  if (!interaction.guild) {
    await safeUpdate(interaction, { content: "이 기능은 서버 안에서만 사용할 수 있습니다.", components: [] });
    return;
  }

  const [, name] = interaction.customId.split(":");
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await safeUpdate(interaction, {
      content: `'${name}'을(를) 찾을 수 없습니다. (봇이 중복 실행 중이면 하나만 남기고 재시작해보세요)`,
      components: [],
    });
    return;
  }

  record.data.permittedUserIds = interaction.values;
  // 이미지는 이미 등록 단계에서 저장됐으므로, 기존 첨부를 그대로 유지한 채 JSON만 갱신됨
  await saveCharacter(interaction.guild, record.data);

  await safeUpdate(interaction, {
    content: `'${name}' 권한 설정 완료: ${interaction.values.map((id) => `<@${id}>`).join(", ")}`,
    components: [],
  });
}
