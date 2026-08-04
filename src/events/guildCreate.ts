import type { Client } from "discord.js";
import { Events } from "discord.js";
import { loadCacheForGuild } from "../store/channelStore.js";

/** 봇이 새 서버에 초대되었을 때, 그 서버의 데이터 채널을 자동으로 준비합니다. */
export function registerGuildCreateEvent(client: Client) {
  client.on(Events.GuildCreate, async (guild) => {
    console.log(`[guild] 새 서버 참가: ${guild.name}`);
    await loadCacheForGuild(guild);
  });
}
