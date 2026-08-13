/**
 * Extra catalog names for the 400+ exercise expansion.
 * Seeded by supabase/migrations/20260813121000_exercise_catalog_expansion.sql
 */
export type CatalogSeedRow = {
  name: string;
  category: "strength" | "cardio" | "endurance";
  primary_muscle: string;
  equipment: "free_weight" | "machine" | "bodyweight";
  tracking_type: "weight_reps" | "reps_only" | "duration" | "distance";
  aliases: string[];
};

const BARBELL = [
  "Incline Barbell Bench Press",
  "Decline Barbell Bench Press",
  "Close-Grip Bench Press",
  "Pause Bench Press",
  "Spoto Press",
  "Floor Press",
  "Barbell Push Press",
  "Barbell Push Jerk",
  "Seated Barbell Overhead Press",
  "Barbell Behind-the-Neck Press",
  "Landmine Press",
  "Landmine Row",
  "Meadows Row",
  "Pendlay Row",
  "Yates Row",
  "Barbell Shrug",
  "Barbell Upright Row",
  "Good Morning",
  "Safety Bar Squat",
  "Pause Squat",
  "Box Squat",
  "Anderson Squat",
  "Zercher Squat",
  "Hatfield Squat",
  "Barbell Split Squat",
  "Barbell Walking Lunge",
  "Barbell Reverse Lunge",
  "Barbell Step-Up",
  "Barbell Hip Thrust Pause",
  "Barbell Glute Bridge",
  "Deficit Deadlift",
  "Rack Pull",
  "Snatch-Grip Deadlift",
  "Stiff-Leg Deadlift",
  "Trap Bar Deadlift",
  "Trap Bar Jump",
  "Barbell Calf Raise",
  "Barbell Wrist Curl",
  "Barbell Reverse Wrist Curl",
  "EZ-Bar Curl",
  "EZ-Bar Preacher Curl",
  "EZ-Bar Skull Crusher",
  "JM Press",
  "Barbell Rollout",
];

const DUMBBELL = [
  "Incline Dumbbell Bench Press",
  "Decline Dumbbell Bench Press",
  "Dumbbell Floor Press",
  "Dumbbell Squeeze Press",
  "Dumbbell Pullover",
  "Incline Dumbbell Fly",
  "Dumbbell Arnold Press",
  "Dumbbell Z Press",
  "Dumbbell Push Press",
  "Dumbbell Lateral Raise",
  "Dumbbell Front Raise",
  "Dumbbell Rear Delt Fly",
  "Chest-Supported Dumbbell Row",
  "Dumbbell Seal Row",
  "Dumbbell Shrug",
  "Dumbbell Walking Lunge",
  "Dumbbell Reverse Lunge",
  "Dumbbell Step-Up",
  "Dumbbell Bulgarian Split Squat",
  "Dumbbell Hip Thrust",
  "Dumbbell Calf Raise",
  "Dumbbell Farmer Carry",
  "Dumbbell Suitcase Carry",
  "Dumbbell Overhead Carry",
  "Concentration Curl",
  "Incline Dumbbell Curl",
  "Dumbbell Preacher Curl",
  "Dumbbell Spider Curl",
  "Overhead Dumbbell Extension",
  "Dumbbell Floor Skull Crusher",
  "Dumbbell Kickback",
  "Dumbbell Side Bend",
  "Weighted Crunch",
];

const MACHINE = [
  "Incline Chest Press Machine",
  "Decline Chest Press Machine",
  "Iso-Lateral Chest Press",
  "Cable Crossover High",
  "Cable Crossover Low",
  "Pec Deck Reverse",
  "Lat Pulldown Wide",
  "Lat Pulldown Neutral",
  "Lat Pulldown Close",
  "Straight-Arm Pulldown",
  "Cable Row Wide",
  "Cable Row Close",
  "Chest-Supported T-Bar Row",
  "Iso-Lateral Row",
  "Assisted Chin-Up",
  "Smith Machine Incline Press",
  "Smith Machine Overhead Press",
  "Smith Machine Lunge",
  "Smith Machine Calf Raise",
  "Leg Press High Foot",
  "Leg Press Low Foot",
  "Single-Leg Leg Press",
  "Hack Squat Narrow",
  "Pendulum Squat",
  "Belt Squat",
  "Lying Leg Curl",
  "Standing Leg Curl",
  "Adductor Machine",
  "Abductor Machine",
  "Standing Calf Machine",
  "Seated Calf Machine",
  "Cable Face Pull",
  "Cable Rear Delt Fly",
  "Cable Front Raise",
  "Cable Y Raise",
  "Cable Hammer Curl",
  "Cable Overhead Extension",
  "Cable Pushdown V-Bar",
  "Cable Pushdown Rope",
  "Cable Crunch",
  "Cable Woodchop",
  "Cable Pallof Press",
  "Ab Wheel Machine",
  "Glute Kickback Machine",
  "Hip Thrust Machine",
  "Back Extension Machine",
  "Treadmill Run",
  "Treadmill Walk",
  "Assault Bike",
  "Echo Bike",
  "SkiErg",
  "Recumbent Bike",
];

