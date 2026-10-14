'use client';

import React from 'react';
import { Meal } from '@/types/meal';
import { MealCard } from './MealCard';
import { UtensilsCrossed, Sparkles, Loader2 } from 'lucide-react';

interface MealListProps {
  meals: Meal[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onImageClick?: (imageUrl: string, title: string) => void;
  onOpenUpload?: () => void;
}

export function MealList({
  meals,
  isLoading,
  onDelete,
  onImageClick,
  onOpenUpload,
}: MealListProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-3xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[220px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">식사 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="w-full bg-white rounded-3xl border border-dashed border-slate-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-800">
          기록된 식사가 없습니다
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-5 leading-relaxed">
          음식 사진을 업로드해 보세요! Gemini AI가 음식 이름과 칼로리를 자동으로 계산하여 기록해 줍니다.
        </p>
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>첫 식사 사진 업로드하기</span>
          </button>
        )}
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

      <div className="space-y-3">
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
