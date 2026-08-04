import type { UserSelectMenuInteraction, Guild, TextChannel } from "discord.js";
import { MessageFlags } from "discord.js";
import { findByName } from "../store/cache.js";
import { saveCharacter, attachAvatarImage } from "../store/channelStore.js";

export async function handlePermissionSelect(interaction: UserSelectMenuInteraction) {
  if (!interaction.guild) {
    await interaction.update({ content: "이 기능은 서버 안에서만 사용할 수 있습니다.", components: [] });
    return;
  }

  const [, name] = interaction.customId.split(":");
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await interaction.update({ content: `'${name}'을(를) 찾을 수 없습니다.`, components: [] });
    return;
  }

  record.data.permittedUserIds = interaction.values;
  await saveCharacter(interaction.guild, record.data);

  await interaction.update({
    content:
      `'${name}' 권한 설정 완료: ${interaction.values.map((id) => `<@${id}>`).join(", ")}\n\n` +
      `이제 60초 안에 이 채널에 캐릭터 이미지를 첨부해서 보내주세요. 건너뛰려면 \`건너뛰기\`라고 입력하세요.`,
    components: [],
  });

  await collectAvatarImage(interaction, interaction.guild, name);
}

async function collectAvatarImage(interaction: UserSelectMenuInteraction, guild: Guild, name: string) {
  const channel = interaction.channel as TextChannel | null;
  if (!channel) return;

  try {
    const collected = await channel.awaitMessages({
      filter: (m) => m.author.id === interaction.user.id,
      max: 1,
      time: 60_000,
    });

    const msg = collected.first();
    if (!msg) {
      await interaction.followUp({ content: "시간이 초과되어 이미지 등록을 건너뜁니다.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (msg.content.trim() === "건너뛰기") {
      await msg.delete().catch(() => {});
      await interaction.followUp({ content: "이미지 없이 진행합니다.", flags: MessageFlags.Ephemeral });
      return;
    }

    const attachment = msg.attachments.first();
    if (!attachment || !attachment.contentType?.startsWith("image/")) {
      await msg.delete().catch(() => {});
      await interaction.followUp({ content: "이미지 파일을 찾지 못해 건너뜁니다.", flags: MessageFlags.Ephemeral });
      return;
    }

    const ext = attachment.name?.split(".").pop() || "png";
    await attachAvatarImage(guild, name, attachment.url, ext);
    await msg.delete().catch(() => {});
    await interaction.followUp({ content: `'${name}' 이미지 등록 완료`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.warn("[avatar] 이미지 수집 실패:", err instanceof Error ? err.message : err);
  }
}
