import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Meal } from '@/types/meal';

const LOCAL_STORAGE_MEALS_KEY = 'calorie_diary_local_meals';
const LOCAL_STORAGE_CONFIG_KEY = 'calorie_diary_config';

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

    // Map fields if DB uses slightly different naming (e.g. name instead of food_name)
    const formatted: Meal[] = (data || []).map((row) => ({
      id: String(row.id),
      food_name: row.food_name || row.name || '알 수 없는 음식',
      calories: Number(row.calories) || 0,
      carbs: typeof row.carbs === 'number' ? row.carbs : (Number(row.carbs) || 0),
      protein: typeof row.protein === 'number' ? row.protein : (Number(row.protein) || 0),
      fat: typeof row.fat === 'number' ? row.fat : (Number(row.fat) || 0),
      date: row.date || date,
      meal_type: row.meal_type || '기타',
      description: row.description || null,
      image_url: row.image_url || null,
      created_at: row.created_at || new Date().toISOString(),
    }));

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

  // Keep local storage in sync
  const localMeals = getLocalMeals();
  localMeals.push({
    id: localId,
    date: meal.date,
    food_name: meal.food_name,
    calories: meal.calories,
    carbs: meal.carbs || 0,
    protein: meal.protein || 0,
    fat: meal.fat || 0,
    created_at: new Date().toISOString(),
  });
  saveLocalMeals(localMeals);

  if (!supabase) {
    return { success: true, data: { id: localId, ...meal } };
  }

  try {
    const recordWithMacros: Record<string, any> = {
      date: meal.date,
      food_name: meal.food_name,
      calories: meal.calories,
    };
    if (typeof meal.carbs === 'number') recordWithMacros.carbs = meal.carbs;
    if (typeof meal.protein === 'number') recordWithMacros.protein = meal.protein;
    if (typeof meal.fat === 'number') recordWithMacros.fat = meal.fat;

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

    return { success: true, data };
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
        allMeals = data.map((row) => ({
          id: String(row.id),
          food_name: row.food_name || row.name || '',
          calories: Number(row.calories) || 0,
          carbs: Number(row.carbs) || 0,
          protein: Number(row.protein) || 0,
          fat: Number(row.fat) || 0,
          date: row.date,
        }));
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
