'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Loader2, Check, AlertCircle, X, PenTool, Image as ImageIcon } from 'lucide-react';
import { Meal, MealAnalysisResult, MealType } from '@/types/meal';
import { compressImage } from '@/lib/imageUtils';
import { getClientConfig } from '@/lib/supabase';

interface PhotoUploadSectionProps {
  selectedDate: string;
  onMealAdded: (meal: Omit<Meal, 'id' | 'created_at'>) => Promise<void>;
  onOpenSettings?: () => void;
}

export function PhotoUploadSection({
  selectedDate,
  onMealAdded,
  onOpenSettings,
}: PhotoUploadSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'photo' | 'manual'>('photo');

  // Photo analysis state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form edit fields
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [mealType, setMealType] = useState<MealType>('점심');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setFoodName('');
    setCalories('');
    setMealType('점심');
    setDescription('');
    setIsAnalyzing(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  };

  const processAndAnalyzeImage = async (file: File) => {
    try {
      setAnalysisError(null);
      setIsAnalyzing(true);

      // Compress client-side
      const compressedDataUrl = await compressImage(file);
      setSelectedImage(compressedDataUrl);

      // Get user config if custom Gemini key is saved
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
        // fallback
      }

      if (!response.ok) {
        throw new Error(data.error || `서버 오류가 발생했습니다 (코드: ${response.status})`);
      }

      const foodName = data.food_name || data.analysis?.food_name || '분석 실패';
      const calories = typeof data.calories === 'number' ? data.calories : (data.analysis?.calories || 0);

      const result: MealAnalysisResult = {
        food_name: foodName,
        calories: calories,
        meal_type: data.analysis?.meal_type || '점심',
        description: data.analysis?.description || '',
      };

      setAnalysisResult(result);
      setFoodName(result.food_name);
      setCalories(result.calories);
      setMealType(result.meal_type || '점심');
      setDescription(result.description || '');
    } catch (err: unknown) {
      console.error('Image analysis error:', err);
      const msg = err instanceof Error ? err.message : '사진 분석 중 오류가 발생했습니다.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndAnalyzeImage(file);
    }
    // reset input value so re-selecting the same file works
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
      alert('올바른 칼로리를 입력해 주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await onMealAdded({
        food_name: foodName.trim(),
        calories: Number(calories),
        date: selectedDate,
        meal_type: mealType,
        description: description.trim() || null,
        image_url: selectedImage || null,
      });

      handleClose();
    } catch (err) {
      console.error('Failed to save meal:', err);
      alert('식사 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-white hover:bg-slate-50 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-5 text-center transition group shadow-xs cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="text-base font-bold text-slate-900">
                음식 사진 업로드 & 칼로리 분석
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3 h-3" />
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              사진을 올리면 AI가 음식 이름과 칼로리를 자동으로 계산하여 기록합니다
            </p>
          </div>
        </button>
      )}

      {/* Expanded Modal / Card */}
      {isOpen && (
        <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-6 transition animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                식사 기록 추가 ({selectedDate})
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('photo');
                setAnalysisError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                mode === 'photo'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>사진 AI 분석</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                mode === 'manual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-4 h-4 text-slate-600" />
              <span>직접 입력</span>
            </button>
          </div>

          {/* PHOTO MODE */}
          {mode === 'photo' && (
            <div className="space-y-4">
              {!selectedImage ? (
                /* Drop & Upload Box */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-6 sm:p-10 text-center flex flex-col items-center justify-center transition bg-slate-50/50"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    음식 사진을 여기에 드래그하거나 선택하세요
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    JPG, PNG, WEBP 지원 (스마트폰 촬영 사진 가능)
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>파일 선택</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>카메라로 촬영</span>
                    </button>
                  </div>

                  {/* Hidden inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                /* Image Preview & Analysis Card */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-100 max-h-72 flex items-center justify-center border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImage}
                      alt="Uploaded Food"
                      className="max-h-72 w-full object-contain"
                    />

                    {/* Change photo button */}
                    {!isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>사진 변경</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden input for change photo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Loading state */}
                  {isAnalyzing && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center animate-pulse">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                      <h4 className="text-sm font-bold text-emerald-900">
                        Gemini 3.8 Flash가 음식을 분석하는 중...
                      </h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        사진 속 식재료와 양을 파악하여 칼로리를 산출하고 있습니다.
                      </p>
                    </div>
                  )}

                  {/* Analysis Error */}
                  {analysisError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">{analysisError}</p>
                        {analysisError.includes('API') && onOpenSettings && (
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="mt-2 text-xs underline font-bold text-rose-900 hover:text-rose-950 cursor-pointer block"
                          >
                            ⚙️ Gemini API 키 설정 열기
                          </button>
                        )}
                        <p className="text-xs text-rose-600 mt-2">
                          아래 양식에서 음식 이름과 칼로리를 직접 입력하여 저장할 수도 있습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EDIT FORM (Visible when in manual mode OR after photo is uploaded/analyzed) */}
          {(mode === 'manual' || selectedImage) && (
            <div className="mt-5 space-y-4 pt-4 border-t border-slate-100">
              {analysisResult && (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gemini AI 분석 완료! 내용을 확인하고 필요한 경우 수정하세요.</span>
                  </div>
                  {analysisResult.confidence && (
                    <span className="text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                      신뢰도: {analysisResult.confidence}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Food Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    음식 명칭 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김치찌개, 연어 샐러드"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Calories */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    칼로리 (kcal) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="예: 450"
                      value={calories}
                      onChange={(e) =>
                        setCalories(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                      kcal
                    </span>
                  </div>
                </div>
              </div>

              {/* Meal Type Radio / Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  식사 구분
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['아침', '점심', '저녁', '간식'] as MealType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMealType(type)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        mealType === type
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  상세 설명 및 분량 (선택)
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 밥 1공기, 찌개 1뚝배기, 밑반찬 포함"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveMeal}
                  disabled={isSaving || isAnalyzing || !foodName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>DB에 저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>식사 기록 저장하기</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