const BODYWEIGHT = [
  "Knee Push-Up",
  "Incline Push-Up",
  "Decline Push-Up",
  "Diamond Push-Up",
  "Archer Push-Up",
  "Pseudo Planche Push-Up",
  "Pike Push-Up",
  "Handstand Hold",
  "Wall Handstand Push-Up",
  "Ring Push-Up",
  "Ring Row",
  "Ring Dip",
  "Negative Pull-Up",
  "Band-Assisted Pull-Up",
  "Wide-Grip Pull-Up",
  "Commando Pull-Up",
  "Muscle-Up",
  "Bar Dip",
  "Bench Dip",
  "Pistol Squat",
  "Shrimp Squat",
  "Cossack Squat",
  "Jump Squat",
  "Broad Jump",
  "Tuck Jump",
  "Split Squat Jump",
  "Nordic Curl",
  "Reverse Nordic",
  "Sliding Leg Curl",
  "Single-Leg Glute Bridge",
  "Frog Pump",
  "Hip Airplane",
  "Dead Bug",
  "Bird Dog",
  "Hollow Rock",
  "V-Up",
  "Hanging Knee Raise",
  "Hanging Leg Raise",
  "Toes-to-Bar",
  "L-Sit",
  "Plank Shoulder Tap",
  "RKC Plank",
  "Copenhagen Plank",
  "Bear Crawl",
  "Crab Walk",
  "Inchworm",
  "World's Greatest Stretch",
  "90/90 Hip Switch",
  "Couch Stretch Hold",
  "Wall Sit",
  "Calf Raise Bodyweight",
  "Single-Leg Calf Raise",
  "Sled Drag",
  "Farmer Carry Bodyweight March",
];

const BANDS_AS_FREE = [
  "Band Pull-Apart",
  "Band Face Pull",
  "Band Chest Press",
  "Band Row",
  "Band Deadlift",
  "Band Good Morning",
  "Band Squat",
  "Band Lateral Walk",
  "Band Glute Kickback",
  "Band Bicep Curl",
  "Band Tricep Pushdown",
  "Band Pallof Press",
  "Band Dislocate",
  "Band Overhead Press",
  "Band Romanian Deadlift",
  "Kettlebell Goblet Squat",
  "Kettlebell Front Squat",
  "Kettlebell Deadlift",
  "Kettlebell RDL",
  "Kettlebell Clean",
  "Kettlebell Snatch",
  "Kettlebell Clean and Press",
  "Kettlebell Push Press",
  "Kettlebell Windmill",
  "Kettlebell Halo",
  "Kettlebell High Pull",
  "Kettlebell Thruster",
  "Kettlebell Turkish Get-Up",
  "Kettlebell Floor Press",
  "Kettlebell Row",
  "Kettlebell Bottoms-Up Press",
  "Cable Kickback",
  "Cable Pull-Through",
  "Cable Hip Abduction",
  "Single-Arm Cable Chest Press",
  "Single-Arm Cable Row",
  "Cable External Rotation",
  "Smith Machine Decline Press",
  "Smith Machine Row",
  "Smith Machine Hip Thrust",
  "Smith Machine Romanian Deadlift",
  "Outdoor Sprint Intervals",
  "Hill Repeat Run",
  "Tempo Run",
  "Easy Jog",
  "Ruck Walk",
  "Jump Rope Intervals",
  "Shadow Boxing",
  "Swim Freestyle",
  "Power Clean",
  "Hang Clean",
  "Power Snatch",
  "Hang Snatch",
  "Push Jerk",
  "Split Jerk",
  "Overhead Squat",
  "Suitcase Deadlift",
  "Waiter Carry",
  "Front Rack Carry",
  "Sandbag Clean",
  "Sandbag Bear Hug Squat",
  "Tire Flip",
  "Medicine Ball Chest Pass",
  "Landmine Rotation",
  "Landmine Squat to Press",
  "Pause Deadlift",
  "Tempo Squat",
  "Pin Bench Press",
  "Swiss Bar Bench",
  "Neutral-Grip Pull-Up",
  "Clap Push-Up",
  "Hindu Push-Up",
  "Dead Hang",
  "YTW Raise",
  "Wall Slide",
  "McGill Curl-Up",
  "Stir the Pot",
  "Scapular Pull-Up",
  "Prone Cobra",
  "Cat Cow",
];

