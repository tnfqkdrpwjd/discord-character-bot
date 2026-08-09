import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { characterCommand } from "./commands/character.js";
import { paletteCommand } from "./commands/palette.js";
import { sayCommand } from "./commands/say.js";
import { statCommand } from "./commands/stat.js";
import { diceCommand } from "./commands/dice.js";

const commands = [
  characterCommand.toJSON(),
  paletteCommand.toJSON(),
  sayCommand.toJSON(),
  statCommand.toJSON(),
  diceCommand.toJSON(),
];
const rest = new REST().setToken(config.token);

(async () => {
  console.log("슬래시 커맨드 등록 중...");
  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );
    console.log(`길드(${config.guildId}) 전용으로 등록 완료 (즉시 반영)`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), {
      body: commands,
    });
    console.log(
      "전역 등록 완료 (모든 서버 반영까지 최대 1시간 소요될 수 있음)",
    );
  }
})();
