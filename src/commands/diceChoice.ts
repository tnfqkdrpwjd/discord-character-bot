import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  AutocompleteInteraction,
} from "discord.js";

import { getGameSystems, getGameSystem } from "../api/diceApi.js";

import { saveGuildConfig } from "../store/channelStore.js";

export const diceCommand = new SlashCommandBuilder()
  .setName("다이스")
  .setDescription("이 서버에서 사용할 다이스 시스템을 선택합니다.")
  .addStringOption((opt) =>
    opt
      .setName("룰")
      .setDescription("게임 시스템")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function handleDiceAutocomplete(
  interaction: AutocompleteInteraction,
) {
  try {
    const query = interaction.options.getFocused().toLowerCase();

    const systems = await getGameSystems();

    const matches = systems
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 25);

    await interaction.respond(
      matches.map((s) => ({
        name: s.name,
        value: s.id,
      })),
    );
  } catch (err) {
    console.error("[dice] 게임 시스템 자동완성 실패:", err);

    await interaction.respond([]);
  }
}

export async function handleDiceCommand(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "이 명령어는 서버 안에서만 사용할 수 있습니다.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const id = interaction.options.getString("룰", true);

  try {
    // 목록에서 선택한 ID가 실제 게임 시스템인지 확인
    const systems = await getGameSystems();

    const system = systems.find((s) => s.id === id);

    if (!system) {
      await interaction.reply({
        content: "게임 시스템을 찾을 수 없습니다.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // 선택한 게임 시스템의 상세 정보 조회
    const detail = await getGameSystem(system.id);

    // 서버 설정에 저장
    await saveGuildConfig(interaction.guild, {
      diceSystemName: detail.name,
      diceSystemId: detail.id,
      diceSystemHelp: detail.help_message,
    });

    await interaction.reply({
      content: `기본 다이스를 설정했습니다.

ID : ${detail.id}
이름 : ${detail.name}

도움말 :
${detail.help_message || "(도움말 없음)"}`,
    });
  } catch (err) {
    console.error("[dice] 다이스 시스템 설정 실패:", err);

    await interaction.reply({
      content: "다이스 시스템을 설정하는 중 오류가 발생했습니다.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
