import {
  SlashCommandBuilder,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import { getAllCharacters, findByName } from "../store/cache.js";
import { deleteCharacter } from "../store/channelStore.js";
import { respondWithCharacterNames } from "./autocomplete.js";

export const characterCommand = new SlashCommandBuilder()
  .setName("캐릭터")
  .setDescription("캐릭터 데이터 관리")
  .addSubcommand((sub) => sub.setName("등록").setDescription("JSON을 붙여넣거나 첨부해서 새 캐릭터를 등록합니다"))
  .addSubcommand((sub) =>
    sub
      .setName("수정")
      .setDescription("기존 캐릭터 데이터를 모달로 열어 수정합니다")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("수정할 캐릭터").setRequired(true).setAutocomplete(true))
  )
  .addSubcommand((sub) => sub.setName("목록").setDescription("등록된 캐릭터 목록을 봅니다"))
  .addSubcommand((sub) =>
    sub
      .setName("삭제")
      .setDescription("캐릭터를 삭제합니다")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("삭제할 캐릭터").setRequired(true).setAutocomplete(true))
  );

export async function handleCharacterAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === "캐릭터") {
    await respondWithCharacterNames(interaction, focused.value);
  }
}

export async function handleCharacterCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "등록") {
    const modal = new ModalBuilder().setCustomId("character_modal").setTitle("캐릭터 등록");

    // 1) 짧은 JSON은 직접 붙여넣기 (4000자 제한)
    const jsonInput = new TextInputBuilder()
      .setCustomId("json_input")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("4000자 이하면 여기에 붙여넣으세요 (길면 아래 파일 첨부 사용, 이 칸은 비워도 됨)")
      .setMaxLength(4000)
      .setRequired(false);
    const jsonLabel = new LabelBuilder().setLabel("캐릭터 JSON (직접 입력)").setTextInputComponent(jsonInput);

    // 2) 긴 JSON은 .json 파일로 첨부 (텍스트 길이 제한 없음, 있으면 이게 우선 적용됨)
    const jsonFileUpload = new FileUploadBuilder()
      .setCustomId("json_file_input")
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false);
    const jsonFileLabel = new LabelBuilder()
      .setLabel("캐릭터 JSON 파일")
      .setDescription("텍스트가 4000자를 넘으면 .json 파일로 첨부하세요 (있으면 위 텍스트보다 우선)")
      .setFileUploadComponent(jsonFileUpload);

    // 3) 프로필 이미지 (선택)
    const imageUpload = new FileUploadBuilder()
      .setCustomId("image_input")
      .setMinValues(0)
      .setMaxValues(1)
      .setRequired(false);
    const imageLabel = new LabelBuilder()
      .setLabel("프로필 이미지")
      .setDescription("캐릭터 프로필로 쓸 이미지 (선택, 비우면 기존 이미지 유지)")
      .setFileUploadComponent(imageUpload);

    modal.addLabelComponents(jsonLabel, jsonFileLabel, imageLabel);

    await interaction.showModal(modal);
    return;
  }

  if (sub === "수정") {
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

    const jsonAttachment = new AttachmentBuilder(
      Buffer.from(JSON.stringify({ kind: "character", data: record.data }, null, 2), "utf-8"),
      { name: "current.json" }
    );

    const editButton = new ButtonBuilder()
      .setCustomId(`character_edit_open:${name}`)
      .setLabel("수정하기")
      .setStyle(ButtonStyle.Primary);

    await interaction.reply({
      content: `**${name}**의 현재 데이터입니다. 확인하신 뒤 아래 버튼을 눌러 수정 모달을 여세요.`,
      files: [jsonAttachment],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(editButton)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "목록") {
    const list = getAllCharacters(interaction.guild.id).filter((c) =>
      c.data.permittedUserIds.includes(interaction.user.id)
    );
    if (list.length === 0) {
      await interaction.reply({ content: "권한을 가진 캐릭터가 없습니다.", flags: MessageFlags.Ephemeral });
      return;
    }
    const lines = list.map((c) => `- ${c.data.name}`).join("\n");
    await interaction.reply({ content: `등록된 캐릭터:\n${lines}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "삭제") {
    const name = interaction.options.getString("캐릭터", true);
    const ok = await deleteCharacter(interaction.guild, name);
    await interaction.reply({
      content: ok ? `'${name}' 삭제 완료` : `'${name}'을(를) 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
