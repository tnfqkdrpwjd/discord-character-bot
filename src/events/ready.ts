import type { Client } from "discord.js";
import { Events } from "discord.js";
import { loadCacheForGuild } from "../store/channelStore.js";

export function registerReadyEvent(client: Client) {
  client.once(Events.ClientReady, async (c) => {
    console.log(`로그인 완료: ${c.user.tag}`);

    const guilds = await c.guilds.fetch();
    for (const partialGuild of guilds.values()) {
      try {
        const guild = await partialGuild.fetch();
        await loadCacheForGuild(guild); // 채널이 없으면 자동 생성 후 로드
      } catch (err) {
        console.error(`[ready] '${partialGuild.name}' 서버 초기화 실패:`, err);
      }
    }
  });
}
