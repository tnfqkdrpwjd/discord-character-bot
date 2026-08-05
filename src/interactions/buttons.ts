import {
  ButtonInteraction,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
  MessageFlags,
} from "discord.js";
import { findByName } from "../store/cache.js";

const EDIT_OPEN_PREFIX = "character_edit_open:";
const TEXT_PREFILL_LIMIT = 3900; // 모달 텍스트 4000자 제한에 여유를 둠

export async function handleCharacterEditButton(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 기능은 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const name = interaction.customId.slice(EDIT_OPEN_PREFIX.length);
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await interaction.reply({
      content: `'${name}'을(를) 찾을 수 없습니다. (그 사이 삭제되었을 수 있어요)`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!record.data.permittedUserIds.includes(interaction.user.id)) {
    await interaction.reply({ content: "이 캐릭터를 다룰 권한이 없습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const fullJson = JSON.stringify({ kind: "character", data: record.data }, null, 2);
  const fitsInline = fullJson.length <= TEXT_PREFILL_LIMIT;

  const modal = new ModalBuilder()
    .setCustomId(`character_edit_modal:${name}`)
    .setTitle(`캐릭터 수정: ${name}`.slice(0, 45));

  const jsonInput = new TextInputBuilder()
    .setCustomId("json_input")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(false);

  if (fitsInline) {
    jsonInput.setValue(fullJson);
  } else {
    jsonInput.setPlaceholder("데이터가 길어 여기 못 채웠어요. 위에서 받은 current.json을 수정해 아래 파일로 첨부해주세요.");
  }

  const jsonLabel = new LabelBuilder().setLabel("캐릭터 JSON (직접 수정)").setTextInputComponent(jsonInput);

  const jsonFileUpload = new FileUploadBuilder()
    .setCustomId("json_file_input")
    .setMinValues(0)
    .setMaxValues(1)
    .setRequired(false);
  const jsonFileLabel = new LabelBuilder()
    .setLabel("캐릭터 JSON 파일 (선택)")
    .setDescription("위 텍스트 대신 파일로 제출하려면 여기에 첨부 (있으면 텍스트보다 우선)")
    .setFileUploadComponent(jsonFileUpload);

  const imageUpload = new FileUploadBuilder()
    .setCustomId("image_input")
    .setMinValues(0)
    .setMaxValues(1)
    .setRequired(false);
  const imageLabel = new LabelBuilder()
    .setLabel("새 프로필 이미지 (선택)")
    .setDescription("비우면 기존 이미지 유지")
    .setFileUploadComponent(imageUpload);

  modal.addLabelComponents(jsonLabel, jsonFileLabel, imageLabel);

  await interaction.showModal(modal);
}
