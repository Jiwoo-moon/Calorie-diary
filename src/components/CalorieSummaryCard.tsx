'use client';

import React from 'react';
import { Flame, PieChart, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Meal } from '@/types/meal';

interface CalorieSummaryCardProps {
  meals: Meal[];
  dailyGoal?: number;
}

export function CalorieSummaryCard({ meals, dailyGoal = 2000 }: CalorieSummaryCardProps) {
  const totalCalories = meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
  const percentage = Math.min(Math.round((totalCalories / dailyGoal) * 100), 100);
  const remaining = Math.max(dailyGoal - totalCalories, 0);
  const isOverGoal = totalCalories > dailyGoal;

  // Breakdown by meal type
  const mealBreakdown = meals.reduce(
    (acc, meal) => {
      const type = meal.meal_type || '기타';
      acc[type] = (acc[type] || 0) + (Number(meal.calories) || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const categories = [
    { label: '아침', key: '아침', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { label: '점심', key: '점심', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { label: '저녁', key: '저녁', color: 'bg-sky-100 text-sky-800 border-sky-200' },
    { label: '간식', key: '간식', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ];

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mb-2">
            <Flame className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            오늘의 총 칼로리
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              {totalCalories.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-slate-400">kcal</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 min-w-[140px] text-right sm:text-right">
          <div className="text-xs text-slate-400 font-medium">목표 {dailyGoal.toLocaleString()} kcal</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {isOverGoal ? (
              <span className="text-rose-600 font-semibold">
                +{ (totalCalories - dailyGoal).toLocaleString() } kcal 초과
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">
                {remaining.toLocaleString()} kcal 남음
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {meals.length}개의 식사 기록
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>섭취율 {percentage}%</span>
          <span>{percentage >= 100 ? '목표 달성!' : `${100 - percentage}% 추가 가능`}</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverGoal
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : percentage > 85
                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                : 'bg-gradient-to-r from-teal-400 to-emerald-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Mini meal breakdown pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-100">
        {categories.map((cat) => {
          const cal = mealBreakdown[cat.key] || 0;
          return (
            <div
              key={cat.key}
              className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{cat.label}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    cal > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="mt-1">
                <span className="text-sm font-bold text-slate-900">
                  {cal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 ml-0.5">kcal</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
