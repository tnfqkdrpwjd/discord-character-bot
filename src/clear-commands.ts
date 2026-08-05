import { REST, Routes } from 'discord.js';
import { config } from './config.js';

const rest = new REST().setToken(config.token);

(async () => {
  await rest.put(Routes.applicationCommands(config.clientId), { body: [] });

  console.log('모든 전역 명령 삭제 완료');
})();