const EXTRA_TO_400 = [
  "Pause RDL",
  "Sumo Pause Deadlift",
  "Jefferson Deadlift",
  "Board Press",
  "Pin Squat",
  "Swiss Bar Overhead Press",
  "Cambered Bar Bench",
  "Barbell Curl 21s",
  "Close-Grip Incline Bench",
  "Dumbbell Cuban Press",
  "Renegade Row",
  "Dumbbell Thruster",
  "Dumbbell Snatch",
  "Dumbbell Clean",
  "Single-Arm Dumbbell Bench",
  "Dumbbell Deficit RDL",
  "Tate Press",
  "Cross-Body Hammer Curl",
  "Hammer Strength Iso Row",
  "Reverse Hyper",
  "GHD Hip Extension",
  "GHD Sit-Up",
  "Vertical Leg Press",
  "Preacher Curl Machine",
  "Tricep Dip Machine",
  "Ab Crunch Machine",
  "Stair Climber",
  "Jacob's Ladder",
  "Row Erg Steady State",
  "Air Bike Intervals",
  "Elliptical",
  "Archer Pull-Up",
  "Chest-to-Bar Pull-Up",
  "Jumping Pull-Up",
  "Skin the Cat",
  "Front Lever Tuck",
  "Planche Lean",
  "Handstand Walk",
  "Plyo Push-Up",
  "Sissy Squat",
  "ATG Split Squat",
  "Lateral Lunge",
  "Curtsy Lunge",
  "Jumping Lunge",
  "Box Jump",
  "Depth Jump",
  "Burpee",
  "Mountain Climber",
  "High Knees",
  "Jumping Jack",
  "Superman Hold",
  "Side Plank Hip Dip",
  "Hollow Hold",
  "Dragon Flag Negative",
  "Clean Pull",
  "Snatch Pull",
  "Hang Power Clean",
  "Hang Power Snatch",
  "Muscle Snatch",
  "Log Press",
  "Yoke Carry",
  "Farmers Walk Heavy",
  "Sled Push",
  "Sled Pull",
  "Battle Rope Waves",
  "Medicine Ball Slam",
  "Wall Ball",
  "Rotational Med Ball Throw",
  "Banded Hip Turn",
  "Lateral Bound",
  "A-Skip",
  "Carioca",
  "Half Kneeling Chop",
  "Cable Lateral Raise",
  "Cable Upright Row",
  "Low Cable Row",
  "High Cable Row",
  "Pec Deck Fly",
  "Shoulder Press Machine",
  "Hack Squat Wide",
  "Belt Squat March",
  "Neck Harness",
  "Wrist Roller",
  "Seated Dip Machine",
  "Torso Rotation Machine",
  "VersaClimber",
  "Typewriter Pull-Up",
  "German Hang",
  "Back Lever Tuck",
  "Frog Stand",
  "Hindu Squat",
  "Butt Kick",
  "Burpee Broad Jump",
  "Arch Hold",
  "Hanging Windshield Wiper",
  "Tall Clean",
  "Axle Deadlift",
  "Sandbag Shouldering",
  "Stone Load",
  "B-Skip",
  "Half Kneeling Lift",
  "90/90 Hip Lift",
  "Cable Shrug",
  "Machine Rear Delt",
  "Chest Press Neutral Grip",
  "Single-Arm Landmine Press",
  "Single-Leg RDL",
  "Pause Hip Thrust",
  "Seated Good Morning",
  "Banded Push-Up",
  "Ring Support Hold",
  "Tuck Front Lever Row",
  "Dips Weighted",
  "Pull-Up Weighted",
  "Chin-Up Weighted",
  "Walking Lunge Bodyweight",
  "Bear Hug Sandbag Carry",
  "Sled March",
  "Tempo Push-Up",
  "Isometric Split Squat",
  "Copenhagen Raise",
];

function slugishAliases(name: string): string[] {
  const short = name
    .replace(/Dumbbell/g, "DB")
    .replace(/Barbell/g, "BB")
    .replace(/Machine/g, "machine");
  return short === name ? [] : [short];
}

