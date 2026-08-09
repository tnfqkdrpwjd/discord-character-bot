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
      .filter((system) => system.name.toLowerCase().includes(query))
      .slice(0, 25);

    await interaction.respond(
      matches.map((system) => ({
        name: system.name,
        value: system.id,
      })),
    );
  } catch (err) {
    console.warn(
      "[dice] 게임 시스템 자동완성 실패:",
      err instanceof Error ? err.message : err,
    );

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
    // 선택한 ID로 게임 시스템 상세 정보를 가져옵니다.
    const system = await getGameSystem(id);

    // 서버의 기본 다이스 설정을 저장합니다.
    await saveGuildConfig(interaction.guild, {
      diceSystemId: system.id,
      diceSystemName: system.name,
      diceSystemHelp: system.help_message,
      diceSystemCommandPattern: system.command_pattern,
    });

    await interaction.reply({
      content: `기본 다이스를 설정했습니다.\n\n` + `이름 : ${system.name}\n`,
      // `ID : ${system.id}\n` +
      // `${system.help_message}`,
    });
  } catch (err) {
    console.error("[dice] 게임 시스템 설정 실패:", err);

    await interaction.reply({
      content: "게임 시스템을 가져오거나 저장하는 중 오류가 발생했습니다.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
