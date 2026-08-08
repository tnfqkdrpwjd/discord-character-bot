import type {
  CharacterRecord,
  Character,
  guildConfigs,
  GuildConfigRecord,
} from '../types.js';

// guildId -> (캐릭터 name -> record)
const guildCaches = new Map<string, Map<string, CharacterRecord>>();
const guildConfigs = new Map<string, GuildConfigRecord>();

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
  getGuildCache(guildId).set(key, { messageId, data });
}

export function removeCache(guildId: string, key: string) {
  getGuildCache(guildId).delete(key);
}

export function clearGuildCache(guildId: string) {
  getGuildCache(guildId).clear();
}
