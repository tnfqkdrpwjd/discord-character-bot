import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./config.js";
import { registerReadyEvent } from "./events/ready.js";
import { registerGuildCreateEvent } from "./events/guildCreate.js";
import { registerInteractionEvent } from "./events/interactionCreate.js";
import { registerMessageEvent } from "./events/messageCreate.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

registerReadyEvent(client);
registerGuildCreateEvent(client);
registerInteractionEvent(client);
registerMessageEvent(client);

client.login(config.token);
