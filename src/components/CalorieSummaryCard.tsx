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
  const currentGoal = Number(goalInput) || dailyGoal || 2000;
  const percentage = currentGoal > 0 ? Math.round((totalCalories / currentGoal) * 100) : 0;
  const isOverGoal = totalCalories > currentGoal;
  const diffCalories = Math.abs(totalCalories - currentGoal);

  const handleGoalBlurOrSubmit = () => {
    const val = Number(goalInput);
    if (!isNaN(val) && val > 0) {
      onGoalChange?.(val);
    } else {
      setGoalInput(String(dailyGoal));
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* 1. 상단: 총 칼로리 크게 표시 ("오늘 총합 680 kcal" 또는 "이날 총합 680 kcal") */}
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

        {/* 하루 목표 칼로리 직접 입력 */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>하루 목표 칼로리:</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="100"
              max="15000"
              step="50"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onBlur={handleGoalBlurOrSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-20 px-2 py-1 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              title="하루 목표 칼로리를 직접 입력하세요"
            />
            <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
        </div>
      </div>

      {/* 2. 달성률(%) 및 막대 그래프 (목표 칼로리를 넘으면 빨간색으로 변경) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span className="text-slate-700">달성률:</span>
            <span
              className={`text-sm sm:text-base font-extrabold ${
                isOverGoal ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {percentage}%
            </span>
          </div>

          <div className="text-xs">
            {isOverGoal ? (
              <span className="inline-flex items-center gap-1 text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                <AlertTriangle className="w-3 h-3" />
                목표 대비 {diffCalories.toLocaleString()} kcal 초과
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {diffCalories.toLocaleString()} kcal 남음
              </span>
            )}
          </div>
        </div>

        {/* 막대 그래프: 목표 칼로리를 넘으면 막대가 빨간색(bg-red-500)으로 바뀜 */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverGoal ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* 3. 영양소 총합 표시 (탄수화물, 단백질, 지방) */}
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-center">
          <span className="text-xs font-bold text-amber-800 block">탄수화물 (Carbs)</span>
          <div className="mt-1">
            <span className="text-lg font-black text-amber-900">{totalCarbs}</span>
            <span className="text-xs font-semibold text-amber-700 ml-0.5">g</span>
          </div>
        </div>

        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3 text-center">
          <span className="text-xs font-bold text-sky-800 block">단백질 (Protein)</span>
          <div className="mt-1">
            <span className="text-lg font-black text-sky-900">{totalProtein}</span>
            <span className="text-xs font-semibold text-sky-700 ml-0.5">g</span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 text-center">
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
