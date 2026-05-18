# Prism

> 세상의 모든 이슈를, 노이즈 없이 당신만의 매거진으로.

설치 없는 모바일 매거진형 이슈 뷰어. 다양한 소스를 자동 수집·요약하여 풀 커버 카드 형식으로 보여줍니다.

## 아키텍처

```
prism/
├── backend/          # FastAPI + Python — 수집 파이프라인, AI 요약, REST API
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/articles.py       # /api/articles, /api/widgets/crypto
│   │   ├── collectors/           # RSS 등 수집기 (config-driven)
│   │   ├── services/             # AI 요약, 시세 위젯
│   │   ├── models/               # Pydantic 스키마
│   │   └── db/mongo.py           # Motor async client
│   ├── config/sources.json       # 수집 대상 선언
│   └── scripts/ingest.py         # 수집 실행
└── frontend/         # Next.js 14 (App Router) + Tailwind + Framer Motion
    └── src/
        ├── app/                  # 라우팅, 글로벌 스타일
        ├── components/           # MagazineCard, SummaryPanel, CryptoWidget
        ├── lib/api.ts            # 백엔드 API 클라이언트
        └── types/article.ts
```

## 현재 MVP 스코프

**수직 슬라이스 1개**: 암호화폐 카테고리 → RSS 3개 소스(CoinDesk, Cointelegraph, Decrypt) → MongoDB → Claude Haiku 4.5 요약 → REST API → 풀 커버 카드 + 위로 스와이프 시 글래스모피즘 요약 패널 + 실시간 BTC/ETH/DOGE 시세 위젯.

다음 단계는 카테고리 확장(부동산 경매, 개발/IT, 글로벌 뉴스, 동물·밈), 그리고 버블 온보딩 + 개인화 피드.

## 사전 준비

- Python 3.11+
- Node.js 20+
- MongoDB 6+ (로컬 또는 Atlas)
- Anthropic API 키 (AI 요약용 — 없어도 기사 수집은 동작, 요약만 누락)

## 백엔드 실행

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows
pip install -r requirements.txt
copy .env.example .env           # 키 입력
python -m scripts.ingest --category crypto   # 첫 수집
uvicorn app.main:app --reload --port 8000
```

확인:
- http://localhost:8000/health
- http://localhost:8000/api/articles?category=crypto

## 프론트엔드 실행

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

http://localhost:3000 접속.

## 소수 인원과 공유하기 (배포)

Vercel(프론트) + Railway(백엔드) + MongoDB Atlas(DB) + GitHub Actions(수집 cron) 무료 티어 조합. 상세 단계는 [DEPLOY.md](DEPLOY.md).

## 다음 작업 후보

- [ ] 버블 온보딩(2-step) 화면
- [ ] 카테고리 라우팅 `/c/[category]`
- [ ] 부동산 경매 / 개발 / 글로벌 뉴스 수집기 추가
- [ ] 이미지 OG 폴백 (RSS에 없는 경우 페이지 크롤로 og:image 추출)
- [ ] 수집 스케줄러 (APScheduler 또는 외부 cron)
- [ ] 사용자 취향 저장 + 피드 개인화
