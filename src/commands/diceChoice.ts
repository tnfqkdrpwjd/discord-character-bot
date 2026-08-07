import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  AutocompleteInteraction,
} from 'discord.js';

import { getGameSystems } from '../api/diceApi.js';

export const diceCommand = new SlashCommandBuilder()
  .setName('다이스')
  .setDescription('이 서버에서 사용할 다이스 시스템을 선택합니다.')
  .addStringOption((opt) =>
    opt
      .setName('룰')
      .setDescription('게임 시스템')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function handleDiceAutocomplete(
  interaction: AutocompleteInteraction,
) {
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
}

export async function handleDiceCommand(
  interaction: ChatInputCommandInteraction,
) {
  const id = interaction.options.getString('룰', true);

  const systems = await getGameSystems();

  const system = systems.find((s) => s.id === id);

  if (!system) {
    await interaction.reply({
      content: '게임 시스템을 찾을 수 없습니다.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `선택된 시스템

ID : ${system.id}
이름 : ${system.name}
정렬키 : ${system.sort_key}`,
  });
}
