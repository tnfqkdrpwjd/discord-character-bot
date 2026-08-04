import type { AutocompleteInteraction } from "discord.js";
import { getAllCharacters } from "../store/cache.js";

/** 여러 커맨드에서 공통으로 쓰는 "캐릭터 이름" 자동완성 */
export async function respondWithCharacterNames(interaction: AutocompleteInteraction, query: string) {
  if (!interaction.guild) {
    await interaction.respond([]);
    return;
  }
  const q = query.toLowerCase();
  const choices = getAllCharacters(interaction.guild.id)
    .map((c) => c.data.name)
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 25);
  await interaction.respond(choices.map((n) => ({ name: n, value: n })));
}
