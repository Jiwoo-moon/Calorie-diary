'use client';

import React from 'react';
import { Settings, Utensils, Database, HardDrive } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isSupabaseConnected: boolean;
}

export function Header({ onOpenSettings, isSupabaseConnected }: HeaderProps) {
  return (
    <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
              칼로리 다이어리
            </h1>
            <p className="text-xs text-slate-400">
              AI 음식 사진 분석 & 식단 기록
            </p>
          </div>
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
