# 릴리스 & OIDC(Trusted Publishing) 전환

## 평상시 릴리스 흐름

```bash
pnpm changeset          # 변경분 기록
git push                # main 에 푸시
# → CI가 "chore: version packages" PR을 자동 생성
# → 그 PR을 머지
# → CI가 자동으로 build + 발행 + git 태그
```

## OIDC 전환 상태 (2026-08 기준)

`release.yml`에 `id-token: write` 권한과 npm CLI 강제 업그레이드(`npm install -g
npm@latest`, ≥11.5.1 필요)를 이미 넣어뒀습니다. **이건 안전한 변경입니다** — npm의
OIDC 감지는 "해당 패키지에 trusted publisher가 등록돼 있으면 OIDC 사용, 없으면
그냥 기존 `NPM_TOKEN`으로 폴백"하는 방식이라([npm/cli#8336](https://github.com/npm/cli/pull/8336)
원문: *"gracefully falls back to traditional authentication methods when OIDC
isn't available"*), 아래 npm 웹 설정을 하기 전까지는 지금처럼 토큰으로 계속
발행되고, 설정을 마친 패키지부터 자동으로 OIDC로 넘어갑니다.

### 남은 작업: npm 웹에서 패키지별로 Trusted Publisher 등록 (사람이 해야 함)

이건 npm 계정 로그인 세션이 필요해서 AI가 대신 할 수 없습니다. 8개 패키지 각각
아래 페이지에서 등록하세요:

```
https://www.npmjs.com/package/<패키지명>/access
```

(또는 패키지 페이지 → **Settings** 탭 → **Trusted Publisher** 섹션)

각 패키지에서 **"Add trusted publisher"** → **GitHub Actions** 선택 후 정확히
이 값을 입력:

| 필드 | 값 |
|---|---|
| Organization or user | `HOONY-LEE` |
| Repository | `softium-ui` |
| Workflow filename | `release.yml` (경로 없이 파일명만) |
| Environment name | *(비워둠)* |

등록할 패키지 8개:
```
@softium/styles
@softium/table-core
@softium/table-react
@softium/table-styles
@softium/sheet
@softium/calendar
@softium/ui
softium-ui
```

### 검증 방법

전부 등록한 뒤 다음 릴리스(어떤 patch 변경이든)에서 CI 로그에
`npm notice Publishing ... with tag latest` 뒤에 `--provenance` 관련 문구나
프로비넌스 배지가 붙으면 OIDC 경로를 탄 것입니다. 여전히 `NPM_TOKEN`으로만
찍혀 나오면 그 패키지는 아직 미등록이거나 등록값이 안 맞는 것이니 위 표를
다시 확인하세요.

### 전부 등록·검증 끝나면 (선택)

`NPM_TOKEN` 시크릿은 안전망으로 계속 남겨둬도 무방합니다(OIDC가 실패해도 토큰이
있으면 자동으로 그걸로 폴백). 다만 npmjs.com 상단 배너가 예고한 대로 **2027년
1월부터 bypass-2FA 토큰의 직접 발행 자체가 제한**될 예정이라, 그 전에 토큰
Expiration이 지나도 갱신하지 말고 자연 만료시키는 쪽을 권장합니다.

## 알려진 리스크 (pnpm + OIDC)

`pnpm publish`는 내부적으로 PATH에서 찾은 `npm publish`를 그대로 호출하는
방식이라, pnpm 자체가 아니라 **실행 시점의 npm CLI 버전**이 OIDC 지원 여부를
결정합니다. 커뮤니티에 pnpm 11.x + OIDC 조합에서 간헐적으로 실패했다는 보고가
있었고([pnpm/pnpm#11513](https://github.com/pnpm/pnpm/issues/11513)), 대부분
`pnpm/action-setup`을 최신으로 올리거나 npm CLI를 명시적으로 업그레이드해서
해결됐습니다 — 이 저장소도 그 두 가지를 이미 반영했습니다. 그래도 혹시 실제
릴리스에서 OIDC만 시도하다 실패하는 로그가 보이면(토큰 폴백 없이 하드 실패하는
경우), 이슈를 남기고 당분간 토큰 방식으로 되돌리면 됩니다.

⚠️ **실제로 겪은 사고 (2026-08-31)**: npm CLI 강제 업그레이드를 처음엔
`npm install -g npm@latest`로 넣었는데, 그게 그 시점의 최신 **메이저**인 npm
12.0.2를 끌어왔고, 그게 `@changesets/cli`의 "이미 발행된 버전인지" 사전 체크
(`npm info`)를 깨뜨렸습니다 — 그 결과 CI가 8개 패키지 전부를 "안 바뀐 버전"인데도
재발행하려 시도했고, 레지스트리가 전부 거부해서 릴리스가 통째로 실패했습니다
(다행히 실제 발행은 하나도 안 나갔고, 레지스트리 상태도 그대로였음 — 거부당한
것뿐). 그래서 `npm@latest`가 아니라 **`npm@^11.5.1`**(11.x 계열 고정, 메이저
점프 방지)로 바꿨습니다. **npm CLI 버전을 이 워크플로에서 다시 건드릴 일이
있으면, `@latest`로 메이저를 자동 추종하게 두지 말고 항상 특정 메이저 범위로
고정하세요.**
