# 원가회계 — 포트폴리오 프로토타입

Next.js 14 App Router 기반 프로토타입으로, 원가/관리회계 개념을 시연합니다:
개별원가계산, 간접비 배부, 차이분석, 공헌이익 보고.

---

## 검토자용

### 살펴볼 항목

| 영역 | 위치 | 내용 |
|------|------|------|
| 배부 엔진 | `lib/engines/allocation.ts` | 직접법 및 단계배부법 원가집합 배부 |
| 차이 엔진 | `lib/engines/variance.ts` | Kaplan/Atkinson 4분법 차이 분해 |
| API 라우트 | `app/api/` | Zod 유효성 검증을 포함한 Next.js Route Handler |
| 데이터 모델 | `prisma/schema.prisma` | 원가센터, 원가집합, 배부기준, 작업지시서 |
| UI 대시보드 | `app/(dashboard)/` | Recharts 기반 보고서 화면 |

### 아키텍처 개요

```
브라우저 → Next.js App Router → Route Handler → Prisma ORM → PostgreSQL
                                                ↓
                                        lib/engines/   (순수 TypeScript, 프레임워크 독립)
```

`lib/engines/`의 배부 및 차이 엔진은 Next.js 없이 단위 테스트가 가능하도록
프레임워크에 의존하지 않습니다. 수식 명세는 `docs/allocation-algorithm.md`와
`docs/variance-algorithm.md`를 참고하세요.

### 엔진 위치

- `lib/engines/allocation.ts` — 원가집합-대상 배부 (직접법, 단계배부법)
- `lib/engines/variance.ts` — 표준원가 차이 분해
- `lib/engines/contribution.ts` — 공헌이익 및 CVP 분석
- `tests/unit/` — 모든 엔진 함수에 대한 Vitest 단위 테스트

---

## 회계 담당자용 (데모 사용자)

### 로컬 실행 방법

```bash
# 1. 의존성 설치
pnpm install

# 2. 데이터베이스 설정 (PostgreSQL 필요 — 로컬 설치 또는 Docker)
pnpm db:migrate
pnpm db:seed

# 3. 개발 서버 시작
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 여세요.

### 데모 모드

시드 스크립트는 2개 기간의 제조업 시나리오 데이터를 불러옵니다:
- 2개 부문 (기계, 조립)과 공유 서비스 원가집합 (HR, IT, 시설)
- 표준원가 대 실제원가 추적이 포함된 3개 작업지시서
- 기간 1, 기간 2의 월별 차이 보고서

데모에는 로그인이 필요 없습니다. `pnpm db:seed`를 다시 실행하면 모든 데이터가 초기화됩니다.

---

## 개발자용

### 사전 요구사항

- Node.js 20+
- pnpm 9+

### 설정

```bash
git clone <repo>
cd cost-accounting
pnpm install
cp .env.example .env.local   # DATABASE_URL 설정
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 시작 (http://localhost:3000) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm typecheck` | TypeScript 엄격 검사 |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm test:coverage` | V8 커버리지 리포트 포함 단위 테스트 |
| `pnpm test:e2e` | Playwright E2E 테스트 |
| `pnpm db:migrate` | Prisma 마이그레이션 적용 |
| `pnpm db:seed` | 데모 데이터 로드 |

### 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 App Router |
| 언어 | TypeScript (strict) |
| 스타일링 | Tailwind CSS v3 + shadcn/ui |
| 데이터베이스 ORM | Prisma 5 |
| 차트 | Recharts |
| 유효성 검증 | Zod |
| 단위 테스트 | Vitest + @vitest/coverage-v8 |
| E2E 테스트 | Playwright |

### 디렉토리 구조

```
cost-accounting/
├── app/                  # Next.js App Router 페이지 및 API 라우트
│   ├── (dashboard)/      # 대시보드 라우트 그룹
│   ├── api/              # Route Handler
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 홈 페이지
├── components/           # 공유 React 컴포넌트
│   └── ui/               # shadcn/ui 기본 컴포넌트
├── lib/                  # 프레임워크 독립 비즈니스 로직
│   ├── engines/          # 배부, 차이, 공헌이익 엔진
│   └── utils.ts          # cn() 및 공유 헬퍼
├── prisma/               # 데이터베이스 스키마 및 시드
│   ├── schema.prisma
│   └── seed.ts
├── tests/
│   ├── unit/             # Vitest 단위 테스트
│   └── e2e/              # Playwright 테스트
└── docs/
    ├── allocation-algorithm.md
    └── variance-algorithm.md
```

### 기여 규칙

- 파일 크기 제한 준수: 소스 파일 300줄 초과 금지 (목표 200줄 이하)
- 코드 주석은 영어로 작성
- 커밋 전 `pnpm typecheck && pnpm lint && pnpm test` 실행
- 커밋 메시지는 Lore 형식 사용 (`.claude/rules/autopus/lore-commit.md` 참고)

---

두 핵심 엔진의 수식 명세는 `docs/allocation-algorithm.md`와 `docs/variance-algorithm.md`를 참고하세요.
