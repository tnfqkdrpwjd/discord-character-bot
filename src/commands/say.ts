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

export const sayCommand = new SlashCommandBuilder()
  .setName('대사')
  .setDescription('캐릭터로 대사를 보냅니다')
  .addStringOption((opt) =>
    opt
      .setName('캐릭터')
      .setDescription('말할 캐릭터')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((opt) =>
    opt.setName('내용').setDescription('대사 내용').setRequired(true),
  );

export async function handleSayAutocomplete(
  interaction: AutocompleteInteraction,
) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === '캐릭터') {
    await respondWithCharacterNames(interaction, focused.value);
  }
}

export async function handleSayCommand(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: '이 명령어는 서버 안에서만 사용할 수 있습니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString('캐릭터', true);
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await interaction.reply({
      content: `'${name}'을(를) 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!record.data.permittedUserIds.includes(interaction.user.id)) {
    await interaction.reply({
      content: '이 캐릭터를 다룰 권한이 없습니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 다이스 API 호출 등 3초를 넘길 수 있는 작업이 있어 먼저 defer 처리
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const resolvedContent = resolvePlaceholders(
    record,
    interaction.options.getString('내용', true),
  );

  // 다이스 명령어처럼 보이면 굴리고, 아니면(또는 설정 없으면) 원문 그대로 통과
  const guildConfig = getGuildConfig(interaction.guild.id);
  let content = resolvedContent;
  if (guildConfig) {
    try {
      content = await processDiceCommand(resolvedContent, guildConfig.data);
    } catch (err) {
      console.error(
        `[dice] 대사 처리 실패 (캐릭터: ${name}, 원문: ${resolvedContent}):`,
        err,
      );
      await interaction.editReply({
        content: `다이스 처리 실패: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
  }

  const channel = interaction.channel as TextChannel;

  const avatarURL = await getCurrentAvatarUrl(interaction.guild, record);
  const webhook = await getChannelWebhook(channel, interaction.client.user!.id);

  await webhook.send({ content, username: record.data.name, avatarURL });
  await interaction.editReply({ content: '전송했습니다.' });
}
