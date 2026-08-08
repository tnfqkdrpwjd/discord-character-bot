import type { Guild, TextChannel, Message } from "discord.js";

import {
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} from "discord.js";

import { config } from "../config.js";
import { CharacterSchema } from "../schema.js";

import {
  clearGuildCache,
  clearGuildConfig,
  upsertCache,
  removeCache,
  findByName,
  getAllCharacters,
  setGuildConfig,
  getGuildConfig,
} from "./cache.js";

import type { Character, CharacterRecord, GuildConfig } from "../types.js";

// ====================
// Attachment
// ====================

const JSON_ATTACHMENT_NAME = "character.json";
const AVATAR_ATTACHMENT_PREFIX = "avatar";
const GUILD_CONFIG_ATTACHMENT_NAME = "guild-config.json";

// ====================
// Data Channel
// ====================

/**
 * 서버별 데이터 채널을 찾거나,
 * 없으면 새로 만듭니다.
 */
export async function getOrCreateDataChannel(
  guild: Guild,
): Promise<TextChannel> {
  await guild.channels.fetch();

  const existing = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText && ch.name === config.dataChannelName,
  ) as TextChannel | undefined;

  const botMember = guild.members.me ?? (await guild.members.fetchMe());

  if (existing) {
    await existing.permissionOverwrites
      .edit(botMember.id, {
        ViewChannel: true,
        SendMessages: true,
        ManageMessages: true,
        AttachFiles: true,
        ReadMessageHistory: true,
      })
      .catch((err) =>
        console.warn(
          "[channel] 봇 권한 보정 실패:",
          err instanceof Error ? err.message : err,
        ),
      );

    return existing;
  }

  console.log(
    `[channel] ${guild.name}에 '${config.dataChannelName}' 채널이 없어 새로 생성합니다.`,
  );

  return guild.channels.create({
    name: config.dataChannelName,
    type: ChannelType.GuildText,

    topic:
      "캐릭터 및 서버 설정 데이터 저장 전용 채널입니다. 봇이 자동 관리하니 직접 수정/삭제하지 마세요.",

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,

        deny: [PermissionFlagsBits.SendMessages],

        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },

      {
        id: botMember.id,

        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });
}

// ====================
// Character
// ====================

function toJsonAttachment(data: Character) {
  const json = JSON.stringify(data, null, 2);

  return new AttachmentBuilder(Buffer.from(json, "utf-8"), {
    name: JSON_ATTACHMENT_NAME,
  });
}

function extFromFileName(fileName: string | undefined) {
  const ext = fileName?.split(".").pop();

  return ext && ext.length <= 5 ? ext : "png";
}

async function readCharacterFromMessage(
  msg: Message,
): Promise<Character | null> {
  const attachment = msg.attachments.find(
    (a) => a.name === JSON_ATTACHMENT_NAME,
  );

  if (!attachment) {
    return null;
  }

  try {
    const res = await fetch(attachment.url);

    const text = await res.text();

    return CharacterSchema.parse(JSON.parse(text));
  } catch (err) {
    console.warn(
      `[cache] 메시지 ${msg.id} 첨부파일 파싱 실패:`,
      err instanceof Error ? err.message : err,
    );

    return null;
  }
}

// ====================
// Guild Cache Loading
// ====================

/**
 * 특정 서버의 데이터 채널을 읽어
 * 캐시를 채웁니다.
 */
export async function loadCacheForGuild(guild: Guild) {
  const channel = await getOrCreateDataChannel(guild);

  clearGuildCache(guild.id);
  clearGuildConfig(guild.id);

  const messages = await channel.messages.fetch({
    limit: 50,
  });

  for (const msg of messages.values()) {
    const guildConfig = await readGuildConfigFromMessage(msg);

    if (guildConfig) {
      setGuildConfig(guild.id, msg.id, guildConfig);

      continue;
    }

    const parsed = await readCharacterFromMessage(msg);

    if (parsed) {
      upsertCache(guild.id, parsed.name, msg.id, parsed);
    }
  }

  console.log(
    `[cache] ${guild.name}: ${getAllCharacters(guild.id).length}개 캐릭터 로드 완료`,
  );
}

// ====================
// Character Save
// ====================

