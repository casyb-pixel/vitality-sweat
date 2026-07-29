export type Sex = "male" | "female";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type PrimaryGoal =
  | "target_weight"
  | "marathon_training"
  | "sports_training"
  | "general_fitness"
  | "muscle_gain"
  | "endurance";

export type UnitSystem = "imperial" | "metric";

export type FitnessProfile = {
  id: string;
  sex: Sex | null;
  birthdate: string | null;
  unit_system: UnitSystem;
  height_in: number | null;
  weight_lb: number | null;
  waist_in: number | null;
  fitness_level: FitnessLevel | null;
  primary_goal: PrimaryGoal | null;
  target_weight_lb: number | null;
  goal_details: Record<string, unknown>;
  disliked_foods: string[];
  food_allergies: string[];
  health_conditions: string[];
  activity_restrictions: string | null;
  meal_rejects?: string[];
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FitnessProfileInput = {
  sex: Sex;
  birthdate: string;
  unit_system?: UnitSystem;
  height_in: number;
  weight_lb: number;
  waist_in?: number | null;
  fitness_level: FitnessLevel;
  primary_goal: PrimaryGoal;
  target_weight_lb?: number | null;
  goal_details?: Record<string, unknown>;
  disliked_foods?: string[];
  food_allergies?: string[];
  health_conditions?: string[];
  activity_restrictions?: string | null;
};

export type ExerciseTrackingType =
  | "weight_reps"
  | "reps_only"
  | "duration"
  | "distance";

export type ExerciseEquipment = "machine" | "bodyweight" | "free_weight";

export type ExerciseCategory = "cardio" | "strength" | "endurance";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory | string;
  primary_muscle: string | null;
  equipment: ExerciseEquipment | string | null;
  aliases?: string[];
  tracking_type: ExerciseTrackingType;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionStatus = "active" | "completed" | "cancelled";

export type WorkoutSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  status: WorkoutSessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number | null;
  reps: number | null;
  difficulty: number;
  created_at: string;
};

export type WorkoutSetInput = {
  exercise_id: string;
  set_number: number;
  weight_lb?: number | null;
  reps?: number | null;
  difficulty: number;
};

export type ProgressionSuggestion = {
  exercise_id: string;
  lastWeightLb: number | null;
  lastReps: number | null;
  lastSets: number;
  lastAvgDifficulty: number;
  suggestedWeightLb: number | null;
  suggestedReps: number | null;
  message: string;
};

export type MealDay = {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  notes?: string;
};

export type GroceryItem = {
  name: string;
  quantity?: string;
  aisle?: string;
};

export type SnackIdea = {
  name: string;
  description?: string;
};

export type MealPlanPayload = {
  days: MealDay[];
  groceryList: GroceryItem[];
  snacks: SnackIdea[];
  summary?: string;
};

export type MealPlan = {
  id: string;
  user_id: string;
  week_start: string;
  plan: MealPlanPayload | Record<string, unknown>;
  grocery_list: GroceryItem[] | unknown;
  snacks: SnackIdea[] | unknown;
  model: string | null;
  grocery_share_token?: string | null;
  created_at: string;
  updated_at: string;
};

export type MealFeedbackEntry = {
  at: string;
  day: string;
  reason: string;
  rejected: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  extracted_dislikes: string[];
};

export type VideoProvider = "youtube" | "vimeo";

export type Video = {
  id: string;
  title: string;
  description: string;
  provider: VideoProvider;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  published_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const FITNESS_LEVEL_LABELS: Record<FitnessLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  target_weight: "Target weight",
  marathon_training: "Marathon training",
  sports_training: "Sports training",
  general_fitness: "General fitness",
  muscle_gain: "Muscle gain",
  endurance: "Endurance",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Very easy",
  2: "Easy",
  3: "Just right",
  4: "Hard",
  5: "Very hard",
};
