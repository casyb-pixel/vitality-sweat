export type Sex = "male" | "female";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type PrimaryGoal =
  | "weight_loss"
  | "muscle_gain"
  | "strength"
  | "endurance"
  | "general_fitness"
  | "sports_training"
  | "marathon_training";

/** Goals that need a numeric target weight for diet + training alignment. */
export const GOALS_REQUIRING_TARGET_WEIGHT: ReadonlySet<PrimaryGoal> = new Set([
  "weight_loss",
  "muscle_gain",
]);

/**
 * Training prefs for AI workout generation.
 * Stored as real fitness_profiles columns (not goal_details).
 * Left unset at onboarding; the Workout Agent (or a later settings UI) fills them.
 */
export type PreferredSplit =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "ai_choose";

export type TrainingEquipment =
  | "gym"
  | "home"
  | "free_weight"
  | "machine"
  | "bodyweight"
  | "bands"
  | "cable"
  | "cardio_machines";

export const TRAINING_EQUIPMENT_OPTIONS: readonly TrainingEquipment[] = [
  "gym",
  "home",
  "free_weight",
  "machine",
  "bodyweight",
  "bands",
  "cable",
  "cardio_machines",
] as const;

export const PREFERRED_SPLIT_LABELS: Record<PreferredSplit, string> = {
  full_body: "Full body",
  upper_lower: "Upper / lower",
  push_pull_legs: "Push / pull / legs",
  ai_choose: "Let AI choose",
};

export type TrainingPreferences = {
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: string[];
  focus_muscles: string[];
  avoidances: string | null;
  preferred_split: PreferredSplit | null;
};

export type TrainingPreferencesInput = {
  days_per_week?: number | null;
  session_minutes?: number | null;
  equipment?: string[];
  focus_muscles?: string[];
  avoidances?: string | null;
  preferred_split?: PreferredSplit | null;
};

export type UnitSystem = "imperial" | "metric";

export type DishRatingEntry = {
  title: string;
  rating: number;
  count: number;
  updated_at: string;
};

export type DishRatingsMap = Record<string, DishRatingEntry>;

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
  /** Training prefs for AI workouts; optional until Workout Agent collects them. */
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: string[];
  focus_muscles: string[];
  avoidances: string | null;
  preferred_split: PreferredSplit | null;
  meal_rejects?: string[];
  dish_ratings?: DishRatingsMap;
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
  /** Optional; usually filled later by the Workout Agent. */
  days_per_week?: number | null;
  session_minutes?: number | null;
  equipment?: string[];
  focus_muscles?: string[];
  avoidances?: string | null;
  preferred_split?: PreferredSplit | null;
  /** Written to public.profiles (not fitness_profiles). */
  city: string;
  zip_code: string;
  region?: string | null;
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
  /** Optional link to a planned workout_program_days row. */
  program_day_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutProgramStatus = "draft" | "active" | "archived";

export type WorkoutSetStyle =
  | "strength_heavy"
  | "hypertrophy"
  | "endurance_light"
  | "metabolic";

export const WORKOUT_SET_STYLE_LABELS: Record<WorkoutSetStyle, string> = {
  strength_heavy: "Strength (heavy)",
  hypertrophy: "Hypertrophy",
  endurance_light: "Endurance (light)",
  metabolic: "Metabolic",
};

export type WorkoutProgram = {
  id: string;
  user_id: string;
  status: WorkoutProgramStatus;
  primary_goal: PrimaryGoal | null;
  days_per_week: number | null;
  session_minutes: number | null;
  summary: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WorkoutProgramDay = {
  id: string;
  program_id: string;
  day_index: number;
  label: string;
  focus: string | null;
  estimated_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutProgramExercise = {
  id: string;
  day_id: string;
  exercise_id: string;
  sort_order: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  set_style: WorkoutSetStyle;
  rest_sec: number | null;
  coach_notes: string | null;
  baseline_weight_lb: number | null;
  baseline_reps: number | null;
  created_at: string;
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
  recipes?: Record<string, DishRecipe>;
};

export type DishRecipeIngredient = {
  name: string;
  amount?: string;
  fromGroceryList?: boolean;
};

export type DishRecipe = {
  title: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: DishRecipeIngredient[];
  steps: string[];
  tips?: string;
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
  weight_loss: "Weight loss",
  muscle_gain: "Muscle gain / bodybuilding",
  strength: "Strength",
  endurance: "Endurance",
  general_fitness: "General fitness",
  sports_training: "Sports training",
  marathon_training: "Marathon training",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Very easy",
  2: "Easy",
  3: "Just right",
  4: "Hard",
  5: "Very hard",
};
