'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Meal } from '@/types/meal';

interface CalorieSummaryCardProps {
  meals: Meal[];
  selectedDate: string;
  todayStr: string;
  dailyGoal: number;
  onGoalChange?: (newGoal: number) => void;
}

export function CalorieSummaryCard({
  meals,
  selectedDate,
  todayStr,
  dailyGoal = 2000,
  onGoalChange,
}: CalorieSummaryCardProps) {
  const [goalInput, setGoalInput] = useState<string>(String(dailyGoal));

  useEffect(() => {
    setGoalInput(String(dailyGoal));
  }, [dailyGoal]);

  const totalCalories = meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0);
  const totalProtein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);
  const totalFat = meals.reduce((sum, meal) => sum + (Number(meal.fat) || 0), 0);

  const isToday = Boolean(todayStr && selectedDate === todayStr);

  // 실시간 입력값 반영
  const parsedGoal = Number(goalInput);
  const currentGoal = !isNaN(parsedGoal) && parsedGoal > 0 ? parsedGoal : dailyGoal > 0 ? dailyGoal : 2000;
  
  // 달성률 계산 (정수)
  const percentage = currentGoal > 0 ? Math.round((totalCalories / currentGoal) * 100) : 0;
  // 목표 칼로리 초과 여부
  const isOverGoal = totalCalories > currentGoal;
  const diffCalories = Math.abs(totalCalories - currentGoal);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setGoalInput(valStr);
    const num = Number(valStr);
    if (!isNaN(num) && num > 0) {
      onGoalChange?.(num);
    }
  };

  const handleBlur = () => {
    const num = Number(goalInput);
    if (isNaN(num) || num <= 0) {
      setGoalInput(String(dailyGoal));
    } else {
      onGoalChange?.(num);
    }
  };

  const setPresetGoal = (preset: number) => {
    setGoalInput(String(preset));
    onGoalChange?.(preset);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* 1. 상단: 오늘/이날 총 칼로리 크게 표시 & 목표 칼로리 직접 입력창 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <Flame className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
              {isToday ? '오늘의 섭취량' : '선택일 섭취량'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isToday ? '오늘' : '이날'} 총합{' '}
            <span className={isOverGoal ? 'text-red-500' : 'text-emerald-600'}>
              {totalCalories.toLocaleString()}
            </span>{' '}
            <span className="text-lg font-bold text-slate-400">kcal</span>
          </h2>
        </div>

        {/* 하루 목표 칼로리 직접 입력 영역 */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col items-start sm:items-end justify-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Target className="w-4 h-4 text-emerald-600" />
            <span>하루 목표 칼로리:</span>
            <div className="relative inline-flex items-center ml-1">
              <input
                type="number"
                min="100"
                max="15000"
                step="50"
                value={goalInput}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-24 px-2.5 py-1 text-sm sm:text-base font-extrabold text-slate-900 bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-xl text-right focus:ring-2 focus:ring-emerald-200 focus:outline-none transition"
                title="목표 칼로리를 직접 입력해 보세요"
              />
              <span className="text-xs font-bold text-slate-500 ml-1.5">kcal</span>
            </div>
          </div>

          {/* 간편 프리셋 버튼 */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium">추천:</span>
            {[1500, 1800, 2000, 2300].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPresetGoal(preset)}
                className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold transition cursor-pointer ${
                  currentGoal === preset
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. 달성률(%) 및 막대 그래프 (목표 칼로리 초과 시 빨간색으로 변경) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <span className="text-slate-800">목표 달성률:</span>
            <span
              className={`text-base sm:text-lg font-black tracking-tight ${
                isOverGoal ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {percentage}%
            </span>
          </div>

          <div className="text-xs">
            {isOverGoal ? (
              <span className="inline-flex items-center gap-1.5 text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-xl border border-red-200 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                목표 {diffCalories.toLocaleString()} kcal 초과!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {diffCalories.toLocaleString()} kcal 남음
              </span>
            )}
          </div>
        </div>

        {/* 막대 그래프 영역 */}
        <div className="relative w-full h-5 sm:h-6 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 text-[10px] sm:text-xs font-extrabold text-white shadow-xs ${
              isOverGoal
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {percentage >= 15 && (
              <span className="drop-shadow-xs select-none">
                {percentage}%
              </span>
            )}
          </div>
        </div>

        {/* 보조 안내 문구 */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
          <span>0 kcal</span>
          <span>목표: {currentGoal.toLocaleString()} kcal</span>
        </div>
      </div>

      {/* 3. 영양소 총합 표시 (탄수화물, 단백질, 지방) */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
          <span className="text-xs font-bold text-amber-800 block">탄수화물 (Carbs)</span>
          <div className="mt-1">
            <span className="text-lg font-black text-amber-900">{totalCarbs}</span>
            <span className="text-xs font-semibold text-amber-700 ml-0.5">g</span>
          </div>
        </div>

        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 text-center">
          <span className="text-xs font-bold text-sky-800 block">단백질 (Protein)</span>
          <div className="mt-1">
            <span className="text-lg font-black text-sky-900">{totalProtein}</span>
            <span className="text-xs font-semibold text-sky-700 ml-0.5">g</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
          <span className="text-xs font-bold text-rose-800 block">지방 (Fat)</span>
          <div className="mt-1">
            <span className="text-lg font-black text-rose-900">{totalFat}</span>
            <span className="text-xs font-semibold text-rose-700 ml-0.5">g</span>
          </div>
        </div>
      </div>
    </div>
  );
}
