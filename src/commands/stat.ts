import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import { findByName } from "../store/cache.js";
import { saveCharacter } from "../store/channelStore.js";
import { respondWithCharacterNames } from "./autocomplete.js";

export const statCommand = new SlashCommandBuilder()
  .setName("스탯")
  .setDescription("캐릭터의 상태(status)·파라미터(params)를 확인하거나 변경합니다")
  .addSubcommand((sub) =>
    sub
      .setName("보기")
      .setDescription("현재 상태/파라미터를 봅니다")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("캐릭터").setRequired(true).setAutocomplete(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("상태변경")
      .setDescription("status 항목의 값을 절대값으로 설정합니다")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("캐릭터").setRequired(true).setAutocomplete(true))
      .addStringOption((opt) => opt.setName("항목").setDescription("바꿀 상태 항목").setRequired(true).setAutocomplete(true))
      .addNumberOption((opt) => opt.setName("값").setDescription("새로운 값").setRequired(true))
      .addNumberOption((opt) => opt.setName("최대값").setDescription("최대치도 같이 바꾸려면 입력 (선택)").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("증감")
      .setDescription("status 값을 상대적으로 더하거나 뺍니다 (데미지/회복 등, 0~최대값으로 자동 제한)")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("캐릭터").setRequired(true).setAutocomplete(true))
      .addStringOption((opt) => opt.setName("항목").setDescription("바꿀 상태 항목").setRequired(true).setAutocomplete(true))
      .addNumberOption((opt) => opt.setName("증감").setDescription("더할 값 (뺄 때는 음수, 예: -5)").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("파라미터변경")
      .setDescription("params 항목의 값을 변경합니다")
      .addStringOption((opt) => opt.setName("캐릭터").setDescription("캐릭터").setRequired(true).setAutocomplete(true))
      .addStringOption((opt) => opt.setName("항목").setDescription("바꿀 파라미터 항목").setRequired(true).setAutocomplete(true))
      .addStringOption((opt) => opt.setName("값").setDescription("새로운 값").setRequired(true))
  );

export async function handleStatAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === "캐릭터") {
    await respondWithCharacterNames(interaction, focused.value);
    return;
  }

  if (focused.name === "항목") {
    if (!interaction.guild) {
      await interaction.respond([]);
      return;
    }
    const charName = interaction.options.getString("캐릭터");
    const record = charName ? findByName(interaction.guild.id, charName) : undefined;
    if (!record) {
      await interaction.respond([]);
      return;
    }

    const sub = interaction.options.getSubcommand();
    const labels =
      sub === "파라미터변경" ? record.data.params.map((p) => p.label) : record.data.status.map((s) => s.label);

    const q = focused.value.toLowerCase();
    const matches = labels.filter((l) => l.toLowerCase().includes(q)).slice(0, 25);
    await interaction.respond(matches.map((l) => ({ name: l, value: l })));
  }
}

export async function handleStatCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "이 명령어는 서버 안에서만 사용할 수 있습니다.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();
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

  if (sub === "보기") {
    const statusText = record.data.status.length
      ? record.data.status.map((s) => `${s.label}: ${s.value}/${s.max}`).join("\n")
      : "(없음)";
    const paramsText = record.data.params.length
      ? record.data.params.map((p) => `${p.label}: ${p.value}`).join("\n")
      : "(없음)";

    await interaction.reply({
      content: `**${name}**\n\n[상태]\n${statusText}\n\n[파라미터]\n${paramsText}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "상태변경") {
    const label = interaction.options.getString("항목", true);
    const value = interaction.options.getNumber("값", true);
    const max = interaction.options.getNumber("최대값");

    const target = record.data.status.find((s) => s.label === label);
    if (!target) {
      await interaction.reply({ content: `'${label}' 상태 항목을 찾을 수 없습니다.`, flags: MessageFlags.Ephemeral });
      return;
    }

    target.value = value;
    if (max !== null) target.max = max;

    await saveCharacter(interaction.guild, record.data);
    await interaction.reply({
      content: `**${name}**의 ${label}: ${target.value}/${target.max}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "증감") {
    const label = interaction.options.getString("항목", true);
    const delta = interaction.options.getNumber("증감", true);

    const target = record.data.status.find((s) => s.label === label);
    if (!target) {
      await interaction.reply({ content: `'${label}' 상태 항목을 찾을 수 없습니다.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const before = target.value;
    target.value = Math.max(0, Math.min(target.max, target.value + delta));

    await saveCharacter(interaction.guild, record.data);
    await interaction.reply({
      content: `**${name}**의 ${label}: ${before} → ${target.value}/${target.max} (${delta >= 0 ? "+" : ""}${delta})`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "파라미터변경") {
    const label = interaction.options.getString("항목", true);
    const value = interaction.options.getString("값", true);

    const target = record.data.params.find((p) => p.label === label);
    if (!target) {
      await interaction.reply({ content: `'${label}' 파라미터 항목을 찾을 수 없습니다.`, flags: MessageFlags.Ephemeral });
      return;
    }

    target.value = value;

    await saveCharacter(interaction.guild, record.data);
    await interaction.reply({ content: `**${name}**의 ${label}: ${value}`, flags: MessageFlags.Ephemeral });
  }
}
