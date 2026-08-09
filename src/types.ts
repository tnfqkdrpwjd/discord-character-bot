export type CharacterClipboardData = {
  kind: 'character';
  data: Partial<Character>;
};

export type Character = {
  name: string;
  memo: string;
  initiative: number;
  status: {
    label: string;
    value: number;
    max: number;
  }[]; // 수정되는 파라메터: 체력, MP 등
  params: { label: string; value: string }[]; // 변동되지 않는 파라메터: 근력 등
  commands: string[]; // 채팅 팔레트, 줄 하나가 항목 하나
  permittedUserIds: string[]; // 이 캐릭터를 다룰 수 있는 디스코드 유저 ID 목록
};
// 프로필 이미지는 JSON 필드가 아니라, 데이터 메시지에 첨부파일(avatar.*)로 별도 저장됩니다.

export type CharacterRecord = {
  messageId: string;
  data: Character;
};

//게임시스템 저장
export interface GameSystem {
  id: string;
  name: string;
  sort_key: string;
}

export type GameSystemDetail = {
  ok: boolean;
  id: string;
  name: string;
  sort_key: string;
  command_pattern: string;
  help_message: string;
};

// BCDice
export type DiceRollResponse = {
  ok: boolean;
  text: string;
  secret: boolean;
  success: boolean;
  failure: boolean;
  critical: boolean;
  fumble: boolean;
  rands: {
    kind: string;
    sides: number;
    value: number;
  }[];
};

export type GameSystemResponse = {
  game_system: GameSystem[];
};

export type DiceRand = {
  kind: string;
  sides: number;
  value: number;
};

//서버설정 저장
export type GuildConfig = {
  diceSystemId: string;
  diceSystemName: string;
  diceSystemHelp: string;
  diceSystemCommandPattern: string;
};

export type GuildConfigRecord = {
  messageId: string;
  data: GuildConfig;
};
