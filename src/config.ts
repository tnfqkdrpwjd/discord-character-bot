import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `환경변수 ${name}가 설정되지 않았습니다. .env 파일을 확인하세요.`,
    );
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  // 있으면 해당 서버에만 슬래시 커맨드를 즉시 등록(테스트용), 없으면 전역 등록(최대 1시간 소요)
  guildId: process.env.GUILD_ID || undefined,
  // 서버마다 이 이름의 채널을 자동으로 찾거나 생성해서 데이터 저장소로 사용
  dataChannelName: process.env.DATA_CHANNEL_NAME || "dicebot-data-store",
  bcDiceApiUrl: required("BCDICE_API_URL"),
};
