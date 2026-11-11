import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Meal } from '@/types/meal';

const LOCAL_STORAGE_MEALS_KEY = 'calorie_diary_local_meals';
const LOCAL_STORAGE_CONFIG_KEY = 'calorie_diary_config';
const LOCAL_STORAGE_MACROS_KEY = 'calorie_diary_macros_cache';

export interface MacroData {
  carbs: number;
  protein: number;
  fat: number;
}

export function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

export function getClientConfig() {
  if (typeof window === 'undefined') {
    return {
      supabaseUrl: sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
      geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
    };
  }

  let localConfig: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (raw) {
      localConfig = JSON.parse(raw);
    }
  } catch {
    // ignore parse error
  }

  const rawUrl = localConfig.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawKey = localConfig.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const rawGemini = localConfig.geminiApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  return {
    supabaseUrl: sanitizeSupabaseUrl(rawUrl),
    supabaseAnonKey: rawKey.trim(),
    geminiApiKey: rawGemini.trim(),
  };
}

export function saveClientConfig(config: { supabaseUrl?: string; supabaseAnonKey?: string; geminiApiKey?: string; dailyGoalCalories?: number }) {
  if (typeof window === 'undefined') return;
  const current = getClientConfig();
  const merged = {
    ...current,
    ...config,
    supabaseUrl: sanitizeSupabaseUrl(config.supabaseUrl || current.supabaseUrl),
  };
  localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(merged));
  // Invalidate cached client so it reinitializes
  cachedSupabase = null;
  cachedUrl = '';
  cachedKey = '';
}

let cachedSupabase: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = getClientConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (cachedSupabase && cachedUrl === supabaseUrl && cachedKey === supabaseAnonKey) {
    return cachedSupabase;
  }

  try {
    cachedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedUrl = supabaseUrl;
    cachedKey = supabaseAnonKey;
    return cachedSupabase;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// ============ Nutrition Macro Estimation & Caching Helpers ============

/**
 * 한국인 영양 섭취 기준(보건복지부 기준 탄50:단20:지30) 및 주요 음식 키워드를 활용한
 * 현실적인 탄·단·지 그램(g) 자동 추정 계산기
 */
export function estimateMacrosFromCalories(calories: number, foodName = ''): MacroData {
  const cal = Math.max(0, Math.round(Number(calories) || 0));
  if (cal === 0) return { carbs: 0, protein: 0, fat: 0 };

  const name = (foodName || '').toLowerCase();

  // 고단백/육류/생선/두부류
  if (
    name.includes('닭가슴살') ||
    name.includes('소고기') ||
    name.includes('단백질') ||
    name.includes('연어') ||
    name.includes('계란') ||
    name.includes('달걀') ||
    name.includes('두부') ||
    name.includes('프로틴') ||
    name.includes('스테이크') ||
    name.includes('돼지') ||
    name.includes('삼겹살')
  ) {
    const protein = Math.max(1, Math.round((cal * 0.35) / 4));
    const fat = Math.max(1, Math.round((cal * 0.35) / 9));
    const carbs = Math.max(0, Math.round((cal - (protein * 4 + fat * 9)) / 4));
    return { carbs, protein, fat };
  }

  // 고탄수화물 (밥, 면, 빵, 떡, 면류)
  if (
    name.includes('밥') ||
    name.includes('면') ||
    name.includes('라면') ||
    name.includes('국수') ||
    name.includes('빵') ||
    name.includes('떡') ||
    name.includes('파스타') ||
    name.includes('우동') ||
    name.includes('김밥') ||
    name.includes('피자')
  ) {
    const carbs = Math.max(1, Math.round((cal * 0.65) / 4));
    const protein = Math.max(1, Math.round((cal * 0.15) / 4));
    const fat = Math.max(1, Math.round((cal * 0.20) / 9));
    return { carbs, protein, fat };
  }

  // 일반 식사 (한국 표준 비율 50:20:30)
  const carbs = Math.max(1, Math.round((cal * 0.50) / 4));
  const protein = Math.max(1, Math.round((cal * 0.20) / 4));
  const fat = Math.max(1, Math.round((cal * 0.30) / 9));
  return { carbs, protein, fat };
}

export function getMacroCache(): Record<string, MacroData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MACROS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMacrosToCache(keys: string[], macros: MacroData): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getMacroCache();
    for (const key of keys) {
      if (key && key.trim()) {
        cache[key.trim()] = macros;
      }
    }
    localStorage.setItem(LOCAL_STORAGE_MACROS_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Failed to save macro cache:', err);
  }
}