export function extraCatalogSeed(): CatalogSeedRow[] {
  const rows: CatalogSeedRow[] = [];
  for (const name of BARBELL) {
    rows.push({
      name,
      category: "strength",
      primary_muscle: muscleGuess(name),
      equipment: "free_weight",
      tracking_type: "weight_reps",
      aliases: slugishAliases(name),
    });
  }
  for (const name of DUMBBELL) {
    rows.push({
      name,
      category: "strength",
      primary_muscle: muscleGuess(name),
      equipment: "free_weight",
      tracking_type: name.includes("Carry") ? "distance" : "weight_reps",
      aliases: slugishAliases(name),
    });
  }
  for (const name of MACHINE) {
    const cardio = /Treadmill|Bike|SkiErg|Assault|Echo|Recumbent/.test(name);
    rows.push({
      name,
      category: cardio ? "cardio" : "strength",
      primary_muscle: cardio ? "cardio" : muscleGuess(name),
      equipment: "machine",
      tracking_type: cardio
        ? name.includes("Run") || name.includes("Walk")
          ? "distance"
          : "duration"
        : "weight_reps",
      aliases: slugishAliases(name),
    });
  }
  for (const name of BODYWEIGHT) {
    const duration = /Hold|Sit|Stretch|Plank|Handstand Hold|Wall Sit/.test(
      name,
    );
    const distance = /Crawl|Walk|Drag|March/.test(name);
    rows.push({
      name,
      category: distance ? "endurance" : "strength",
      primary_muscle: muscleGuess(name),
      equipment: "bodyweight",
      tracking_type: duration
        ? "duration"
        : distance
          ? "distance"
          : "reps_only",
      aliases: slugishAliases(name),
    });
  }
  for (const name of BANDS_AS_FREE) {
    rows.push({
      name,
      category: "strength",
      primary_muscle: muscleGuess(name),
      equipment: "free_weight",
      tracking_type: "weight_reps",
      aliases: [name.replace("Band ", "")],
    });
  }
  for (const name of EXTRA_TO_400) {
    const cardio = /Climber|Elliptical|Erg|Air Bike|Jacob|Stair|Skip|Carioca|High Knees|Jumping Jack/.test(
      name,
    );
    const duration = /Hold|Sit|Walk|March/.test(name);
    const distance = /Carry|Walk|Push|Pull|March/.test(name) && !duration;
    rows.push({
      name,
      category: cardio ? "cardio" : "strength",
      primary_muscle: cardio ? "cardio" : muscleGuess(name),
      equipment: /Machine|Erg|Climber|Elliptical|Press Machine|Pec Deck|Hyper|GHD/.test(
        name,
      )
        ? "machine"
        : /Pull-Up|Push-Up|Hold|Plank|Lunge|Squat|Burpee|Jump|Skip|Carioca|Hollow|Arch|Lever|Planche|Handstand|Chin-Up|Dip/.test(
              name,
            ) && !/Dumbbell|Barbell|Cable|Sandbag|Log|Yoke|Sled|Weighted/.test(name)
          ? "bodyweight"
          : "free_weight",
      tracking_type: cardio
        ? "duration"
        : duration
          ? "duration"
          : distance
            ? "distance"
            : /Pull-Up|Push-Up|Hold|Burpee|Jump|Lunge|Squat|Dip/.test(name) &&
                !/Dumbbell|Barbell|Weighted|Machine/.test(name)
              ? "reps_only"
              : "weight_reps",
      aliases: slugishAliases(name),
    });
  }
  return rows;
}

function muscleGuess(name: string): string {
  const n = name.toLowerCase();
  if (/bench|chest|pec|fly|squeeze|crossover/.test(n)) return "chest";
  if (/row|pulldown|pull-up|chin|lat|meadows|seal|face pull/.test(n))
    return "back";
  if (/overhead|shoulder|lateral|rear delt|arnold|y raise|handstand/.test(n))
    return "shoulders";
  if (/curl|chin/.test(n)) return "biceps";
  if (/tricep|skull|extension|pushdown|dip|jm press/.test(n)) return "triceps";
  if (/squat|lunge|step-up|leg press|hack|extension|pistol|cossack/.test(n))
    return "quads";
  if (/rdl|deadlift|hamstring|leg curl|nordic|good morning/.test(n))
    return "hamstrings";
  if (/hip thrust|glute|frog|kickback|abductor/.test(n)) return "glutes";
  if (/calf/.test(n)) return "calves";
  if (/crunch|plank|dead bug|hollow|v-up|woodchop|pallof|rollout|l-sit/.test(n))
    return "core";
  if (/shrug/.test(n)) return "traps";
  if (/wrist/.test(n)) return "forearms";
  if (/carry|sled|crawl/.test(n)) return "full_body";
  if (/run|walk|bike|ski|treadmill/.test(n)) return "cardio";
  return "full_body";
}
