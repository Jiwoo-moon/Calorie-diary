export type MealType = '아침' | '점심' | '저녁' | '간식' | '기타';

export interface Meal {
  id: string;
  food_name: string;
  calories: number;
  date: string; // YYYY-MM-DD
  meal_type?: MealType | string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface MealAnalysisResult {
  food_name: string;
  calories: number;
  meal_type: MealType;
  description: string;
  confidence?: '높음' | '보통' | '낮음' | string;
}

export interface UserConfig {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  dailyGoalCalories?: number;
}
