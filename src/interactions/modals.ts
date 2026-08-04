import {
  ModalSubmitInteraction,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import { ClipboardSchema, CharacterSchema } from '../schema.js';
import { saveCharacter } from '../store/channelStore.js';

export async function handleCharacterModal(
  interaction: ModalSubmitInteraction,
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '이 기능은 서버 안에서만 사용할 수 있습니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const raw = interaction.fields.getTextInputValue('json_input');

  let parsedData: unknown;
  try {
    const clipboard = ClipboardSchema.parse(JSON.parse(raw));
    parsedData = clipboard.data;
  } catch (err) {
    await interaction.editReply({
      content: `JSON 형식이 올바르지 않습니다: ${(err as Error).message}`,
    });
    return;
  }

  const result = CharacterSchema.safeParse(parsedData);
  if (!result.success) {
    await interaction.editReply({
      content: `캐릭터 데이터 검증 실패:\n${result.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    });
    return;
  }

  // 업로드된 이미지 파일 (선택 사항) - Discord가 파일 데이터를 직접 안 주므로 CDN에서 다운로드
  let image: { buffer: Buffer; fileName: string } | undefined;
  try {
    const uploaded = interaction.fields.getUploadedFiles('image_input');
    const files = Array.isArray(uploaded)
      ? uploaded
      : uploaded
        ? [...uploaded.values()]
        : [];
    const attachment = files[0];
    if (attachment) {
      const res = await fetch(attachment.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      image = { buffer, fileName: attachment.name };
    }
  } catch {
    // 이미지를 첨부하지 않은 경우 등 - 무시하고 진행
  }

  await saveCharacter(interaction.guild, result.data, image);

  const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`char_perm:${result.data.name}`)
      .setPlaceholder('이 캐릭터를 다룰 수 있는 멤버 선택')
      .setMinValues(1)
      .setMaxValues(10),
  );

  await interaction.editReply({
    content: `'${result.data.name}' 저장 완료${image ? ' (이미지 포함)' : ''}. 이제 권한을 부여할 멤버를 선택하세요.`,
    components: [row],
  });
}
