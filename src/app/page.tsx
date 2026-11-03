'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Meal } from '@/types/meal';
import {
  fetchMealsByDate,
  insertMeal,
  deleteMeal,
  getClientConfig,
  saveClientConfig,
} from '@/lib/supabase';
import { Header } from '@/components/Header';
import { DateNavigator } from '@/components/DateNavigator';
import { CalorieSummaryCard } from '@/components/CalorieSummaryCard';
import { PhotoUploadSection } from '@/components/PhotoUploadSection';
import { MealList } from '@/components/MealList';
import { SettingsModal } from '@/components/SettingsModal';
import { ImageModal } from '@/components/ImageModal';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Info, LineChart, ChevronRight } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [todayStr, setTodayStr] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Check Supabase connection state and load user config
  const checkConfig = useCallback(() => {
    const config = getClientConfig();
    const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
    setIsSupabaseConnected(hasSupabase);

    try {
      const raw = localStorage.getItem('calorie_diary_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dailyGoalCalories && Number(parsed.dailyGoalCalories) > 0) {
          setDailyGoal(Number(parsed.dailyGoalCalories));
        }
      }
    } catch {
      // ignore parse error
    }
  }, []);

  // Fetch meals for the selected date
  const loadMeals = useCallback(
    async (date: string) => {
      setIsLoading(true);
      try {
        const result = await fetchMealsByDate(date);
        setMeals(result.meals);
      } catch (err) {
        console.error('Failed to load meals:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    setTodayStr(today);
    setSelectedDate(today);
    setMounted(true);
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    if (selectedDate) {
      loadMeals(selectedDate);
    }
  }, [selectedDate, loadMeals]);

  // Handle adding a meal
  const handleMealAdded = async (mealData: {
    date: string;
    food_name: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  }): Promise<boolean> => {
    // 1 & 2. Supabase 클라이언트를 사용해 meals 테이블에 date, food_name, calories 추가
    const result = await insertMeal(mealData);

    if (result.success) {
      // 3. 저장 성공 시 식사 목록을 즉시 다시 불러온다
      await loadMeals(mealData.date);
      showToast('식사 기록이 저장되었습니다!', 'success');
      return true;
    } else {
      // 4. 저장 실패 시 화면에 "저장에 실패했습니다. 다시 시도해주세요." 메시지를 표시한다
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'warning');
      return false;
    }
  };

  // Handle deleting a meal
  const handleMealDeleted = async (id: string) => {
    const res = await deleteMeal(id);
    if (res.success) {
      await loadMeals(selectedDate);
      showToast('식사 기록이 삭제되었습니다.', 'info');
    } else {
      showToast(`삭제 실패: ${res.error || '다시 시도해주세요.'}`, 'warning');
    }
  };

  const handleGoalChange = (newGoal: number) => {
    setDailyGoal(newGoal);
    saveClientConfig({ dailyGoalCalories: newGoal });
  };

  if (!mounted || !selectedDate) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          isSupabaseConnected={isSupabaseConnected}
        />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5">
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 h-16 flex items-center justify-center animate-pulse">
            <span className="text-sm font-semibold text-slate-400">날짜 불러오는 중...</span>
          </div>
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 h-48 animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      {/* 4. 전체배경 흰색 */}
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Supabase Status Banner if not connected */}
        {!isSupabaseConnected && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">현재 로컬 브라우저 저장소로 동작 중입니다.</span>
              <p className="mt-0.5 text-amber-800">
                Supabase DB의 <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">meals</code> 테이블에 실시간 저장하려면 우측 상단 설정 아이콘을 클릭하여 Supabase 정보를 입력하세요.
              </p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
            >
              설정하기
            </button>
          </div>
        )}

        {/* 1. 상단 헤더: 날짜 이동 버튼(◀ / ▶)이 날짜 좌우에 배치 */}
        <DateNavigator
          selectedDate={selectedDate}
          todayStr={todayStr}
          onDateChange={setSelectedDate}
        />

        {/* 1. 상단 총 칼로리 크게 표시 & 하루 목표 칼로리 직접 입력 & 달성률 막대 그래프 (초과 시 빨간색) & 탄·단·지 분석 */}
        <CalorieSummaryCard
          meals={meals}
          selectedDate={selectedDate}
          todayStr={todayStr}
          dailyGoal={dailyGoal}
          onGoalChange={handleGoalChange}
        />

        {/* 주간 리포트 꺾은선 그래프 바로가기 배너 */}
        <Link
          href="/report"
          className="w-full bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-white hover:from-emerald-100/80 hover:to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between transition group shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs shrink-0">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition">
                  최근 7일 주간 리포트 확인하기
                </h3>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  꺾은선 그래프
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                최근 7일간의 하루 총 칼로리 섭취 추이와 탄·단·지 영양소 합계를 한눈에 확인하세요
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition shrink-0 ml-2" />
        </Link>

        {/* 2. 업로드 영역: 점선 테두리 박스, 안내 문구, 썸네일 미리보기 */}
        <PhotoUploadSection
          selectedDate={selectedDate}
          onMealAdded={handleMealAdded}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* 3. 식사 목록: 음식명 왼쪽 정렬, 칼로리 오른쪽 정렬, 빈 목록 문구, 연한 회색 테두리 카드 */}
        <MealList
          meals={meals}
          isLoading={isLoading}
          onDelete={handleMealDeleted}
          onImageClick={(url, title) => setLightboxImage({ url, title })}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 bg-white">
        <p>음식 칼로리 다이어리 • Powered by Next.js, Google Gemini 3.8 Flash & Supabase</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={() => {
          checkConfig();
          loadMeals(selectedDate);
          showToast('설정이 저장되었습니다!', 'success');
        }}
      />

      {/* Lightbox Modal */}
      <ImageModal
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage?.url || null}
        title={lightboxImage?.title || '음식 사진'}
        onClose={() => setLightboxImage(null)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold border ${
              toast.type === 'warning'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'info'
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-sky-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
