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
│   ├── modals.ts                  # JSON 붙여넣기 모달 처리
│   └── selects.ts                  # 권한 멤버 선택 + 이후 이미지 첨부 수집
├── events/
│   ├── ready.ts                    # 시작 시 봇이 속한 모든 서버의 캐시 로딩
│   ├── guildCreate.ts               # 새 서버에 초대되면 자동으로 채널 준비
│   ├── interactionCreate.ts         # 인터랙션 라우팅
│   └── messageCreate.ts             # 텍스트 트리거(`이름> 대사`)로 대사 치환
└── webhook/
    └── webhookManager.ts            # 채널별 webhook 캐싱
```

## 동작 방식 (중요)

- 채널 ID를 `.env`에 직접 넣지 않습니다. 봇이 각 서버 안에서 `DATA_CHANNEL_NAME`(기본값 `character-data-store`) 채널을 찾고, 없으면 자동 생성합니다.
- 캐릭터 데이터(JSON)와 프로필 이미지는 **같은 메시지의 첨부파일 두 개**(`character.json`, `avatar.*`)로 저장됩니다.
- 프로필 이미지 URL은 캐시에 고정 저장하지 않고, 대사/팔레트를 보낼 때마다 채널에서 메시지를 다시 조회해 **그 시점의 유효한 링크**를 가져옵니다. (디스코드 첨부파일 링크는 시간이 지나면 만료될 수 있어서 이렇게 처리합니다.)
- 캐릭터 데이터는 `guildId`별로 캐시가 분리되어 다른 서버 데이터와 섞이지 않습니다.

## 시작하기

1. `npm install`
2. `.env.example`을 `.env`로 복사 후 값 채우기
   - `DISCORD_TOKEN`, `CLIENT_ID`: 디스코드 개발자 포털에서 확인
   - `GUILD_ID`: (선택) 테스트 중인 서버 ID를 넣으면 커맨드가 즉시 반영됩니다. 비워두면 전역 등록(최대 1시간 소요, 대신 모든 서버에서 동작)
   - `DATA_CHANNEL_NAME`: (선택) 자동 생성될 채널 이름, 기본값 그대로 써도 무방
3. `npm run deploy` — 슬래시 커맨드 등록 (최초 1회 및 커맨드 변경 시)
4. `npm run dev` — 개발 모드로 봇 실행 → 봇이 속한 모든 서버를 돌면서 데이터 채널을 자동으로 찾거나 생성합니다.

## 사용법

### 캐릭터 등록

1. `/캐릭터 등록` → 모달이 뜨면 아래 형식으로 JSON을 붙여넣기

   ```json
   {
     "kind": "character",
     "data": {
       "name": "전사 김OO",
       "memo": "메모",
       "initiative": 5,
       "externalUrl": "",
       "imageUrl": "",
       "status": [{ "label": "HP", "value": 42, "max": 42 }],
       "params": [{ "label": "근력", "value": "16" }],
       "commands": "1d20+5 공격\n1d6+3 데미지"
     }
   }
   ```

2. 저장 완료 후 이어지는 메뉴에서 **권한을 가질 멤버 선택**
3. 그 다음 60초 안에 **채팅창에 이미지를 첨부해서 전송** (건너뛰려면 `건너뛰기`라고 입력)

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
- Manage Messages (대사 치환 시 원본 메시지 삭제, 이미지 수집 메시지 삭제용)
- Send Messages, Read Message History
- Use Application Commands

## 참고

- 캐릭터 데이터는 각 서버의 `DATA_CHANNEL_NAME` 채널에 캐릭터당 메시지 1개(JSON + 이미지 첨부파일)로 저장됩니다.
- 이미지 없이 등록해도 되고, 나중에 `/캐릭터 등록`으로 같은 이름을 다시 저장하면 이미지 첨부는 유지된 채 JSON만 갱신됩니다.
