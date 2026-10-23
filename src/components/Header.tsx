'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Utensils, Database, HardDrive, LineChart, Calendar } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isSupabaseConnected: boolean;
}

export function Header({ onOpenSettings, isSupabaseConnected }: HeaderProps) {
  const pathname = usePathname();
  const isReport = pathname === '/report';

  return (
    <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                칼로리 다이어리
              </h1>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 ml-2 sm:ml-4 bg-slate-100 p-1 rounded-xl">
            <Link
              href="/"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                !isReport
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>기록</span>
            </Link>
            <Link
              href="/report"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                isReport
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LineChart className="w-3.5 h-3.5 text-sky-600" />
              <span>주간 리포트</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Supabase status badge */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
            title={
              isSupabaseConnected
                ? 'Supabase DB 연결됨'
                : '로컬 모드 (Supabase 미연결) - 클릭하여 설정'
            }
          >
            {isSupabaseConnected ? (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Supabase 연결됨</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse sm:hidden" />
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span>로컬 저장소</span>
              </>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            aria-label="설정"
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
