import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  TextChannel,
  MessageFlags,
} from 'discord.js';

import { findByName } from '../store/cache.js';
import { getGuildConfig } from '../store/cache.js';
import { getCurrentAvatarUrl } from '../store/channelStore.js';
import { resolvePlaceholders } from '../store/placeholders.js';
import { getChannelWebhook } from '../webhook/webhookManager.js';
import { respondWithCharacterNames } from './autocomplete.js';
import { processDiceCommand } from '../services/diceService.js';

export const paletteCommand = new SlashCommandBuilder()
  .setName('팔레트')
  .setDescription('캐릭터의 채팅 팔레트를 불러와 바로 전송합니다')
  .addStringOption((opt) =>
    opt
      .setName('캐릭터')
      .setDescription('팔레트를 불러올 캐릭터')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('명령어')
      .setDescription('보낼 팔레트 항목 (입력하면서 검색됩니다)')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function handlePaletteAutocomplete(
  interaction: AutocompleteInteraction,
) {
  if (!interaction.guild) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused(true);

  // 캐릭터 자동완성
  if (focused.name === '캐릭터') {
    await respondWithCharacterNames(interaction, focused.value);
    return;
  }

  // 팔레트 명령어 자동완성
  if (focused.name === '명령어') {
    const charName = interaction.options.getString('캐릭터');

    const record = charName
      ? findByName(interaction.guild.id, charName)
      : undefined;

    if (!record) {
      await interaction.respond([]);
      return;
    }

    const lines = record.data.commands;
    const query = focused.value.toLowerCase();

    const matches = lines
      .map((line, index) => ({
        line,
        index,
      }))
      .filter(({ line }) => line.toLowerCase().includes(query))
      .slice(0, 25);

    await interaction.respond(
      matches.map(({ line, index }) => ({
        name: line.length > 100 ? line.slice(0, 97) + '...' : line,

        // 실제 명령어 대신 배열 인덱스를 전달
        value: String(index),
      })),
    );

    return;
  }
}

export async function handlePaletteCommand(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: '이 명령어는 서버 안에서만 사용할 수 있습니다.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ====================
  // 캐릭터 확인
  // ====================

  const name = interaction.options.getString('캐릭터', true);

  const record = findByName(interaction.guild.id, name);

  if (!record) {
    await interaction.reply({
      content: `'${name}'을(를) 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ====================
  // 권한 확인
  // ====================

  if (!record.data.permittedUserIds.includes(interaction.user.id)) {
    await interaction.reply({
      content: '이 캐릭터를 다룰 권한이 없습니다.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // 다이스 API 호출 등 3초를 넘길 수 있는 작업이 있어 먼저 defer 처리
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // ====================
  // 팔레트 명령어 가져오기
  // ====================

  const raw = interaction.options.getString('명령어', true);

  const lines = record.data.commands;

  // 자동완성으로 선택했다면 인덱스가 들어옵니다.
  // 직접 입력했다면 입력한 문자열을 그대로 사용합니다.
  const index = Number(raw);

  const line =
    Number.isInteger(index) && lines[index] !== undefined ? lines[index] : raw;

  // ====================
  // 플레이스홀더 치환
  // ====================

  const resolvedLine = resolvePlaceholders(record, line);

  // ====================
  // BCDice 처리
  // ====================

  // 팔레트의 맨 앞이 주사위 명령어라면
  // BCDice를 호출하고 결과를 원본 문장 뒤에 붙입니다.
  // 다이스 시스템이 설정 안 되어 있거나, 다이스 명령어가 아니면 원문 그대로 보냅니다.
  const guildConfig = getGuildConfig(interaction.guild.id);

  let finalLine = resolvedLine;
  if (guildConfig) {
    try {
      finalLine = await processDiceCommand(resolvedLine, guildConfig.data);
    } catch (err) {
      console.error(
        `[dice] 팔레트 처리 실패 (캐릭터: ${name}, 원문: ${resolvedLine}):`,
        err,
      );
      await interaction.editReply({
        content: `다이스 처리 실패: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
  }

  // ====================
  // Webhook 전송
  // ====================

  const channel = interaction.channel as TextChannel;

  const avatarURL = await getCurrentAvatarUrl(interaction.guild, record);

  const webhook = await getChannelWebhook(channel, interaction.client.user!.id);

  await webhook.send({
    content: finalLine,
    username: record.data.name,
    avatarURL,
  });

  await interaction.editReply({
    content: '전송했습니다.',
  });
}
