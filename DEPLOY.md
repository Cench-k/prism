# Prism 소규모 배포 가이드

소수 인원(가족·친구 5~10명)과 공유하기 위한 무료 티어 배포 구성.

| 레이어 | 서비스 | 비용 |
|---|---|---|
| 프론트엔드 | Vercel (Hobby) | 무료 |
| 백엔드 | **Render Free** (또는 Railway) | 영구 무료 (15분 무활동 시 sleep) |
| 데이터베이스 | MongoDB Atlas M0 | 무료 (512MB) |
| 수집 스케줄러 | GitHub Actions cron | 무료 |

> 인증 없이 공개됨. URL을 아는 사람은 누구나 접근 가능. 비공개가 필요해지면 Cloudflare Access 또는 Next.js middleware 비밀번호 게이트를 추후 추가.

---

## 0. 사전 준비

- GitHub 계정
- 이 프로젝트를 GitHub 리포지토리에 푸시 (`prism` private 권장)
- Anthropic API 키 (https://console.anthropic.com/)

```bash
cd C:/Users/USER/Documents/prism
git init
git add .
git commit -m "Initial Prism scaffold"
git branch -M main
git remote add origin https://github.com/<your>/prism.git
git push -u origin main
```

---

## 1. MongoDB Atlas (10분)

1. https://www.mongodb.com/cloud/atlas → 계정 생성
2. **Build a Database** → **M0 Free** 선택
3. Cloud Provider: AWS, Region은 한국이면 `ap-northeast-2 (Seoul)` 또는 `ap-northeast-1 (Tokyo)`
4. Cluster 이름: `prism-cluster`
5. **Database Access** → 새 사용자 생성 (예: `prism`, 강한 비밀번호 메모)
6. **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow from anywhere) 선택
   - Railway는 IP 고정이 어려우므로 전 IP 허용. 권한은 DB 사용자/비밀번호로만 보호
7. **Connect** → **Drivers** → Python → URI 복사
   - 형식: `mongodb+srv://prism:<password>@prism-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - `<password>` 자리에 실제 비밀번호 채우기
8. 메모해둘 값: `MONGO_URI`, `MONGO_DB=prism`

---

## 2. 백엔드 배포 — 옵션 선택

### 옵션 A: Render Free (권장, 영구 무료)

15분 무활동 시 슬립되어 첫 접속자가 30초 정도 기다리지만, GitHub Actions cron이 매시간 깨워주므로 실사용에선 거의 체감 안 됨.

1. https://render.com → GitHub 로그인
2. **New** → **Blueprint** → `prism` 리포 선택
3. [render.yaml](render.yaml) 자동 감지 → 서비스 1개 생성
4. **Environment** 탭에서 `sync: false` 로 표시된 시크릿 값 채우기:
   - `MONGO_URI` = (Atlas URI)
   - `ANTHROPIC_API_KEY` = (Anthropic 콘솔)
   - `CORS_ORIGINS` = (Vercel 도메인 확정 후 갱신, 일단 `https://*.vercel.app`)
   - `INGEST_TOKEN` 은 `generateValue: true` 라 자동 생성됨 — 값을 복사해 따로 메모
5. 배포 완료 후 도메인 발급: `https://prism-backend.onrender.com` 형태
6. 헬스체크: `curl https://prism-backend.onrender.com/health`

**Cold start 회피 팁**: GitHub Actions cron 주기를 `0 */1 * * *` (매시간) 그대로 두면 1시간마다 깨어남. 더 적극적으로 깨어 있게 하고 싶다면 별도 keep-alive 워크플로(예: 10분마다 `/health` ping)를 추가할 수 있지만 Render 약관상 권장하지 않음.

### 옵션 B: Railway ($5 크레딧 후 ~$3/월)

1. https://railway.app → GitHub 로그인
2. **New Project** → **Deploy from GitHub repo** → `prism` 선택
3. 첫 배포는 monorepo 인식 못 할 수 있으므로:
   - 프로젝트 생성 후 **Settings → Service Settings** 들어가서
   - **Root Directory**: `backend`
   - **Build Command**: 비워둠 (nixpacks 자동)
   - **Start Command**: 비워둠 (railway.json 사용)
4. **Variables** 탭에서 환경변수 등록:
   - `MONGO_URI` = (Atlas에서 받은 URI)
   - `MONGO_DB` = `prism`
   - `ANTHROPIC_API_KEY` = (Anthropic 콘솔)
   - `ANTHROPIC_MODEL` = `claude-haiku-4-5-20251001`
   - `INGEST_TOKEN` = (긴 랜덤 문자열, 예: `openssl rand -hex 32` 결과)
   - `CORS_ORIGINS` = (일단 `https://*.vercel.app` — Vercel 도메인 확정 후 정확한 값으로 교체)