export async function saveCharacter(
  guild: Guild,
  data: Character,
  image?: {
    buffer: Buffer;
    fileName: string;
  },
  previousName?: string,
) {
  const channel = await getOrCreateDataChannel(guild);

  const lookupName = previousName ?? data.name;

  const existing = findByName(guild.id, lookupName);

  const caption = `📎 캐릭터: ${data.name}`;

  const files: AttachmentBuilder[] = [toJsonAttachment(data)];

  if (image) {
    files.push(
      new AttachmentBuilder(image.buffer, {
        name: `${AVATAR_ATTACHMENT_PREFIX}.${extFromFileName(image.fileName)}`,
      }),
    );
  } else if (existing) {
    const oldMsg = await channel.messages
      .fetch(existing.messageId)
      .catch(() => null);

    const avatarAttachment = oldMsg?.attachments.find((a) =>
      a.name?.startsWith(AVATAR_ATTACHMENT_PREFIX),
    );

    if (avatarAttachment) {
      files.push(
        new AttachmentBuilder(avatarAttachment.url, {
          name: avatarAttachment.name,
        }),
      );
    }
  }

  if (existing) {
    const msg = await channel.messages.fetch(existing.messageId);

    await msg.edit({
      content: caption,
      files,
      attachments: [],
    });

    if (previousName && previousName !== data.name) {
      removeCache(guild.id, previousName);
    }

    upsertCache(guild.id, data.name, msg.id, data);

    return existing.messageId;
  }

  const msg = await channel.send({
    content: caption,
    files,
  });

  upsertCache(guild.id, data.name, msg.id, data);

  return msg.id;
}

// ====================
// Character Delete
// ====================

export async function deleteCharacter(guild: Guild, name: string) {
  const existing = findByName(guild.id, name);

  if (!existing) {
    return false;
  }

  const channel = await getOrCreateDataChannel(guild);

  const msg = await channel.messages
    .fetch(existing.messageId)
    .catch(() => null);

  if (msg) {
    await msg.delete().catch(() => {});
  }

  removeCache(guild.id, name);

  return true;
}

// ====================
// Character Avatar
// ====================

export async function getCurrentAvatarUrl(
  guild: Guild,
  record: CharacterRecord,
): Promise<string | undefined> {
  try {
    const channel = await getOrCreateDataChannel(guild);

    const msg = await channel.messages.fetch(record.messageId);

    const avatarAttachment = msg.attachments.find((a) =>
      a.name?.startsWith(AVATAR_ATTACHMENT_PREFIX),
    );

    return avatarAttachment?.url;
  } catch (err) {
    console.warn(
      `[avatar] ${record.data.name} 이미지 조회 실패:`,
      err instanceof Error ? err.message : err,
    );

    return undefined;
  }
}

// ====================
// Guild Config
// ====================

function toGuildConfigAttachment(data: GuildConfig) {
  const json = JSON.stringify(data, null, 2);

  return new AttachmentBuilder(Buffer.from(json, "utf-8"), {
    name: GUILD_CONFIG_ATTACHMENT_NAME,
  });
}

/**
 * 서버 설정을 저장합니다.
 */
export async function saveGuildConfig(guild: Guild, data: GuildConfig) {
  const channel = await getOrCreateDataChannel(guild);

  const existing = getGuildConfig(guild.id);

  const files = [toGuildConfigAttachment(data)];

  const content = "서버 설정";

  if (existing) {
    const msg = await channel.messages.fetch(existing.messageId);

    await msg.edit({
      content,
      files,
      attachments: [],
    });

    setGuildConfig(guild.id, msg.id, data);

    return msg.id;
  }

  const msg = await channel.send({
    content,
    files,
  });

  setGuildConfig(guild.id, msg.id, data);

  return msg.id;
}

/**
 * 서버 설정을 읽습니다.
 */
async function readGuildConfigFromMessage(
  msg: Message,
): Promise<GuildConfig | null> {
  const attachment = msg.attachments.find(
    (a) => a.name === GUILD_CONFIG_ATTACHMENT_NAME,
  );

  if (!attachment) {
    return null;
  }

  try {
    const res = await fetch(attachment.url);

    const text = await res.text();

    const data = JSON.parse(text);

    if (
      typeof data !== "object" ||
      data === null ||
      typeof data.diceSystemName !== "string" ||
      typeof data.diceSystemId !== "string" ||
      typeof data.diceSystemHelp !== "string"
    ) {
      throw new Error("GuildConfig 형식이 올바르지 않습니다.");
    }

    return data as GuildConfig;
  } catch (err) {
    console.warn(
      `[cache] 서버 설정 파싱 실패:`,
      err instanceof Error ? err.message : err,
    );

    return null;
  }
}
