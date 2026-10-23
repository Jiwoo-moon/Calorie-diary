'use client';

import React, { useRef } from 'react';
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react';

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
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);
    dateObj.setDate(dateObj.getDate() + days);
    onDateChange(formatDateString(dateObj));
  };

  // Format Korean display: "2026년 7월 7일 (화)"
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
      const dateObj = new Date(year, month - 1, day, 12, 0, 0);
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
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex flex-col items-center justify-center">
        {/* 날짜 좌우에 ◀ / ▶ 버튼 배치 */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* ◀ 버튼 */}
          <button
            onClick={() => handleShiftDate(-1)}
            aria-label="이전 날짜"
            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold hover:text-slate-900 transition active:scale-95 cursor-pointer"
            title="이전 날짜 (어제)"
          >
            <span className="text-sm sm:text-base">◀</span>
          </button>

          {/* 중앙 날짜 표시 및 달력 선택 */}
          <button
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer group"
            title="클릭하여 달력에서 날짜 선택"
          >
            <CalendarIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition shrink-0" />
            <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {formatted}
            </span>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                오늘
              </span>
            )}
          </button>

          {/* ▶ 버튼 */}
          <button
            onClick={() => handleShiftDate(1)}
            aria-label="다음 날짜"
            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold hover:text-slate-900 transition active:scale-95 cursor-pointer"
            title="다음 날짜 (내일)"
          >
            <span className="text-sm sm:text-base">▶</span>
          </button>
        </div>

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
            className="flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>오늘로 이동</span>
          </button>
        )}
      </div>
    </div>
  );
}
