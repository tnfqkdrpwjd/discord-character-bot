# discord-character-bot

DB 없이, **서버(길드)마다 자동으로 만들어지는 전용 채널**의 메시지를 저장소로 사용하는 캐릭터 관리 봇입니다.

## 구조

```
src/
├── index.ts                  # 봇 시작점
├── config.ts                  # 환경변수
├── types.ts                    # Character, CharacterClipboardData 타입
├── schema.ts                    # zod 검증 스키마
├── deploy-commands.ts            # 슬래시 커맨드 등록 스크립트
├── store/
│   ├── cache.ts                # 서버별(guildId) 메모리 캐시
│   └── channelStore.ts          # 서버별 데이터 채널 자동 생성 / 읽기 / 쓰기 / 이미지 첨부
├── commands/
│   ├── character.ts             # /캐릭터 등록 · 목록 · 삭제
│   ├── palette.ts                # /팔레트 캐릭터:.. 명령어:.. (자동완성 검색 후 즉시 전송)
│   ├── say.ts                     # /대사 캐릭터:.. 내용:.. (캐릭터로 바로 대사 전송)
│   └── autocomplete.ts             # 캐릭터 이름 자동완성 공통 로직
├── interactions/
│   ├── modals.ts                  # JSON(텍스트/파일) + 이미지 등록 모달 처리
│   └── selects.ts                  # 권한 멤버 선택 처리
├── events/
│   ├── ready.ts                    # 시작 시 봇이 속한 모든 서버의 캐시 로딩
│   ├── guildCreate.ts               # 새 서버에 초대되면 자동으로 채널 준비
│   ├── interactionCreate.ts         # 인터랙션 라우팅
│   └── messageCreate.ts             # 텍스트 트리거(`이름> 대사`)로 대사 치환
└── webhook/
    └── webhookManager.ts            # 채널별 webhook 캐싱
```

## 캐릭터 데이터 형식

```json
{
  "kind": "character",
  "data": {
    "name": "",
    "initiative": 0,
    "status": [],
    "params": [],
    "commands": "",
    "permittedUserIds": []
  }
}
```

- `status`: 변하는 수치 (체력, MP 등). `{ "label": "HP", "value": 42, "max": 42 }`. `value`만 있고 `max`가 없으면 `value`와 같은 값으로 채워집니다.
- `params`: 안 변하는 수치/설명 (근력, 특기 등). `{ "label": "근력", "value": "16" }`
- `commands`: 채팅 팔레트, 줄바꿈(`\n`)으로 구분
- `permittedUserIds`: 보통 직접 입력할 필요 없음 (등록 후 권한 선택 단계에서 자동으로 채워짐)
- 이미지는 JSON에 넣지 않고, 등록 모달에서 **파일로 첨부**합니다.

## 동작 방식 (중요)

- 채널 ID를 `.env`에 직접 넣지 않습니다. 봇이 각 서버 안에서 `DATA_CHANNEL_NAME`(기본값 `character-data-store`) 채널을 찾고, 없으면 자동 생성합니다.
- 캐릭터 데이터(JSON)와 프로필 이미지는 **같은 메시지의 첨부파일 두 개**(`character.json`, `avatar.*`)로 저장됩니다.
- 프로필 이미지 URL은 캐시에 고정 저장하지 않고, 대사/팔레트를 보낼 때마다 채널에서 메시지를 다시 조회해 **그 시점의 유효한 링크**를 가져옵니다.
- 캐릭터 데이터는 `guildId`별로 캐시가 분리되어 다른 서버 데이터와 섞이지 않습니다.

## 시작하기

1. `npm install`
2. `.env.example`을 `.env`로 복사 후 값 채우기
   - `DISCORD_TOKEN`, `CLIENT_ID`: 디스코드 개발자 포털에서 확인
   - `GUILD_ID`: (선택) 테스트 중인 서버 ID를 넣으면 커맨드가 즉시 반영됩니다. 비워두면 전역 등록(최대 1시간 소요, 대신 모든 서버에서 동작)
   - `DATA_CHANNEL_NAME`: (선택) 자동 생성될 채널 이름, 기본값 그대로 써도 무방
3. `npm run deploy` — 슬래시 커맨드 등록 (최초 1회 및 커맨드 변경 시)
4. `npm run dev` — 개발 모드로 봇 실행

## 사용법

### 캐릭터 등록

`/캐릭터 등록` → 모달에 3가지 입력란이 뜹니다.

1. **캐릭터 JSON (직접 입력)**: 4000자 이하면 여기에 붙여넣기
2. **캐릭터 JSON 파일**: 텍스트가 4000자를 넘으면 `.json` 파일로 첨부 (있으면 이게 텍스트보다 우선 적용)
3. **프로필 이미지**: 이미지 파일 첨부 (선택, 비우면 기존 이미지 유지)

저장 완료 후 이어지는 메뉴에서 권한을 가질 멤버를 선택하면 등록이 끝납니다.

### 캐릭터로 말하기 (2가지 방법)

- **슬래시 커맨드**: `/대사 캐릭터:이름 내용:하고싶은 말` → 바로 그 캐릭터 이름/이미지로 전송
- **텍스트 트리거**: 채팅창에 `이름> 대사내용` 형식으로 입력 → 원래 메시지는 지워지고 캐릭터 이름/이미지로 대신 전송

### 채팅 팔레트 불러오기

`/팔레트 캐릭터:이름 명령어:` → 명령어 칸에 타이핑하면 그 캐릭터의 팔레트 중 일치하는 항목이 자동완성으로 좁혀져서 나오고, 고르면 즉시 전송됩니다.

### 기타

- `/캐릭터 목록`, `/캐릭터 삭제 이름:...`

## 필요 권한 (봇 역할)

- **Manage Channels** (서버마다 데이터 채널을 자동 생성하기 위해 필요)
- **Attach Files** (캐릭터 JSON·이미지를 첨부파일로 저장하기 위해 필요)
- Manage Webhooks
- Manage Messages (대사 치환 시 원본 메시지 삭제용)
- Send Messages, Read Message History
- Use Application Commands

## 참고

- 캐릭터 데이터는 각 서버의 `DATA_CHANNEL_NAME` 채널에 캐릭터당 메시지 1개(JSON + 이미지 첨부파일)로 저장됩니다.
- 이미지 없이 등록해도 되고, 나중에 같은 이름으로 다시 등록할 때 이미지를 첨부 안 하면 기존 이미지가 유지됩니다.
