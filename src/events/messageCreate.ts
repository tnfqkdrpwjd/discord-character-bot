import type { Client, TextChannel } from "discord.js";
import { Events } from "discord.js";
import { findByName } from "../store/cache.js";
import { getCurrentAvatarUrl } from "../store/channelStore.js";
import { getChannelWebhook } from "../webhook/webhookManager.js";

// 트리거 형식: 캐릭터이름> 대사내용
const DIALOGUE_PATTERN = /^(\S+)>\s*([\s\S]+)$/;

export function registerMessageEvent(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return; // DM 등은 무시, 서버 메시지만 처리

    const match = message.content.match(DIALOGUE_PATTERN);
    if (!match) return;

    const [, key, line] = match;
    const record = findByName(message.guildId, key);
    if (!record) return;

    // 권한 없는 유저는 조용히 무시
    if (!record.data.permittedUserIds.includes(message.author.id)) return;

    const channel = message.channel as TextChannel;
    try {
      const avatarURL = await getCurrentAvatarUrl(message.guild, record);
      const webhook = await getChannelWebhook(channel, client.user!.id);
      await message.delete().catch(() => {});
      await webhook.send({ content: line, username: record.data.name, avatarURL });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[dialogue] 전송 실패 (캐릭터: ${key}): ${reason}`);
    }
  });
}
