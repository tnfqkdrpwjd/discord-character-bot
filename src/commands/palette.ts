import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { findByName } from "../store/cache.js";
import { getCurrentAvatarUrl } from "../store/channelStore.js";
import { resolvePlaceholders } from "../store/placeholders.js";
import { getChannelWebhook } from "../webhook/webhookManager.js";
import { respondWithCharacterNames } from "./autocomplete.js";

export const paletteCommand = new SlashCommandBuilder()
  .setName("팔레트")
  .setDescription("캐릭터의 채팅 팔레트를 불러와 바로 전송합니다")
  .addStringOption((opt) =>
    opt.setName("캐릭터").setDescription("팔레트를 불러올 캐릭터").setRequired(true).setAutocomplete(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("명령어")
      .setDescription("보낼 팔레트 항목 (입력하면서 검색됩니다)")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function handlePaletteAutocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.guild) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused(true);

  if (focused.name === "캐릭터") {
    await respondWithCharacterNames(interaction, focused.value);
    return;
  }

  if (focused.name === "명령어") {
    const charName = interaction.options.getString("캐릭터");
    const record = charName ? findByName(interaction.guild.id, charName) : undefined;
    if (!record) {
      await interaction.respond([]);
      return;
    }

    const lines = record.data.commands; // 이미 배열로 저장되어 있음

    const query = focused.value.toLowerCase();
    const matches = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.toLowerCase().includes(query))
      .slice(0, 25);

    await interaction.respond(
      matches.map(({ line, index }) => ({
        name: line.length > 100 ? line.slice(0, 97) + "..." : line,
        // 실제 값은 인덱스로 넘겨서 100자 제한과 무관하게 원문을 그대로 보존
        value: String(index),
      }))
    );
  }
}

export async function handlePaletteCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const name = interaction.options.getString("캐릭터", true);
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await interaction.reply({ content: `'${name}'을(를) 찾을 수 없습니다.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (!record.data.permittedUserIds.includes(interaction.user.id)) {
    await interaction.reply({ content: "이 캐릭터를 다룰 권한이 없습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const raw = interaction.options.getString("명령어", true);
  const lines = record.data.commands; // 이미 배열로 저장되어 있음

  // 자동완성으로 골랐다면 인덱스(숫자 문자열)가, 직접 타이핑해서 보냈다면 그 텍스트가 들어옴
  const index = Number(raw);
  const line = Number.isInteger(index) && lines[index] !== undefined ? lines[index] : raw;
  const resolvedLine = resolvePlaceholders(record, line);

  const channel = interaction.channel as TextChannel;
  const avatarURL = await getCurrentAvatarUrl(interaction.guild, record);
  const webhook = await getChannelWebhook(channel, interaction.client.user!.id);

  await webhook.send({ content: resolvedLine, username: record.data.name, avatarURL });
  await interaction.reply({ content: "전송했습니다.", flags: MessageFlags.Ephemeral });
}
