import { ModalSubmitInteraction, ActionRowBuilder, UserSelectMenuBuilder, MessageFlags } from "discord.js";
import { ClipboardSchema, CharacterSchema } from "../schema.js";
import { saveCharacter } from "../store/channelStore.js";

const MAX_REPLY_LENGTH = 1900; // 디스코드 메시지 2000자 제한 대비 여유

function getFirstUploadedFile(interaction: ModalSubmitInteraction, customId: string) {
  const files = interaction.fields.getUploadedFiles(customId);
  const list = files ? (Array.isArray(files) ? files : [...files.values()]) : [];
  return list[0];
}

/** JSON 파일이 있으면 그걸 우선 사용하고, 없으면 직접 입력한 텍스트를 사용합니다. */
async function resolveJsonText(interaction: ModalSubmitInteraction): Promise<string | null> {
  const jsonFile = getFirstUploadedFile(interaction, "json_file_input");
  if (jsonFile) {
    const res = await fetch(jsonFile.url);
    return await res.text();
  }

  const text = interaction.fields.getTextInputValue("json_input");
  return text.trim().length > 0 ? text : null;
}

async function resolveImage(interaction: ModalSubmitInteraction) {
  const attachment = getFirstUploadedFile(interaction, "image_input");
  if (!attachment) return undefined;
  const res = await fetch(attachment.url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, fileName: attachment.name };
}

const EDIT_MODAL_PREFIX = "character_edit_modal:";

export async function handleCharacterModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 기능은 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const isEdit = interaction.customId.startsWith(EDIT_MODAL_PREFIX);
  const originalName = isEdit ? interaction.customId.slice(EDIT_MODAL_PREFIX.length) : undefined;

  // 채널 조회/생성, 메시지 전송 등 3초를 넘길 수 있는 작업이 있어 먼저 defer 처리
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const raw = await resolveJsonText(interaction);
  if (raw === null) {
    await interaction.editReply({ content: "캐릭터 JSON을 텍스트로 입력하거나 파일로 첨부해주세요." });
    return;
  }

  let parsedData: unknown;
  try {
    const clipboard = ClipboardSchema.parse(JSON.parse(raw));
    parsedData = clipboard.data;
  } catch (err) {
    await interaction.editReply({ content: `JSON 형식이 올바르지 않습니다: ${(err as Error).message}` });
    return;
  }

  const result = CharacterSchema.safeParse(parsedData);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    const content = `캐릭터 데이터 검증 실패:\n${issues}`;
    await interaction.editReply({
      content: content.length > MAX_REPLY_LENGTH ? content.slice(0, MAX_REPLY_LENGTH) + "\n... (더 있음)" : content,
    });
    return;
  }

  const image = await resolveImage(interaction);
  await saveCharacter(interaction.guild, result.data, image, originalName);

  if (isEdit) {
    const renamed = originalName && originalName !== result.data.name;
    await interaction.editReply({
      content: `${renamed ? `'${originalName}' → '${result.data.name}'` : `'${result.data.name}'`} 수정 완료${
        image ? " (이미지 변경)" : ""
      }`,
    });
    return;
  }

  const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`char_perm:${result.data.name}`)
      .setPlaceholder("이 캐릭터를 다룰 수 있는 멤버 선택")
      .setMinValues(1)
      .setMaxValues(10)
  );

  await interaction.editReply({
    content: `'${result.data.name}' 저장 완료${image ? " (이미지 포함)" : ""}. 이제 권한을 부여할 멤버를 선택하세요.`,
    components: [row],
  });
}
