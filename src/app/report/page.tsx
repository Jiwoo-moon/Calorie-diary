'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchRecent7DaysSummary,
  DailySummary,
  getClientConfig,
} from '@/lib/supabase';
import { Header } from '@/components/Header';
import { SettingsModal } from '@/components/SettingsModal';
import {
  LineChart,
  ArrowLeft,
  Calendar,
  Flame,
  TrendingUp,
  Award,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function WeeklyReportPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [days, setDays] = useState<DailySummary[]>([]);
  const [averageCalories, setAverageCalories] = useState<number>(0);
  const [totalWeekCalories, setTotalWeekCalories] = useState<number>(0);
  const [maxDay, setMaxDay] = useState<DailySummary | null>(null);
  const [minDay, setMinDay] = useState<DailySummary | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const config = getClientConfig();
    setIsSupabaseConnected(Boolean(config.supabaseUrl && config.supabaseAnonKey));

    try {
      const raw = localStorage.getItem('calorie_diary_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dailyGoalCalories && Number(parsed.dailyGoalCalories) > 0) {
          setDailyGoal(Number(parsed.dailyGoalCalories));
        }
      }
    } catch {
      // ignore
    }

    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      const res = await fetchRecent7DaysSummary(today);
      setDays(res.days);
      setAverageCalories(res.averageCalories);
      setTotalWeekCalories(res.totalWeekCalories);
      setMaxDay(res.maxDay);
      setMinDay(res.minDay);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // SVG Chart Dimensions
  const svgWidth = 640;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 40;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Calculate Y-scale max
  const maxRecorded = Math.max(...days.map((d) => d.totalCalories), 0);
  const maxScale = Math.max(maxRecorded, dailyGoal, 2000) * 1.15;
  const maxY = Math.ceil(maxScale / 500) * 500;

  // Grid steps (0, 1000, 2000, ...)
  const gridSteps = [0, Math.round(maxY / 2), maxY];

  // Coordinates
  const points = days.map((d, index) => {
    const x = padLeft + (index / (Math.max(days.length - 1, 1))) * chartWidth;
    const yRatio = d.totalCalories / (maxY || 1);
    const y = padTop + chartHeight - yRatio * chartHeight;
    return { ...d, x, y };
  });

  // SVG Path strings
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padTop + chartHeight} L ${
          points[0].x
        } ${padTop + chartHeight} Z`
      : '';

  // Goal line Y
  const goalY = padTop + chartHeight - (dailyGoal / (maxY || 1)) * chartHeight;

  // Week macros
  const totalCarbs = days.reduce((sum, d) => sum + d.totalCarbs, 0);
  const totalProtein = days.reduce((sum, d) => sum + d.totalProtein, 0);
  const totalFat = days.reduce((sum, d) => sum + d.totalFat, 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
        <div className="h-16 border-b border-slate-100" />
        <main className="max-w-3xl w-full mx-auto px-4 py-8 space-y-4">
          <div className="h-48 bg-slate-50 rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        isSupabaseConnected={isSupabaseConnected}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Top Breadcrumb & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              title="기록 페이지로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <LineChart className="w-6 h-6 text-emerald-600" />
                <span>최근 7일 주간 리포트</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                최근 7일간의 하루 총 칼로리 섭취량과 영양소 변화 추이
              </p>
            </div>
          </div>

          <button
            onClick={loadReportData}
            disabled={isLoading}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>새로고침</span>}
          </button>
        </div>

        {/* 1. 꺾은선 그래프 (최근 7일간 하루 총 칼로리) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                일별 칼로리 변화 추이
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                일별 총합
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 bg-rose-400 border-b border-dashed inline-block" />
                목표 ({dailyGoal.toLocaleString()} kcal)
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
              <span className="text-xs text-slate-400 font-medium">데이터 불러오는 중...</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-1">
              <div className="min-w-[560px]">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto select-none"
                >
                  <defs>
                    <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {gridSteps.map((val) => {
                    const y = padTop + chartHeight - (val / (maxY || 1)) * chartHeight;
                    return (
                      <g key={val}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fontSize="10"
                          fill="#94a3b8"
                          fontWeight="500"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Goal Reference Line (Dashed) */}
                  {goalY >= padTop && goalY <= padTop + chartHeight && (
                    <line
                      x1={padLeft}
                      y1={goalY}
                      x2={svgWidth - padRight}
                      y2={goalY}
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Gradient Area under curve */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#calorieGradient)" />
                  )}

                  {/* The Line Chart */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points (Dots & Value Labels) */}
                  {points.map((p, i) => {
                    const isHovered = hoveredIndex === i;
                    const isOver = p.totalCalories > dailyGoal;
                    return (
                      <g
                        key={p.date}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4.5}
                          fill={isOver ? '#ef4444' : isHovered ? '#059669' : '#10b981'}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-200"
                        />

                        {/* Top Value Label */}
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill={isOver ? '#dc2626' : '#0f172a'}
                        >
                          {p.totalCalories > 0 ? `${p.totalCalories.toLocaleString()}` : '0'}
                        </text>

                        {/* X-axis Date Label */}
                        <text
                          x={p.x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isHovered ? 'bold' : '500'}
                          fill={isHovered ? '#0f172a' : '#64748b'}
                        >
                          {p.displayDate} ({p.dayOfWeek})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Hovered Day Tooltip Detail */}
          {hoveredIndex !== null && days[hoveredIndex] && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  {days[hoveredIndex].date} ({days[hoveredIndex].dayOfWeek})
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-extrabold text-emerald-600">
                  {days[hoveredIndex].totalCalories.toLocaleString()} kcal
                </span>
                <span className="text-slate-500">
                  ({days[hoveredIndex].mealsCount}건의 식사)
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <span>탄수화물 {days[hoveredIndex].totalCarbs}g</span>
                <span>단백질 {days[hoveredIndex].totalProtein}g</span>
                <span>지방 {days[hoveredIndex].totalFat}g</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. 주간 핵심 통계 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 block">7일 총 섭취량</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {totalWeekCalories.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">kcal</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 block">일일 평균 칼로리</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">
                {averageCalories.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">kcal</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 block">최고 섭취일</span>
            <div className="mt-1">
              {maxDay ? (
                <>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 block truncate">
                    {maxDay.displayDate} ({maxDay.dayOfWeek})
                  </span>
                  <span className="text-xs font-bold text-rose-500">
                    {maxDay.totalCalories.toLocaleString()} kcal
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 block">최저 섭취일</span>
            <div className="mt-1">
              {minDay ? (
                <>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 block truncate">
                    {minDay.displayDate} ({minDay.dayOfWeek})
                  </span>
                  <span className="text-xs font-bold text-sky-600">
                    {minDay.totalCalories.toLocaleString()} kcal
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. 주간 영양소 합계 (탄수화물, 단백질, 지방) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            주간 영양소 총합 및 일평균
          </h3>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-center">
              <span className="text-xs font-bold text-amber-800 block">탄수화물</span>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-amber-900">
                  {totalCarbs.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-amber-700 ml-0.5">g</span>
              </div>
              <span className="text-[11px] text-amber-600 block mt-0.5">
                일평균 {Math.round(totalCarbs / 7)}g
              </span>
            </div>

            <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 text-center">
              <span className="text-xs font-bold text-sky-800 block">단백질</span>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-sky-900">
                  {totalProtein.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-sky-700 ml-0.5">g</span>
              </div>
              <span className="text-[11px] text-sky-600 block mt-0.5">
                일평균 {Math.round(totalProtein / 7)}g
              </span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-center">
              <span className="text-xs font-bold text-rose-800 block">지방</span>
              <div className="mt-1">
                <span className="text-lg sm:text-xl font-black text-rose-900">
                  {totalFat.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-rose-700 ml-0.5">g</span>
              </div>
              <span className="text-[11px] text-rose-600 block mt-0.5">
                일평균 {Math.round(totalFat / 7)}g
              </span>
            </div>
          </div>
        </div>

        {/* 4. 일자별 상세 내역 목록 */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            7일간 일별 상세 데이터
          </h3>
          <div className="space-y-2 pt-1">
            {days.slice().reverse().map((day) => {
              const isOver = day.totalCalories > dailyGoal;
              const percent = dailyGoal > 0 ? Math.round((day.totalCalories / dailyGoal) * 100) : 0;
              return (
                <div
                  key={day.date}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {day.dayOfWeek}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{day.date}</span>
                        <span className="text-xs text-slate-400">({day.mealsCount}건)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>탄 {day.totalCarbs}g</span>
                        <span>·</span>
                        <span>단 {day.totalProtein}g</span>
                        <span>·</span>
                        <span>지 {day.totalFat}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="text-right">
                      <span
                        className={`text-base font-extrabold ${
                          isOver ? 'text-red-500' : 'text-slate-900'
                        }`}
                      >
                        {day.totalCalories.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ml-1">kcal</span>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isOver
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : percent > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          loadReportData();
        }}
      />
    </div>
  );
}
