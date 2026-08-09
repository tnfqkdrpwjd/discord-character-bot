import type {
  CharacterRecord,
  Character,
  GuildConfig,
  GuildConfigRecord,
} from '../types.js';

// ========================================
// Character Cache
// guildId -> (캐릭터 name -> record)
// ========================================

const guildCaches = new Map<string, Map<string, CharacterRecord>>();

// ========================================
// Guild Config Cache
// guildId -> 서버 설정
// ========================================

const guildConfigs = new Map<string, GuildConfigRecord>();

// ========================================
// Character Cache
// ========================================

function getGuildCache(guildId: string) {
  let cache = guildCaches.get(guildId);

  if (!cache) {
    cache = new Map();
    guildCaches.set(guildId, cache);
  }

  return cache;
}

export function getAllCharacters(guildId: string): CharacterRecord[] {
  return [...getGuildCache(guildId).values()];
}

export function findByName(
  guildId: string,
  name: string,
): CharacterRecord | undefined {
  return getGuildCache(guildId).get(name);
}

export function upsertCache(
  guildId: string,
  key: string,
  messageId: string,
  data: Character,
) {
  getGuildCache(guildId).set(key, {
    messageId,
    data,
  });
}

export function removeCache(guildId: string, key: string) {
  getGuildCache(guildId).delete(key);
}

export function clearGuildCache(guildId: string) {
  guildCaches.delete(guildId);
}

// ========================================
// Guild Config Cache
// ========================================

export function getGuildConfig(guildId: string): GuildConfigRecord | undefined {
  return guildConfigs.get(guildId);
}

export function setGuildConfig(
  guildId: string,
  messageId: string,
  data: GuildConfig,
) {
  guildConfigs.set(guildId, {
    messageId,
    data,
  });
}

export function clearGuildConfig(guildId: string) {
  guildConfigs.delete(guildId);
}
