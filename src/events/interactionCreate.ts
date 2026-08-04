import type { Client } from "discord.js";
import { Events, MessageFlags } from "discord.js";
import { handleCharacterCommand } from "../commands/character.js";
import { handlePaletteCommand, handlePaletteAutocomplete } from "../commands/palette.js";
import { handleSayCommand, handleSayAutocomplete } from "../commands/say.js";
import { handleStatCommand, handleStatAutocomplete } from "../commands/stat.js";
import { handleCharacterModal } from "../interactions/modals.js";
import { handlePermissionSelect } from "../interactions/selects.js";

export function registerInteractionEvent(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        if (interaction.commandName === "팔레트") {
          await handlePaletteAutocomplete(interaction);
        } else if (interaction.commandName === "대사") {
          await handleSayAutocomplete(interaction);
        } else if (interaction.commandName === "스탯") {
          await handleStatAutocomplete(interaction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "캐릭터") {
          await handleCharacterCommand(interaction);
        } else if (interaction.commandName === "팔레트") {
          await handlePaletteCommand(interaction);
        } else if (interaction.commandName === "대사") {
          await handleSayCommand(interaction);
        } else if (interaction.commandName === "스탯") {
          await handleStatCommand(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === "character_modal") {
        await handleCharacterModal(interaction);
        return;
      }

      if (interaction.isUserSelectMenu() && interaction.customId.startsWith("char_perm:")) {
        await handlePermissionSelect(interaction);
        return;
      }
    } catch (err) {
      console.error(err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: "처리 중 오류가 발생했습니다.", flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  });
}
