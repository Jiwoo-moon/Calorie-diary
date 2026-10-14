'use client';

import React, { useState } from 'react';
import { X, Flame, Clock, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { Meal } from '@/types/meal';

interface MealCardProps {
  meal: Meal;
  onDelete: (id: string) => Promise<void>;
  onImageClick?: (imageUrl: string, title: string) => void;
}

export function MealCard({ meal, onDelete, onImageClick }: MealCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Badge styles based on meal type
  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case '아침':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '점심':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '저녁':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case '간식':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Format time if created_at is present
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const timeDisplay = formatTime(meal.created_at);

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
      {/* Food Photo thumbnail */}
      {meal.image_url ? (
        <div
          onClick={() => onImageClick?.(meal.image_url!, meal.food_name)}
          className="relative w-full sm:w-24 sm:h-24 h-44 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer group/img"
          title="클릭하여 사진 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.image_url}
            alt={meal.food_name}
            className="w-full h-full object-cover group-hover/img:scale-105 transition duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
            <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">확대</span>
          </div>
        </div>
      ) : (
        <div className="w-full sm:w-24 sm:h-24 h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shrink-0">
          <ImageIcon className="w-8 h-8 text-slate-300" />
        </div>
      )}

      {/* Meal Info */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getBadgeStyle(
              meal.meal_type
            )}`}
          >
            {meal.meal_type || '식사'}
          </span>
          {timeDisplay && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              {timeDisplay}
            </span>
          )}
        </div>

        {/* Food Name */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
          {meal.food_name}
        </h3>

        {/* Calories */}
        <div className="flex items-center gap-1.5 mt-1">
          <Flame className="w-4 h-4 text-emerald-600 fill-emerald-500" />
          <span className="text-base sm:text-lg font-extrabold text-emerald-600">
            {Number(meal.calories).toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-slate-400">kcal</span>
        </div>

        {/* Description / Breakdown */}
        {meal.description && (
          <p className="mt-2 text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed bg-slate-50 rounded-lg p-2 border border-slate-100">
            {meal.description}
          </p>
        )}
      </div>

      {/* Delete button (X) */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="삭제"
        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer border border-transparent hover:border-rose-100"
        title="이 식사 기록 삭제"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
