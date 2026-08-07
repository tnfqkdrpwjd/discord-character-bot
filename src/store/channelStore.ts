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
  upsertCache,
  removeCache,
  findByName,
  getAllCharacters,
} from "./cache.js";
import type { Character, CharacterRecord } from "../types.js";

// 메시지 본문(2000자 제한) 대신 첨부파일로 JSON을 저장합니다.
const JSON_ATTACHMENT_NAME = "character.json";
const AVATAR_ATTACHMENT_PREFIX = "avatar";

/** 서버별 데이터 채널을 찾거나, 없으면 새로 만듭니다. (읽기/쓰기 모두 이 채널 하나만 사용) */
export async function getOrCreateDataChannel(
  guild: Guild,
): Promise<TextChannel> {
  await guild.channels.fetch(); // 캐시 최신화
  const existing = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText && ch.name === config.dataChannelName,
  ) as TextChannel | undefined;

  const botMember = guild.members.me ?? (await guild.members.fetchMe());

  if (existing) {
    // 채널이 예전에 만들어졌거나 수동으로 만들어진 경우 봇 권한이 빠져있을 수 있어 매번 보정
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
      "캐릭터 데이터 저장 전용 채널입니다. 봇이 자동 관리하니 직접 수정/삭제하지 마세요.",
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
  if (!attachment) return null;
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

/** 특정 서버의 데이터 채널을 읽어 해당 서버 캐시를 채웁니다. */
export async function loadCacheForGuild(guild: Guild) {
  const channel = await getOrCreateDataChannel(guild);
  clearGuildCache(guild.id);

  const messages = await channel.messages.fetch({ limit: 50 });
  for (const msg of messages.values()) {
    const parsed = await readCharacterFromMessage(msg);
    if (parsed) upsertCache(guild.id, parsed.name, msg.id, parsed);
  }
  console.log(
    `[cache] ${guild.name}: ${getAllCharacters(guild.id).length}개 캐릭터 로드 완료`,
  );
}

/**
 * 캐릭터를 새로 만들거나 기존 것을 수정합니다.
 * image를 주면 그걸로 프로필을 교체하고, 안 주면 기존에 있던 이미지를 그대로 유지합니다.
 * previousName을 주면 그 이름의 기존 캐릭터를 찾아 덮어쓰고(이름 변경 포함), 캐시 키도 새 이름으로 옮깁니다.
 */
export async function saveCharacter(
  guild: Guild,
  data: Character,
  image?: { buffer: Buffer; fileName: string },
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
    await msg.edit({ content: caption, files, attachments: [] });
    if (previousName && previousName !== data.name)
      removeCache(guild.id, previousName);
    upsertCache(guild.id, data.name, msg.id, data);
    return existing.messageId;
  }

  const msg = await channel.send({ content: caption, files });
  upsertCache(guild.id, data.name, msg.id, data);
  return msg.id;
}

export async function deleteCharacter(guild: Guild, name: string) {
  const existing = findByName(guild.id, name);
  if (!existing) return false;
  const channel = await getOrCreateDataChannel(guild);
  const msg = await channel.messages
    .fetch(existing.messageId)
    .catch(() => null);
  if (msg) await msg.delete().catch(() => {});
  removeCache(guild.id, name);
  return true;
}

/**
 * 캐릭터의 현재 유효한 이미지 URL을 가져옵니다.
 * 디스코드 첨부파일 링크는 시간이 지나면 만료될 수 있어, 매번 채널에서 메시지를 새로 조회해 최신 링크를 반환합니다.
 */
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
