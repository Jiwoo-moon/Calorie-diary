'use client';

import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2, Check, AlertCircle, X, Camera, RefreshCw } from 'lucide-react';
import { MealAnalysisResult } from '@/types/meal';
import { compressImage } from '@/lib/imageUtils';
import { getClientConfig } from '@/lib/supabase';

interface PhotoUploadSectionProps {
  selectedDate: string;
  onMealAdded: (meal: {
    date: string;
    food_name: string;
    calories: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  }) => Promise<boolean>;
  onOpenSettings?: () => void;
}

export function PhotoUploadSection({
  selectedDate,
  onMealAdded,
  onOpenSettings,
}: PhotoUploadSectionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form fields
  const [foodName, setFoodName] = useState<string>('');
  const [calories, setCalories] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedImage(null);
    setShowManualInput(false);
    setAnalysisError(null);
    setSaveError(null);
    setFoodName('');
    setCalories('');
    setCarbs('');
    setProtein('');
    setFat('');
    setIsAnalyzing(false);
    setIsSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAndAnalyzeImage = async (file: File) => {
    try {
      setAnalysisError(null);
      setSaveError(null);
      setIsAnalyzing(true);

      // Client-side compression
      const compressedDataUrl = await compressImage(file);
      setSelectedImage(compressedDataUrl);

      // Custom API key if configured
      const config = getClientConfig();

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.geminiApiKey ? { 'x-gemini-key': config.geminiApiKey } : {}),
        },
        body: JSON.stringify({
          image: compressedDataUrl,
          mimeType: 'image/jpeg',
          geminiKey: config.geminiApiKey,
        }),
      });

      let data: Record<string, any> = {};
      try {
        data = await response.json();
      } catch {
        // ignore json parse error
      }

      if (!response.ok) {
        throw new Error(data.error || `서버 오류가 발생했습니다 (코드: ${response.status})`);
      }

      const analyzedName = data.food_name || '분석 실패';
      const analyzedCalories = typeof data.calories === 'number' ? data.calories : 0;
      const analyzedCarbs = typeof data.carbs === 'number' ? data.carbs : 0;
      const analyzedProtein = typeof data.protein === 'number' ? data.protein : 0;
      const analyzedFat = typeof data.fat === 'number' ? data.fat : 0;

      setFoodName(analyzedName);
      setCalories(analyzedCalories);
      setCarbs(analyzedCarbs);
      setProtein(analyzedProtein);
      setFat(analyzedFat);
    } catch (err: unknown) {
      console.error('Image analysis error:', err);
      const msg = err instanceof Error ? err.message : '음식 사진 분석 중 오류가 발생했습니다.';
      setAnalysisError(msg);
      // Fallback values so user can still manually edit and save
      setFoodName('분석 실패');
      setCalories(0);
      setCarbs(0);
      setProtein(0);
      setFat(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndAnalyzeImage(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processAndAnalyzeImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSaveMeal = async () => {
    if (!foodName.trim()) {
      alert('음식 이름을 입력해 주세요.');
      return;
    }
    if (calories === '' || Number(calories) < 0) {
      alert('올바른 칼로리 숫자를 입력해 주세요.');
      return;
    }

    setSaveError(null);
    try {
      setIsSaving(true);

      // date: 현재 선택된 날짜 (YYYY-MM-DD 형식, 로컬 시간 기준)
      let dateToSave = selectedDate;
      if (!dateToSave || !dateToSave.includes('-')) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateToSave = `${year}-${month}-${day}`;
      }

      const success = await onMealAdded({
        date: dateToSave,
        food_name: foodName.trim(),
        calories: Math.max(0, Math.round(Number(calories))),
        carbs: carbs !== '' ? Math.max(0, Math.round(Number(carbs))) : 0,
        protein: protein !== '' ? Math.max(0, Math.round(Number(protein))) : 0,
        fat: fat !== '' ? Math.max(0, Math.round(Number(fat))) : 0,
      });

      if (success) {
        resetForm();
        setShowManualInput(false);
      } else {
        setSaveError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('Save meal error:', err);
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
      {/* 2. 업로드 영역: 점선 테두리 박스 및 안내 문구 */}
      {!selectedImage && !showManualInput ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-10 text-center flex flex-col items-center justify-center transition cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-xs">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition">
            여기에 사진을 드래그하거나 클릭해서 올리세요.
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gemini AI가 음식 이름, 칼로리, 탄수화물, 단백질, 지방을 자동 분석합니다. (최대 4MB)
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>사진 선택</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowManualInput(true);
              }}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              직접 입력하기
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : null}

      {/* 사진이 선택되었을 때: 썸네일 미리보기 표시 및 분석 결과/입력 폼 */}
      {(selectedImage || showManualInput) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {selectedImage ? '음식 사진 분석 및 저장' : '식사 직접 입력'}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>취소</span>
            </button>
          </div>

          {/* 썸네일 미리보기 */}
          {selectedImage && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="음식 미리보기"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full text-center sm:text-left">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center sm:items-start gap-2 py-2">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gemini AI가 음식과 영양소를 분석하는 중...</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      사진을 분석하여 음식명, 칼로리, 탄수화물, 단백질, 지방을 계산하고 있습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        AI 분석 완료
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>사진 변경</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      필요한 경우 아래에서 음식 이름이나 칼로리를 수정한 뒤 저장하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 에러 메시지 */}
          {analysisError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{analysisError}</p>
                {analysisError.includes('API') && onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="mt-1 underline font-semibold text-rose-900 cursor-pointer block"
                  >
                    ⚙️ Gemini API 키 설정 열기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 음식명 및 칼로리 입력 폼 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                음식 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: 김치찌개, 연어 샐러드"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                disabled={isAnalyzing || isSaving}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                예상 칼로리 (kcal) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="예: 450"
                  value={calories}
                  onChange={(e) =>
                    setCalories(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={isAnalyzing || isSaving}
                  className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                  kcal
                </span>
              </div>
            </div>
          </div>

          {/* 영양소 3종 (탄수화물, 단백질, 지방) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                탄수화물 (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isAnalyzing || isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                단백질 (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isAnalyzing || isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                지방 (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isAnalyzing || isSaving}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 저장 실패 메시지 */}
          {saveError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* 하단 저장 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveMeal}
              disabled={isSaving || isAnalyzing || !foodName.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>저장하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