export function getCachedMacros(id?: string, date?: string, foodName?: string, calories?: number): MacroData | null {
  const cache = getMacroCache();
  if (id && cache[String(id)]) {
    return cache[String(id)];
  }
  if (date && foodName !== undefined && calories !== undefined) {
    const compoundKey = `${date}_${foodName.trim()}_${calories}`;
    if (cache[compoundKey]) return cache[compoundKey];
  }
  if (foodName !== undefined && calories !== undefined) {
    const simpleKey = `${foodName.trim()}_${calories}`;
    if (cache[simpleKey]) return cache[simpleKey];
  }
  return null;
}

// ============ Local Storage Fallback Helpers ============

export function getLocalMeals(): Meal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_MEALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalMeals(meals: Meal[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_MEALS_KEY, JSON.stringify(meals));
  } catch (err) {
    console.error('Failed to save meals to localStorage:', err);
  }
}

// ============ CRUD Operations ============

export async function fetchMealsByDate(date: string): Promise<{ meals: Meal[]; isFallback: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const localMeals = getLocalMeals().filter((m) => m.date === date);
    return {
      meals: localMeals.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
      isFallback: true,
      error: 'Supabase URL/Key가 설정되지 않아 로컬 저장소를 사용 중입니다.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error, using fallback:', error.message);
      const localMeals = getLocalMeals().filter((m) => m.date === date);
      return {
        meals: localMeals,
        isFallback: true,
        error: `Supabase 오류 (${error.message}). 로컬 데이터를 표시합니다.`,
      };
    }

    // Map fields and resolve carbs, protein, fat from DB, persistent cache, or estimate
    const formatted: Meal[] = (data || []).map((row) => {
      const cal = Number(row.calories) || 0;
      const foodName = row.food_name || row.name || '알 수 없는 음식';
      const rowDate = row.date || date;

      // 1. DB에 컬럼이 있어 유효한 값이 존재하는지 확인
      let carbs = typeof row.carbs === 'number' && row.carbs > 0 ? row.carbs : undefined;
      let protein = typeof row.protein === 'number' && row.protein > 0 ? row.protein : undefined;
      let fat = typeof row.fat === 'number' && row.fat > 0 ? row.fat : undefined;

      // 2. DB에 없으면(컬럼 부재) 저장 시 보관한 영양소 캐시에서 조회
      if (carbs === undefined || protein === undefined || fat === undefined) {
        const cached = getCachedMacros(String(row.id), rowDate, foodName, cal);
        if (cached && (cached.carbs > 0 || cached.protein > 0 || cached.fat > 0)) {
          carbs = carbs ?? cached.carbs;
          protein = protein ?? cached.protein;
          fat = fat ?? cached.fat;
        }
      }

      // 3. 이전 기록이거나 캐시 미존재 시, 칼로리를 기반으로 표준 영양소 자동 계산
      if (cal > 0 && (!carbs && !protein && !fat)) {
        const est = estimateMacrosFromCalories(cal, foodName);
        carbs = est.carbs;
        protein = est.protein;
        fat = est.fat;
        saveMacrosToCache([String(row.id), `${rowDate}_${foodName}_${cal}`], est);
      }

      return {
        id: String(row.id),
        food_name: foodName,
        calories: cal,
        carbs: Math.max(0, Math.round(carbs || 0)),
        protein: Math.max(0, Math.round(protein || 0)),
        fat: Math.max(0, Math.round(fat || 0)),
        date: rowDate,
        meal_type: row.meal_type || '기타',
        description: row.description || null,
        image_url: row.image_url || null,
        created_at: row.created_at || new Date().toISOString(),
      };
    });

    return { meals: formatted, isFallback: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const localMeals = getLocalMeals().filter((m) => m.date === date);
    return {
      meals: localMeals,
      isFallback: true,
      error: `Supabase 연결 오류 (${msg}). 로컬 저장소를 사용합니다.`,
    };
  }
}

