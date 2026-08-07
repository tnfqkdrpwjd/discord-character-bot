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
  .setDescription(
    "캐릭터의 상태(status)·파라미터(params)를 확인하거나 변경합니다",
  )
  .addSubcommand((sub) =>
    sub
      .setName("보기")
      .setDescription("현재 상태/파라미터를 봅니다")
      .addStringOption((opt) =>
        opt
          .setName("캐릭터")
          .setDescription("캐릭터")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("변경")
      .setDescription("상태(+6/-2/=30) 또는 파라미터(새 값) 값을 변경합니다")
      .addStringOption((opt) =>
        opt
          .setName("캐릭터")
          .setDescription("캐릭터")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("항목")
          .setDescription("바꿀 항목 (상태/파라미터 통합)")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("값")
          .setDescription(
            "상태: +6(더하기) / -2(빼기) / =30(설정). 파라미터: 새 값 그대로 입력",
          )
          .setRequired(true),
      ),
  );

export async function handleStatAutocomplete(
  interaction: AutocompleteInteraction,
) {
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
    const record = charName
      ? findByName(interaction.guild.id, charName)
      : undefined;
    if (!record) {
      await interaction.respond([]);
      return;
    }

    // 상태/파라미터를 한 목록으로 합치되, value에 종류를 접두사로 넣어 구분
    const choices = [
      ...record.data.status.map((s) => ({
        name: `${s.label} (상태)`,
        value: `status:${s.label}`,
      })),
      ...record.data.params.map((p) => ({
        name: `${p.label} (파라미터)`,
        value: `param:${p.label}`,
      })),
    ];

    const q = focused.value.toLowerCase();
    const matches = choices
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 25);
    await interaction.respond(matches);
  }
}

export async function handleStatCommand(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "이 명령어는 서버 안에서만 사용할 수 있습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const name = interaction.options.getString("캐릭터", true);
  const record = findByName(interaction.guild.id, name);
  if (!record) {
    await interaction.reply({
      content: `'${name}'을(를) 찾을 수 없습니다.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!record.data.permittedUserIds.includes(interaction.user.id)) {
    await interaction.reply({
      content: "이 캐릭터를 다룰 권한이 없습니다.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "보기") {
    const statusText = record.data.status.length
      ? record.data.status
          .map((s) => `${s.label}: ${s.value}/${s.max}`)
          .join("\n")
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

  if (sub === "변경") {
    const raw = interaction.options.getString("항목", true); // "status:HP" 또는 "param:근력"
    const separatorIndex = raw.indexOf(":");
    const kind = raw.slice(0, separatorIndex);
    const label = raw.slice(separatorIndex + 1);
    const valueInput = interaction.options.getString("값", true).trim();

    if (kind === "status") {
      const target = record.data.status.find((s) => s.label === label);
      if (!target) {
        await interaction.reply({
          content: `'${label}' 상태 항목을 찾을 수 없습니다.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let newValue: number;
      if (valueInput.startsWith("+")) {
        newValue = target.value + (Number(valueInput.slice(1)) || 0);
      } else if (valueInput.startsWith("-")) {
        newValue = target.value - (Number(valueInput.slice(1)) || 0);
      } else if (valueInput.startsWith("=")) {
        newValue = Number(valueInput.slice(1)) || 0;
      } else {
        const parsed = Number(valueInput);
        if (Number.isNaN(parsed)) {
          await interaction.reply({
            content:
              "값은 `+6`(더하기) / `-2`(빼기) / `=30`(설정) 형식으로 입력해주세요.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        newValue = parsed;
      }

      const before = target.value;
      target.value = newValue; // 최대값으로 제한하지 않음 — 자유롭게 초과 가능

      await saveCharacter(interaction.guild, record.data);
      await interaction.reply({
        content: `**${name}**의 ${label}: ${before} → ${target.value}/${target.max}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (kind === "param") {
      const target = record.data.params.find((p) => p.label === label);
      if (!target) {
        await interaction.reply({
          content: `'${label}' 파라미터 항목을 찾을 수 없습니다.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      target.value = valueInput;
      await saveCharacter(interaction.guild, record.data);
      await interaction.reply({
        content: `**${name}**의 ${label}: ${valueInput}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: "항목을 다시 선택해주세요.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
