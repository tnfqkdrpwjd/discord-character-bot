import type { TextChannel, Webhook } from "discord.js";

const webhookCache = new Map<string, Webhook>();

/** 채널별 webhook을 캐싱해서 재사용합니다. (채널당 최대 15개 제한 회피) */
export async function getChannelWebhook(channel: TextChannel, botUserId: string): Promise<Webhook> {
  const cached = webhookCache.get(channel.id);
  if (cached) return cached;

  const hooks = await channel.fetchWebhooks();
  let webhook = hooks.find((h) => h.owner?.id === botUserId);

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: "character-relay",
      reason: "캐릭터 대사 치환 기능용 webhook",
    });
  }

  webhookCache.set(channel.id, webhook);
  return webhook;
}