export async function insertMeal(meal: {
  date: string;
  food_name: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fat?: number;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = getSupabaseClient();
  const localId = `meal-${Date.now()}`;

  // Ensure macros are positive numbers (estimate if user entered 0 or omitted but calories > 0)
  let finalCarbs = typeof meal.carbs === 'number' ? meal.carbs : 0;
  let finalProtein = typeof meal.protein === 'number' ? meal.protein : 0;
  let finalFat = typeof meal.fat === 'number' ? meal.fat : 0;

  if (meal.calories > 0 && finalCarbs === 0 && finalProtein === 0 && finalFat === 0) {
    const est = estimateMacrosFromCalories(meal.calories, meal.food_name);
    finalCarbs = est.carbs;
    finalProtein = est.protein;
    finalFat = est.fat;
  }

  const macroData: MacroData = {
    carbs: Math.max(0, Math.round(finalCarbs)),
    protein: Math.max(0, Math.round(finalProtein)),
    fat: Math.max(0, Math.round(finalFat)),
  };

  // Cache by composite key and localId immediately
  const compoundKey = `${meal.date}_${meal.food_name.trim()}_${meal.calories}`;
  saveMacrosToCache([localId, compoundKey], macroData);

  // Keep local storage in sync
  const localMeals = getLocalMeals();
  localMeals.push({
    id: localId,
    date: meal.date,
    food_name: meal.food_name,
    calories: meal.calories,
    carbs: macroData.carbs,
    protein: macroData.protein,
    fat: macroData.fat,
    created_at: new Date().toISOString(),
  });
  saveLocalMeals(localMeals);

  if (!supabase) {
    return { success: true, data: { id: localId, ...meal, ...macroData } };
  }

  try {
    const recordWithMacros: Record<string, any> = {
      date: meal.date,
      food_name: meal.food_name,
      calories: meal.calories,
      carbs: macroData.carbs,
      protein: macroData.protein,
      fat: macroData.fat,
    };

    let { data, error } = await supabase
      .from('meals')
      .insert([recordWithMacros])
      .select()
      .single();

    // If Supabase table doesn't have carbs/protein/fat columns, retry with the core 3 columns
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      const coreRecord = {
        date: meal.date,
        food_name: meal.food_name,
        calories: meal.calories,
      };
      const retry = await supabase
        .from('meals')
        .insert([coreRecord])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase insert error:', error.message);
      return { success: false, error: error.message };
    }

    // Associate DB row ID with the cached macros!
    if (data && data.id) {
      saveMacrosToCache([String(data.id)], macroData);
    }

    return { success: true, data: { ...data, ...macroData } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('insertMeal exception:', msg);
    return { success: false, error: msg };
  }
}

export async function deleteMeal(id: string | number): Promise<{ success: boolean; error?: string }> {
  // Always delete from local storage as well
  const all = getLocalMeals();
  const filtered = all.filter((m) => String(m.id) !== String(id));
  saveLocalMeals(filtered);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: true };
  }

  try {
    const targetId = isNaN(Number(id)) ? id : Number(id);
    const { error } = await supabase.from('meals').delete().eq('id', targetId);
    if (error) {
      console.warn('Supabase delete error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ============ Weekly Report Helper ============

export interface DailySummary {
  date: string; // YYYY-MM-DD
  displayDate: string; // MM/DD
  dayOfWeek: string; // 월, 화, 수...
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  mealsCount: number;
}

export async function fetchRecent7DaysSummary(endDateStr?: string): Promise<{
  days: DailySummary[];
  averageCalories: number;
  totalWeekCalories: number;
  maxDay: DailySummary | null;
  minDay: DailySummary | null;
}> {
  // Build the 7 date strings (endDate - 6 days through endDate)
  let end: Date;
  if (endDateStr && endDateStr.includes('-')) {
    const parts = endDateStr.split('-').map(Number);
    end = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  } else {
    end = new Date();
    end.setHours(12, 0, 0, 0);
  }

  const dateList: { date: string; displayDate: string; dayOfWeek: string }[] = [];
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    dateList.push({
      date: dateKey,
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      dayOfWeek: weekdays[d.getDay()],
    });
  }

  const startDateStr = dateList[0].date;
  const finishDateStr = dateList[dateList.length - 1].date;

  let allMeals: Meal[] = [];
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', finishDateStr);

      if (!error && data) {
        allMeals = data.map((row) => {
          const cal = Number(row.calories) || 0;
          const foodName = row.food_name || row.name || '';
          let carbs = typeof row.carbs === 'number' && row.carbs > 0 ? row.carbs : undefined;
          let protein = typeof row.protein === 'number' && row.protein > 0 ? row.protein : undefined;
          let fat = typeof row.fat === 'number' && row.fat > 0 ? row.fat : undefined;

          if (carbs === undefined || protein === undefined || fat === undefined) {
            const cached = getCachedMacros(String(row.id), row.date, foodName, cal);
            if (cached) {
              carbs = carbs ?? cached.carbs;
              protein = protein ?? cached.protein;
              fat = fat ?? cached.fat;
            }
          }

          if (cal > 0 && (!carbs && !protein && !fat)) {
            const est = estimateMacrosFromCalories(cal, foodName);
            carbs = est.carbs;
            protein = est.protein;
            fat = est.fat;
          }

          return {
            id: String(row.id),
            food_name: foodName,
            calories: cal,
            carbs: carbs || 0,
            protein: protein || 0,
            fat: fat || 0,
            date: row.date,
          };
        });
      }
    } catch (err) {
      console.warn('Weekly supabase fetch error:', err);
    }
  }

  // Fallback / merge with local storage
  if (allMeals.length === 0) {
    const local = getLocalMeals();
    allMeals = local.filter((m) => m.date >= startDateStr && m.date <= finishDateStr);
  }

  // Group by date
  const summaryByDate: Record<string, DailySummary> = {};
  for (const item of dateList) {
    summaryByDate[item.date] = {
      date: item.date,
      displayDate: item.displayDate,
      dayOfWeek: item.dayOfWeek,
      totalCalories: 0,
      totalCarbs: 0,
      totalProtein: 0,
      totalFat: 0,
      mealsCount: 0,
    };
  }

  for (const meal of allMeals) {
    if (summaryByDate[meal.date]) {
      summaryByDate[meal.date].totalCalories += Number(meal.calories) || 0;
      summaryByDate[meal.date].totalCarbs += Number(meal.carbs) || 0;
      summaryByDate[meal.date].totalProtein += Number(meal.protein) || 0;
      summaryByDate[meal.date].totalFat += Number(meal.fat) || 0;
      summaryByDate[meal.date].mealsCount += 1;
    }
  }

  const days = dateList.map((item) => summaryByDate[item.date]);
  const totalWeekCalories = days.reduce((sum, d) => sum + d.totalCalories, 0);
  const averageCalories = Math.round(totalWeekCalories / 7);

  const daysWithData = days.filter((d) => d.mealsCount > 0);
  let maxDay: DailySummary | null = null;
  let minDay: DailySummary | null = null;

  if (daysWithData.length > 0) {
    maxDay = daysWithData.reduce((prev, curr) => (curr.totalCalories > prev.totalCalories ? curr : prev), daysWithData[0]);
    minDay = daysWithData.reduce((prev, curr) => (curr.totalCalories < prev.totalCalories ? curr : prev), daysWithData[0]);
  }

  return {
    days,
    averageCalories,
    totalWeekCalories,
    maxDay,
    minDay,
  };
}