5. **Settings → Networking → Generate Domain** 클릭 → 백엔드 공개 URL 발급
   - 예: `https://prism-backend-production.up.railway.app`
   - 메모: `RAILWAY_URL`
6. 헬스체크 확인:
   ```
   curl https://prism-backend-production.up.railway.app/health
   ```
   → `{"status":"ok"}` 가 떠야 정상

### 옵션 C: Koyeb / Fly.io (대안)

- **Koyeb Free** — always-on, sleep 없음. https://app.koyeb.com → GitHub 연결 → `backend` 디렉토리 지정 → Procfile 자동 감지
- **Fly.io** — 도쿄 region으로 한국에서 가장 빠름. 신용카드 등록은 필요(과금은 무료 한도 안에서)
  ```
  cd backend
  fly launch --region nrt
  fly secrets set MONGO_URI=... ANTHROPIC_API_KEY=... INGEST_TOKEN=...
  fly deploy
  ```

---

## 3. Vercel 프론트엔드 배포 (5분)

1. https://vercel.com → GitHub 로그인 → **Add New Project** → `prism` 리포 선택
2. **Configure Project**:
   - **Root Directory**: `frontend` (중요)
   - Framework Preset: Next.js (자동 인식)
   - Build & Output: 기본값 그대로
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_BASE` = `https://prism-backend-production.up.railway.app` (Railway URL)
4. **Deploy** → 1~2분 후 배포 완료
   - 예: `https://prism-xyz.vercel.app`
   - 메모: `VERCEL_URL`

### CORS 다시 설정

배포된 Vercel URL을 백엔드 환경변수에 반영:

1. Render(또는 Railway) → Environment → `CORS_ORIGINS` 를 실제 Vercel URL로 교체
   - 예: `CORS_ORIGINS=https://prism-xyz.vercel.app`
   - 여러 개면 콤마로 구분
2. 자동 재배포 트리거됨

---

## 4. GitHub Actions 수집 cron (3분)

1. GitHub 리포 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. 다음 두 개 등록:
   - `PRISM_API_BASE` = 백엔드 URL (Render: `https://prism-backend.onrender.com` / Railway: `https://prism-backend-production.up.railway.app`)
   - `PRISM_INGEST_TOKEN` = 백엔드에 설정된 `INGEST_TOKEN` 과 동일한 값 (Render Blueprint가 자동 생성한 값을 확인하거나 직접 설정)
3. **Actions** 탭 → `Prism ingest` 워크플로 → **Run workflow** 로 첫 수집 즉시 실행
4. 이후 매시간 자동 실행 (`.github/workflows/ingest.yml` 의 cron: `0 * * * *`)

수동 트리거(특정 카테고리만): `workflow_dispatch` 입력에 `crypto` 등 입력.

---

## 5. 동작 확인

- `https://prism-xyz.vercel.app` 에 접속 → 매거진 카드 노출
- 위로 스와이프 → 글래스모피즘 요약 패널 + 시세 위젯
- 모바일에서도 동일하게 작동 (PWA처럼 홈화면에 추가 가능)

문제 발생 시:
- 빈 화면 + "기사가 없습니다" → Actions 수집이 아직 안 돌았거나, Atlas IP 화이트리스트 확인
- CORS 에러 → Railway `CORS_ORIGINS` 에 Vercel 도메인 정확히 포함됐는지
- 5xx → Railway 로그 (Deployments → 최신 배포 → Logs) 확인

---

## 운영 팁

- **수집 빈도 조정**: 매시간이 과하면 `.github/workflows/ingest.yml` 의 `cron`을 `0 */3 * * *`(3시간마다) 등으로 변경
- **Atlas 용량 관리**: 무료 512MB는 텍스트 기준 수만 건 가능. 오래된 기사를 정리하려면 별도 cleanup 워크플로 추가
- **비용 모니터링**: Railway 사용량은 Dashboard에서 확인. 트래픽 늘면 Atlas M2로 업그레이드 검토
- **사용자별 개인화** 단계로 가면: Auth.js (이메일 매직링크) 또는 Clerk 도입 + Mongo에 `users` 컬렉션 추가

---

## 향후 비공개로 전환하려면

가장 가벼운 옵션: **Cloudflare Access** (이메일 화이트리스트 + OTP, 무료)
1. Cloudflare에 도메인 등록
2. Vercel 도메인을 Cloudflare CNAME으로 프록시
3. Cloudflare Zero Trust → Access → Application 생성 → 화이트리스트 이메일 등록

코드 변경 없이 게이트가 붙음.
