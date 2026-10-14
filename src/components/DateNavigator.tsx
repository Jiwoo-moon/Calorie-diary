'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';

interface DateNavigatorProps {
  selectedDate: string; // 'YYYY-MM-DD'
  todayStr: string;
  onDateChange: (newDate: string) => void;
}

export function DateNavigator({ selectedDate, todayStr, onDateChange }: DateNavigatorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = Boolean(todayStr && selectedDate === todayStr);

  // Move date by offset days
  const handleShiftDate = (days: number) => {
    const target = selectedDate && selectedDate.includes('-') ? selectedDate : todayStr;
    if (!target) return;
    const parts = target.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [year, month, day] = parts;
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + days);
    onDateChange(formatDateString(dateObj));
  };

  // Format Korean display
  const getKoreanDateDisplay = () => {
    const target = selectedDate && selectedDate.includes('-') ? selectedDate : todayStr;
    if (!target || !target.includes('-')) {
      return { formatted: '날짜 불러오는 중...', dayOfWeek: '' };
    }
    try {
      const parts = target.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN) || parts[0] <= 0) {
        return { formatted: '날짜 불러오는 중...', dayOfWeek: '' };
      }
      const [year, month, day] = parts;
      const dateObj = new Date(year, month - 1, day);
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = weekdays[dateObj.getDay()];
      return {
        formatted: `${year}년 ${month}월 ${day}일 (${dayOfWeek})`,
        dayOfWeek,
      };
    } catch {
      return { formatted: target, dayOfWeek: '' };
    }
  };

  const { formatted } = getKoreanDateDisplay();

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        {/* 어제 버튼 */}
        <button
          onClick={() => handleShiftDate(-1)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 transition cursor-pointer border border-slate-200"
          title="어제 기록 보기"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
          <span>◀ 어제</span>
        </button>

        {/* 날짜 표시 & 날짜 선택 */}
        <div className="flex flex-col items-center justify-center relative">
          <button
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition cursor-pointer group"
            title="클릭하여 원하는 날짜 선택"
          >
            <CalendarIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
            <span className="text-sm sm:text-base font-bold text-slate-900">
              {formatted}
            </span>
            {isToday && (
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                오늘
              </span>
            )}
          </button>

          {/* Hidden native date picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            className="sr-only"
          />

          {!isToday && (
            <button
              onClick={() => onDateChange(todayStr)}
              className="flex items-center gap-1 mt-0.5 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>오늘로 이동</span>
            </button>
          )}
        </div>

        {/* 내일 버튼 */}
        <button
          onClick={() => handleShiftDate(1)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 transition cursor-pointer border border-slate-200"
          title="내일 기록 보기"
        >
          <span>내일 ▶</span>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
