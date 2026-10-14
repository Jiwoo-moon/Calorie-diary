'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Database, Target, Copy, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { getClientConfig, saveClientConfig } from '@/lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const SUPABASE_SQL_SCHEMA = `-- Supabase meals 테이블 생성 스크립트
create table if not exists public.meals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date default current_date not null,
  food_name text not null,
  calories integer not null,
  image_url text,
  meal_type text default '기타',
  description text
);

create index if not exists idx_meals_date on public.meals(date);

alter table public.meals enable row level security;

create policy "Allow public access to meals" on public.meals
  for all using (true) with check (true);
`;

export function SettingsModal({ isOpen, onClose, onConfigSaved }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getClientConfig();
      setGeminiKey(config.geminiApiKey || '');
      setSupabaseUrl(config.supabaseUrl || '');
      setSupabaseKey(config.supabaseAnonKey || '');

      try {
        const raw = localStorage.getItem('calorie_diary_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.dailyGoalCalories) setDailyGoal(Number(parsed.dailyGoalCalories));
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    saveClientConfig({
      geminiApiKey: geminiKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseKey.trim(),
      dailyGoalCalories: Number(dailyGoal) || 2000,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onConfigSaved();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">환경 설정 및 DB 연동</h2>
            <p className="text-xs text-slate-400">Gemini API 키 및 Supabase DB를 연결합니다.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
              >
                <span>무료 발급받기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400">
              * .env.local 파일의 GEMINI_API_KEY 또는 이 입력창에 직접 저장하여 사용할 수 있습니다.
            </p>
          </div>

          {/* Supabase URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="text"
              placeholder="https://your-project-id.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Supabase Anon Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Supabase Anon / Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400">
              * Supabase Dashboard &gt; Project Settings &gt; API 메뉴에서 확인 가능합니다.
            </p>
          </div>

          {/* Daily Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>일일 목표 칼로리 (kcal)</span>
            </label>
            <input
              type="number"
              placeholder="2000"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value) || 2000)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* SQL Schema helper box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Supabase 테이블 생성 SQL</span>
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>SQL 복사</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Supabase 대시보드의 <strong>SQL Editor</strong>에 붙여넣고 Run을 실행하면 <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">meals</code> 테이블이 즉시 생성됩니다.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>저장 완료!</span>
              </>
            ) : (
              <span>설정 저장하기</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
