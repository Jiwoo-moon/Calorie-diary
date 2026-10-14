-- Supabase 'meals' 테이블 생성 스크립트
-- Supabase 대시보드 > SQL Editor에 복사하여 실행하세요.

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

-- 검색 성능을 위한 날짜 인덱스
create index if not exists idx_meals_date on public.meals(date);

-- Row Level Security (RLS) 활성화
alter table public.meals enable row level security;

-- 누구나 읽기/쓰기/삭제가 가능하도록 정책 설정 (개인 다이어리용)
-- 프로덕션에서 유저 인증이 필요한 경우 auth.uid() 기반 정책으로 변경 가능합니다.
drop policy if exists "Allow public access to meals" on public.meals;
create policy "Allow public access to meals" on public.meals
  for all
  using (true)
  with check (true);
