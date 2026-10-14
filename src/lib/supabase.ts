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

function getLocalMeals(): Meal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_MEALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalMeals(meals: Meal[]): void {
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
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('Supabase client is not available');
    return { success: false, error: 'Supabase 클라이언트가 초기화되지 않았습니다.' };
  }

  try {
    // 2. meals 테이블에 date, food_name, calories 추가
    const recordToInsert = {
      date: meal.date,
      food_name: meal.food_name,
      calories: meal.calories,
    };

    const { data, error } = await supabase
      .from('meals')
      .insert([recordToInsert])
      .select()
      .single();

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

export async function deleteMeal(id: string): Promise<{ success: boolean; error?: string }> {
  // Always delete from local storage as well
  const all = getLocalMeals();
  const filtered = all.filter((m) => m.id !== id);
  saveLocalMeals(filtered);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase.from('meals').delete().eq('id', id);
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
