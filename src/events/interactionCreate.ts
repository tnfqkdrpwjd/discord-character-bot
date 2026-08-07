import type { Client } from 'discord.js';
import { Events, MessageFlags } from 'discord.js';
import {
  handleCharacterCommand,
  handleCharacterAutocomplete,
} from '../commands/character.js';
import {
  handlePaletteCommand,
  handlePaletteAutocomplete,
} from '../commands/palette.js';
import { handleSayCommand, handleSayAutocomplete } from '../commands/say.js';
import { handleStatCommand, handleStatAutocomplete } from '../commands/stat.js';
import { handleCharacterModal } from '../interactions/modals.js';
import { handlePermissionSelect } from '../interactions/selects.js';
import { handleCharacterEditButton } from '../interactions/buttons.js';
import {
  handleDiceAutocomplete,
  handleDiceCommand,
} from '../commands/diceChoice.js';

export function registerInteractionEvent(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        if (interaction.commandName === '캐릭터') {
          await handleCharacterAutocomplete(interaction);
        } else if (interaction.commandName === '팔레트') {
          await handlePaletteAutocomplete(interaction);
        } else if (interaction.commandName === '대사') {
          await handleSayAutocomplete(interaction);
        } else if (interaction.commandName === '스탯') {
          await handleStatAutocomplete(interaction);
        } else if (interaction.commandName === '다이스') {
          await handleDiceAutocomplete(interaction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === '캐릭터') {
          await handleCharacterCommand(interaction);
        } else if (interaction.commandName === '팔레트') {
          await handlePaletteCommand(interaction);
        } else if (interaction.commandName === '대사') {
          await handleSayCommand(interaction);
        } else if (interaction.commandName === '스탯') {
          await handleStatCommand(interaction);
        } else if (interaction.commandName === '다이스') {
          await handleDiceCommand(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        if (
          interaction.customId === 'character_modal' ||
          interaction.customId.startsWith('character_edit_modal:')
        ) {
          await handleCharacterModal(interaction);
        }
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith('character_edit_open:')
      ) {
        await handleCharacterEditButton(interaction);
        return;
      }

      if (
        interaction.isUserSelectMenu() &&
        interaction.customId.startsWith('char_perm:')
      ) {
        await handlePermissionSelect(interaction);
        return;
      }

      if (interaction.isAutocomplete()) {
        if (interaction.commandName === '다이스') {
          return handleDiceAutocomplete(interaction);
        }
      }

      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === '다이스') {
          return handleDiceCommand(interaction);
        }
      }
    } catch (err) {
      console.error(err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction
          .reply({
            content: '처리 중 오류가 발생했습니다.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  });
}
