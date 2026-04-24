# 원가회계 시스템 (cost-accounting)
## 원가/관리회계 개념 시연 포트폴리오

> Next.js 14 App Router 기반 포트폴리오 프로토타입.
> 간접비 배부, 표준원가 차이분석, 이전가격, 공헌이익 분석을 TDD로 구현.

**구현 완료**: Vitest 단위 테스트 207개 · 93.08% 커버리지 · Playwright E2E

---

## 무엇을 만들었나

원가/관리회계의 핵심 계산 알고리즘을 코드로 정확하게 구현했습니다.

| 기능 | 설명 |
|------|------|
| **간접비 배부** | 직접법 · 단계배부법으로 원가집합 잔액을 부서·프로젝트에 배부 |
| **표준원가 차이분석** | Kaplan/Atkinson 4분법 (가격·수량·믹스·효율 차이) |
| **이전가격** | 조직 간 서비스 이전 시 표준요율 + 마크업 적용 |
| **공헌이익 분석** | CVP 분석, 손익분기점 계산 |
| **월 마감 워크플로우** | 배부 → 이전가격 → 차이분석 스냅샷을 단일 트랜잭션으로 실행 |
| **역할별 대시보드** | 경영진·관리회계·PM·원가담당자별 맞춤 뷰 |
| **데이터 내보내기** | CSV / Excel 보고서 다운로드 |

---

## 아키텍처

```
브라우저
    │
    ▼
Next.js 14 App Router (Vercel)
    │
    ├─ app/(dashboard)/    대시보드 (읽기 전용)
    ├─ app/(master)/       마스터 데이터 CRUD
    ├─ app/close/          월 마감 워크플로우
    └─ app/(demo)/         데모 모드 (페르소나 선택)
         │
         ▼
    lib/ ─ 엔진 계층 (프레임워크 독립 순수 TypeScript)
    │
    ├─ lib/allocation/    배부 엔진 (직접법, 단계배부법)
    ├─ lib/variance/      차이분석 엔진 (4분법 분해)
    ├─ lib/transfer/      이전가격 엔진
    ├─ lib/aggregation/   집계 함수
    ├─ lib/close/         월 마감 오케스트레이션
    └─ lib/zod/           Zod 검증 스키마
         │
         ▼
    Prisma ORM → PostgreSQL (DECIMAL(18,4) — 부동소수점 오류 원천 차단)
```

**핵심 설계**: `lib/` 엔진 계층은 Next.js에 의존하지 않아 Vitest 단독 실행이 가능합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 App Router (TypeScript strict) |
| 스타일링 | Tailwind CSS v3 + shadcn/ui |
| 차트 | Recharts (4분법 차이분석 막대 차트) |
| 데이터베이스 ORM | Prisma 5 (PostgreSQL, DECIMAL(18,4)) |
| 유효성 검증 | Zod (API 경계 입력값 검증) |
| 단위 테스트 | Vitest + @vitest/coverage-v8 |
| E2E 테스트 | Playwright |
| 패키지 매니저 | pnpm |

---

## 심사자용 — 살펴볼 핵심 코드

| 위치 | 내용 |
|------|------|
| `lib/allocation/direct.ts` | 직접배부법 — 드라이버 기반 비율 산정 + ConservativeAdd |
| `lib/allocation/stepDown.ts` | 단계배부법 — 순서별 배부, 이전 배부 부서 수령 제외 |
| `lib/allocation/checksum.ts` | SHA-256 체크섬 — 배부 결정론 보장 |
| `lib/variance/decompose.ts` | 4분법 차이 분해 (가격·수량·믹스·효율) |
| `lib/transfer/engine.ts` | 이전가격 계산 (표준요율 × 노동시간 × 마크업) |
| `lib/close/workflow.ts` | 월 마감 — 단일 $transaction 오케스트레이션 |
| `lib/zod/costEntry.ts` | 금액 필드 문자열 수신 이유 (부동소수점 방어) |
| `tests/unit/` | 207개 단위 테스트, 93.08% 커버리지 |

---

## 데모 시나리오

페르소나 선택기에서 역할을 선택하면 동일한 데이터를 각 관점에서 확인할 수 있습니다.

| 페르소나 | 대시보드 | 주요 지표 |
|----------|----------|-----------|
| Executive | 전사 손익 | HQ별 공헌이익, 전사 P&L |
| Controller | HQ 드릴다운 | 직접원가, 배부원가, 이전가격 |
| PM | 프로젝트 | 예산 vs 실제 vs 표준 |
| Cost Accountant | 차이분석 | 4분법 막대 차트 |

**월 마감 데모**: Close 메뉴 → OPEN 기간 선택 → 마감 실행 → Variance 대시보드에서 차이 확인

---

## 로컬 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env.local
# DATABASE_URL="postgresql://user:password@localhost:5432/cost_accounting"

# 3. 마이그레이션 + 시드
pnpm db:migrate
pnpm db:seed:small   # 소규모 (1 HQ, 3 프로젝트, 10 인원)
# 또는: pnpm db:seed:full

# 4. 개발 서버
pnpm dev
# → http://localhost:3000
```

---

## 테스트

```bash
pnpm test            # 단위 테스트 (207개, 93.08% 커버리지)
pnpm test:coverage   # V8 커버리지 리포트 포함
pnpm test:e2e        # Playwright E2E
```

---

## 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 (http://localhost:3000) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm typecheck` | TypeScript 엄격 검사 |
| `pnpm db:migrate` | Prisma 마이그레이션 |
| `pnpm db:seed` | 전체 시드 데이터 |

---

## 문서

| 문서 | 내용 |
|------|------|
| [기획서](docs/기획서.md) | 추진 배경 · 핵심 문제 · 기능 정의 · 개발 단계 |
| [개발문서](docs/개발문서.md) | 시스템 아키텍처 · 도메인 모델 · 알고리즘 상세 · 테스트 전략 |
| [배부 알고리즘](docs/allocation-algorithm.md) | 직접법 · 단계배부법 수식 (영문 원본) |
| [차이분석 알고리즘](docs/variance-algorithm.md) | 4분법 수식 (영문 원본) |
