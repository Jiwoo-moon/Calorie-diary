# 🥗 음식 칼로리 다이어리 (Calorie Diary)

음식 사진을 업로드하면 **Google Gemini 3.8 Flash**가 음식 이름과 칼로리를 자동으로 분석하고, **Supabase DB**의 `meals` 테이블에 기록하는 Next.js 웹 애플리케이션입니다.

---

## ✨ 주요 기능

1. **AI 음식 사진 분석 (Gemini 3.8 Flash)**
   - 음식 사진을 드래그 앤 드롭 또는 카메라로 촬영하여 업로드
   - 최신 `@google/genai` SDK 및 `gemini-3.8-flash` 모델을 통해 음식명, 칼로리(kcal), 식사 구분(아침/점심/저녁/간식), 분량 분석
   - 분석 결과 확인 및 사용자 직접 수정 가능

2. **Supabase DB 연동 (`meals` 테이블)**
   - 분석된 식사 기록을 Supabase DB의 `meals` 테이블에 저장
   - Supabase 설정 전에도 바로 테스트할 수 있는 스마트 로컬 저장소 모드 지원

3. **오늘 날짜 기준 식사 목록 및 총 칼로리 표시**
   - 오늘 섭취한 총 칼로리(kcal)와 일일 목표 대비 달성률 프로그레스 바 제공
   - 아침, 점심, 저녁, 간식별 칼로리 요약

4. **개별 식사 삭제 (X 버튼)**
   - 각 식사 카드 우측 상단의 `X` 버튼을 클릭하여 개별 삭제 가능
   - 삭제 시 즉시 DB 반영 및 총 칼로리 재계산

5. **날짜 이동 네비게이션 (◀ 어제 / 내일 ▶)**
   - `◀ 어제` 및 `내일 ▶` 버튼으로 과거 및 미래 식단 조회
   - 캘린더 날짜 선택 기능 및 원클릭 `오늘로 이동` 버튼 지원

6. **디자인**
   - 사용자 요구사항에 맞춘 깔끔한 **화이트 배경**, 상단 날짜 및 총 칼로리 요약, 모던한 **카드형 목록**

---

## 🚀 빠른 시작

### 1. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

### 2. 환경 변수 설정 (`.env.local`)
프로젝트 루트의 `.env.local` 파일에 키를 입력하거나, 웹 화면 우측 상단의 **⚙️ 설정 아이콘**을 클릭하여 직접 입력할 수 있습니다.

```env
# Gemini API Key (Google AI Studio에서 무료 발급: https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration (Supabase 대시보드 > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 🗄️ Supabase DB 설정 (`meals` 테이블)

Supabase 대시보드의 **SQL Editor**에 아래 스크립트를 붙여넣고 **Run**을 실행하세요 (프로젝트 루트의 `supabase-schema.sql` 파일에도 포함되어 있습니다).

```sql
create table if not exists public.meals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date default current_date not null,
  food_name text not null,
  calories integer not null,
  image_url text,
  meal_type text default '기타',
  description text
);

-- 날짜 검색 인덱스
create index if not exists idx_meals_date on public.meals(date);

-- RLS 정책 설정
alter table public.meals enable row level security;

create policy "Allow public access to meals" on public.meals
  for all using (true) with check (true);
```

---

## 📁 프로젝트 구조

```
calorie_diary/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts  # Gemini 3.8 Flash 음식 이미지 분석 API
│   │   ├── globals.css           # 화이트 테마 Tailwind CSS
│   │   ├── layout.tsx            # 메타데이터 및 레이아웃
│   │   └── page.tsx              # 메인 대시보드 페이지
│   ├── components/
│   │   ├── Header.tsx            # 상단 헤더 & DB 상태 표시
│   │   ├── DateNavigator.tsx     # ◀ 어제 / 내일 ▶ 날짜 이동 네비게이션
│   │   ├── CalorieSummaryCard.tsx# 상단 총 칼로리 및 목표 달성률 카드
│   │   ├── PhotoUploadSection.tsx# 사진 업로드, AI 분석 및 저장 폼
│   │   ├── MealCard.tsx          # 카드형 식사 아이템 (X 삭제 버튼 포함)
│   │   ├── MealList.tsx          # 식사 카드 목록 및 빈 상태 화면
│   │   ├── SettingsModal.tsx     # API 키/Supabase 설정 및 SQL 복사 모달
│   │   └── ImageModal.tsx        # 음식 사진 라이트박스 확대 모달
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 클라이언트 & CRUD 헬퍼
│   │   └── imageUtils.ts         # 클라이언트 이미지 압축 유틸
│   └── types/
│       └── meal.ts               # Meal 및 분석 결과 타입 정의
├── supabase-schema.sql           # Supabase DB 마이그레이션 SQL
├── .env.example                  # 환경 변수 예시
└── README.md
```
