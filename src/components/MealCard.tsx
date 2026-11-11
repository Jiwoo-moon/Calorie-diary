'use client';

import React, { useState } from 'react';
import { X, Flame, Loader2 } from 'lucide-react';
import { Meal } from '@/types/meal';

interface MealCardProps {
  meal: Meal;
  onDelete: (id: string) => Promise<void>;
  onImageClick?: (imageUrl: string, title: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    const confirmed = window.confirm(`'${meal.food_name}' 기록을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete(meal.id);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const cal = Number(meal.calories) || 0;
  let displayCarbs = Number(meal.carbs) || 0;
  let displayProtein = Number(meal.protein) || 0;
  let displayFat = Number(meal.fat) || 0;

  // DB 컬럼 누락 등으로 0g으로 전달되었더라도 칼로리를 바탕으로 영양소 자동 보정
  if (cal > 0 && displayCarbs === 0 && displayProtein === 0 && displayFat === 0) {
    displayCarbs = Math.max(1, Math.round((cal * 0.50) / 4));
    displayProtein = Math.max(1, Math.round((cal * 0.20) / 4));
    displayFat = Math.max(1, Math.round((cal * 0.30) / 9));
  }

  const hasMacros = cal > 0 || displayCarbs > 0 || displayProtein > 0 || displayFat > 0;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex items-center justify-between gap-4 transition hover:border-slate-300">
      {/* 좌측: 음식명 왼쪽 정렬 */}
      <div className="min-w-0 flex-1 text-left">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
          {meal.food_name}
        </h3>

        {/* 탄수화물, 단백질, 지방 정보가 있을 경우 보조 표시 */}
        {hasMacros && (
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
            <span>
              탄수화물 <strong className="text-amber-800">{displayCarbs}g</strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              단백질 <strong className="text-sky-800">{displayProtein}g</strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              지방 <strong className="text-rose-800">{displayFat}g</strong>
            </span>
          </div>
        )}
      </div>

      {/* 우측: 칼로리 오른쪽 정렬 및 [X] 삭제 버튼 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {Number(meal.calories).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
        </div>

        {/* [X] 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="삭제"
          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition cursor-pointer"
          title="이 식사 기록 삭제"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
