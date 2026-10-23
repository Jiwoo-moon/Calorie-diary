'use client';

import React from 'react';
import { Meal } from '@/types/meal';
import { MealCard } from './MealCard';
import { Utensils, Loader2 } from 'lucide-react';

interface MealListProps {
  meals: Meal[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onImageClick?: (imageUrl: string, title: string) => void;
  onOpenUpload?: () => void;
}

export function MealList({ meals, isLoading, onDelete, onImageClick }: MealListProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[160px]">
        <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-2" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium">식사 기록을 불러오는 중...</p>
      </div>
    );
  }

  // 목록이 비어 있을 때 “아직 이날 식사 기록이 없습니다.” 문구 표시
  if (meals.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Utensils className="w-6 h-6 stroke-[1.5]" />
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-600">
          아직 이날 식사 기록이 없습니다.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          위 업로드 영역에서 사진을 올리거나 직접 입력해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-700">
          식사 목록 <span className="text-emerald-600 ml-1">({meals.length})</span>
        </h2>
      </div>

      <div className="space-y-2.5">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onDelete={onDelete}
            onImageClick={onImageClick}
          />
        ))}
      </div>
    </div>
  );
}
