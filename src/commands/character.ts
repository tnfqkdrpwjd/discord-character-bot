import {
  SlashCommandBuilder,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getAllCharacters } from "../store/cache.js";
import { deleteCharacter } from "../store/channelStore.js";

export const characterCommand = new SlashCommandBuilder()
  .setName("캐릭터")
  .setDescription("캐릭터 데이터 관리")
  .addSubcommand((sub) => sub.setName("등록").setDescription("JSON을 붙여넣고 이미지를 첨부해서 캐릭터를 등록/수정합니다"))
  .addSubcommand((sub) => sub.setName("목록").setDescription("등록된 캐릭터 목록을 봅니다"))
  .addSubcommand((sub) =>
    sub
      .setName("삭제")
      .setDescription("캐릭터를 삭제합니다")
      .addStringOption((opt) => opt.setName("이름").setDescription("삭제할 캐릭터 이름").setRequired(true))
  );

export async function handleCharacterCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "등록") {
    const modal = new ModalBuilder().setCustomId("character_modal").setTitle("캐릭터 등록");

    const jsonInput = new TextInputBuilder()
      .setCustomId("json_input")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('{ "kind": "character", "data": {...} } 형식으로 붙여넣으세요')
      .setMaxLength(4000)
      .setRequired(true);

    const jsonLabel = new LabelBuilder().setLabel("캐릭터 JSON").setTextInputComponent(jsonInput);

    const imageUpload = new FileUploadBuilder()
      .setCustomId("image_input")
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false);

    const imageLabel = new LabelBuilder()
      .setLabel("프로필 이미지")
      .setDescription("캐릭터 프로필로 쓸 이미지 (선택)")
      .setFileUploadComponent(imageUpload);

    modal.addLabelComponents(jsonLabel, imageLabel);

    // 모달을 띄우는 응답은 인터랙션의 첫 응답이어야 하며 defer 할 수 없습니다.
    await interaction.showModal(modal);
    return;
  }

  if (sub === "목록") {
    const list = getAllCharacters(interaction.guild.id);
    if (list.length === 0) {
      await interaction.reply({ content: "이 서버에 등록된 캐릭터가 없습니다.", flags: MessageFlags.Ephemeral });
      return;
    }
    const lines = list.map((c) => `- ${c.data.name}`).join("\n");
    await interaction.reply({ content: `등록된 캐릭터:\n${lines}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "삭제") {
    const name = interaction.options.getString("이름", true);
    const ok = await deleteCharacter(interaction.guild, name);
    await interaction.reply({
      content: ok ? `'${name}' 삭제 완료` : `'${name}'을(를) 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
