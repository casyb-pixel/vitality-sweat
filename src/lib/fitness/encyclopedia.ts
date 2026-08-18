/**
 * Hunter-voice encyclopedia overlays for public /exercises/[slug] pages.
 * Review in git. Not Hunter's Daily Brief.
 *
 * Aug 17 batch lives in this file. Later review batches are imported below.
 * Cluster order: beginner, then tools (see catalog.ts), then lift cues.
 */

import { ENCYCLOPEDIA_BATCH_2026_08_18 } from "./encyclopedia-batch-2026-08-18";

export type EncyclopediaCluster = "beginner" | "train";

export type EncyclopediaPage = {
  slug: string;
  name: string;
  cluster: EncyclopediaCluster;
  /** Review batch date. Hub "start here" stays on 2026-08-17. */
  batch?: string;
  eyebrow: string;
  primaryMuscle: string;
  equipment: "free_weight" | "machine" | "bodyweight";
  trackingType: "weight_reps" | "reps_only" | "duration" | "distance";
  description: string;
  lede: string;
  hunterNote: string;
  cues: string[];
  setup: string;
  mistakes: string;
  body: { h2: string; p: string }[];
  faqs: { q: string; a: string }[];
  engineCta: string;
  relatedTools: string[];
  relatedSlugs: string[];
};

/** First public batch. Hub "start here" uses this. */
export const FEATURED_ENCYCLOPEDIA_BATCH = "2026-08-17";

/** Parent review batch in the current PR. Tools live in src/lib/tools/catalog.ts. */
export const ENCYCLOPEDIA_BATCH_LABEL = "Aug 18, 2026";

export const ENCYCLOPEDIA_PAGES: EncyclopediaPage[] = [
  {
    slug: "goblet-squat",
    name: "Goblet Squat",
    cluster: "beginner",
    eyebrow: "First squat that makes sense",
    primaryMuscle: "quads",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "How to goblet squat without looking lost. Cup the bell, sit between your knees, own the last inch. Log it in Vitality Engine.",
    lede: "This is the squat I give people on day one. You can see the weight. You can brace. You still own the bottom.",
    hunterNote:
      "If your first week is a barbell back squat because a video told you to, slow down. Goblet first. Then we talk bar.",
    cues: [
      "Cup the dumbbell or kettlebell at your chest like you are holding a bowl.",
      "Elbows stay inside your knees as you sit down.",
      "Brace like someone is about to poke you in the stomach.",
      "Heels stay planted. Own the last inch at the bottom.",
      "Stand up like you are pushing the floor away, not hopping forward.",
    ],
    setup:
      "Grab a dumbbell or kettlebell you can hold for 8-10 honest reps. Stand with feet about shoulder width. Toes can turn out a little. Hold the weight at your chest, not hanging off your wrists. Take a breath, then sit.",
    mistakes:
      "The usual miss is shooting the knees forward and letting the chest collapse. If the bell drifts away from you, you lost the brace. If your heels peel up, shorten the depth until they stay down. Depth is earned, not copied from a screenshot.",
    body: [
      {
        h2: "Why this is the day-one squat",
        p: "A goblet squat teaches you to sit between your legs instead of folding in half. The weight in front is a counterbalance, so you can find depth without a bar on your back. That matters when the gym still feels like someone else's building. You are learning a pattern you will keep when the load gets heavier.",
      },
      {
        h2: "A 45-minute first session",
        p: "Warm up with a bodyweight squat. Then 3 sets of 8-10 goblet squats. Rest about 90 seconds. Pair it with a push-up or chest-press machine and a row. That is a real session. You do not need six extra isolation moves because a random list told you to.",
      },
      {
        h2: "When to progress",
        p: "If 10 reps feel easy and the last inch is still yours, go up 5 pounds next time. If the last two reps get ugly, stay. Ugly reps are not a personality. Log the working weight in Engine so next session is same-as-last, not guesswork.",
      },
    ],
    faqs: [
      {
        q: "Dumbbell or kettlebell?",
        a: "Whichever your gym has. Hold it tight to your chest. The shape of the bell matters less than the brace.",
      },
      {
        q: "How low should I go?",
        a: "As low as you can keep heels down and chest proud. Parallel is a good first target. Do not bounce.",
      },
    ],
    engineCta:
      "Log the goblet squat in the free Vitality Engine before you leave. Same-as-last next time.",
    relatedTools: ["plate-calculator"],
    relatedSlugs: ["bodyweight-squat", "push-up", "plank"],
  },
  {
    slug: "push-up",
    name: "Push-Up",
    cluster: "beginner",
    eyebrow: "Dorm or gym floor",
    primaryMuscle: "chest",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Push-up cues that still count: rigid plank, chest to a fist, no sagging hips. Log every set in Vitality Engine.",
    lede: "A push-up is a moving plank. If your hips sag, you are not training your press. You are leaking.",
    hunterNote:
      "I would rather see 6 clean reps on an incline than 20 sloppy ones on the floor. Pride is not a set.",
    cues: [
      "Hands under shoulders, not out by your ears.",
      "Squeeze your glutes so your hips stay in one line.",
      "Lower until your chest would touch a fist on the floor.",
      "Elbows about 45 degrees from your torso, not flared to 90.",
      "Push the floor away. Neck stays long. Do not crane.",
    ],
    setup:
      "Set your hands a little wider than your shoulders. Walk your feet back until your body is one board. Eyes on a spot on the floor in front of you. That is the start. If the floor is too hard, put your hands on a bench. That is still a push-up.",
    mistakes:
      "Hips piked to the ceiling, or hips dumped to the floor. Both skip the hard part. If you cannot keep the line, raise the hands. Do not add a clap, a diamond, or a weighted vest until the regular one looks like a plank.",
    body: [
      {
        h2: "Dorm version that still counts",
        p: "Hands on a desk, bed frame, or counter. Same cues. Same logging. You are not cheating. You are picking a height you can own. When 10 reps feel honest, drop one level closer to the floor.",
      },
      {
        h2: "Gym version",
        p: "After your squat or press, do 3 sets of as many clean push-ups as you can stop two reps before failure. That last ugly rep does not make you tougher. It teaches your shoulders a bad story.",
      },
      {
        h2: "How I count them",
        p: "Only the reps that keep the line. If you need a knee version, log knee push-ups as their own movement. Do not mix them in one set and pretend the number means the same thing next week.",
      },
    ],
    faqs: [
      {
        q: "Are knee push-ups fake?",
        a: "No. They are a regression. Log them honestly. Progress toward the full plank line.",
      },
      {
        q: "Should I go chest to the floor?",
        a: "Chest to a fist is enough for most people. If your shoulders complain, stop the set and raise the hands.",
      },
    ],
    engineCta:
      "Open the free Vitality Engine and log the push-up set with the height you actually used.",
    relatedTools: [],
    relatedSlugs: ["incline-push-up", "plank", "chest-press-machine"],
  },
  {
    slug: "plank",
    name: "Plank",
    cluster: "beginner",
    eyebrow: "Brace you can feel",
    primaryMuscle: "core",
    equipment: "bodyweight",
    trackingType: "duration",
    description:
      "A plank is a brace, not a minute-long contest. Ribs down, glutes on, breathe. Log the seconds in Vitality Engine.",
    lede: "I do not chase five-minute planks. I chase a brace I can take to a squat.",
    hunterNote:
      "If you are shaking and your low back is screaming, you already lost. Reset shorter and tighter.",
    cues: [
      "Elbows under shoulders, or hands under shoulders for a high plank.",
      "Squeeze glutes like you are pinching a card.",
      "Ribs down. Do not pour into your low back.",
      "Breathe. A held breath is not a brace you can use under a bar.",
      "Stop while the line is still honest.",
    ],
    setup:
      "Forearms on the floor, feet together or hip width. Push the floor away so you are not hanging on your shoulders. Think tall through the crown of your head. Start a timer. Stop when the line breaks.",
    mistakes:
      "Hips too high (a tent) or too low (a hammock). Both fake the time. Also: craning the neck to watch the clock. Set the phone where you can see it without breaking position.",
    body: [
      {
        h2: "Time is not the flex",
        p: "Three sets of 20-40 honest seconds beat one sloppy minute. The plank is there so your next goblet squat has a midsection that does not fold. If you play baseball or lift, that is the job.",
      },
      {
        h2: "Pair it, then leave",
        p: "Finish a full-body day with planks. Log the seconds. Next week, add 5 seconds or keep the time and make it quieter. Quiet means less shaking, same line.",
      },
    ],
    faqs: [
      {
        q: "High plank or forearm?",
        a: "Forearm if your wrists complain. High plank if you want it closer to a push-up. Same brace either way.",
      },
      {
        q: "Should I add weight?",
        a: "Not until 40 seconds looks easy and your back stays quiet. A plate on your back is a later problem.",
      },
    ],
    engineCta:
      "Log plank time in the free Vitality Engine. Duration counts. Guessing does not.",
    relatedTools: [],
    relatedSlugs: ["push-up", "goblet-squat", "farmer-carry"],
  },
  {
    slug: "bodyweight-squat",
    name: "Bodyweight Squat",
    cluster: "beginner",
    eyebrow: "No bar, still a squat",
    primaryMuscle: "quads",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Air squat cues for first gym and dorm sessions. Heels down, sit between your knees, log the reps in Vitality Engine.",
    lede: "If you cannot own a bodyweight squat, a bar will not teach you. This is the pattern. Then we add a goblet.",
    hunterNote:
      "I film these at home when I cannot get to the gym. They still count if the reps are honest.",
    cues: [
      "Feet about shoulder width. Toes can turn out a little.",
      "Reach the hips back and down like you are sitting on a low box.",
      "Heels stay glued. If they rise, shorten the depth.",
      "Chest stays proud. Arms can reach forward for balance.",
      "Stand up all the way. Squeeze at the top. No lazy lockout.",
    ],
    setup:
      "Clear a space. You do not need a rack. You need floor and a wall behind you if you want a target. Sit until your hip crease is near your knee, then stand. That is one.",
    mistakes:
      "Knees caving in, or turning it into a good-morning by shooting the hips up first. If your chest dives, slow down and sit between your feet. A doorframe you can hold is fine while you learn.",
    body: [
      {
        h2: "Dorm session",
        p: "3 sets of 10-15. Pair with incline push-ups on the desk and a backpack row if you have a bag. Twenty minutes. Log it. That is more training than scrolling a perfect program you will not follow.",
      },
      {
        h2: "Then add load",
        p: "When 15 reps look like the cues, pick up a dumbbell and go to the goblet squat page. Same pattern. Now it has a number Engine can track.",
      },
    ],
    faqs: [
      {
        q: "Do I need to go ass to grass?",
        a: "No. Own a depth you can repeat. Mobility comes with practice, not with forcing a screenshot depth.",
      },
    ],
    engineCta:
      "Log bodyweight squats in the free Vitality Engine even when there is no weight. Reps still count.",
    relatedTools: [],
    relatedSlugs: ["goblet-squat", "incline-push-up"],
  },
  {
    slug: "incline-push-up",
    name: "Incline Push-Up",
    cluster: "beginner",
    eyebrow: "The honest regression",
    primaryMuscle: "chest",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Incline push-up how-to: hands on a bench or desk, same plank line as a floor push-up. Log the height in Vitality Engine.",
    lede: "Hands up on a bench is not a lesser push-up. It is the version you can own today.",
    hunterNote:
      "I use a bench when my floor push-ups start cheating. The line matters more than the floor.",
    cues: [
      "Hands on a stable bench, box, or desk. Not a folding chair that slides.",
      "Walk your feet back until your body is one line.",
      "Lower your chest toward the edge. Elbows about 45 degrees.",
      "Push the surface away. Hips stay with you.",
      "Match the same height every set this week so the log means something.",
    ],
    setup:
      "Pick one surface and stay there for the session. The higher the hands, the easier it is. Start high enough that 8 reps look like a plank. That is your working height.",
    mistakes:
      "Flaring elbows, shrugging into your neck, or letting the hips sag because the bench feels easier. Easier is not permission to get sloppy.",
    body: [
      {
        h2: "How to progress without ego",
        p: "When 10 reps at this height are quiet, drop the hands to a lower bench or a stair. Do not jump straight to the floor if the last 3 reps turn into a worm. Engine should see the same movement name plus a note if you change height.",
      },
      {
        h2: "First gym, first press",
        p: "If barbell bench feels like a crowd, start here. Then chest-press machine. Then dumbbells. You can still leave in 45 minutes looking like you had a plan.",
      },
    ],
    faqs: [
      {
        q: "Is a wall push-up worth logging?",
        a: "Yes, if that is the height you can own. Call it what it is. Next week, try a counter.",
      },
    ],
    engineCta:
      "Log incline push-ups in the free Vitality Engine. Put the surface in the notes so next week is honest.",
    relatedTools: [],
    relatedSlugs: ["push-up", "chest-press-machine"],
  },
  {
    slug: "dumbbell-row",
    name: "Dumbbell Row",
    cluster: "beginner",
    eyebrow: "One-arm pull you can feel",
    primaryMuscle: "back",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Dumbbell row cues: hand on a bench, pull to the hip, no twist. Log both sides in Vitality Engine.",
    lede: "Plant one hand. Pull the other to your hip. Your torso stays quiet. That is the whole lift.",
    hunterNote:
      "If you have to rotate your shoulders to finish the rep, the bell is too heavy. I have done that. It is not a back set.",
    cues: [
      "Hand and knee on a bench, or hand on a rack, opposite foot on the floor.",
      "Back flat like a table. Neck long.",
      "Pull the dumbbell to your hip pocket, not up by your ear.",
      "Squeeze at the top. Pause a beat. Do not bounce.",
      "Lower under control. The stretch is part of the rep.",
    ],
    setup:
      "You need one dumbbell and a bench. Square your hips. If the bench is busy, brace your hand on a rack at about hip height. Same cues. Row both sides. Log the same weight unless one side is clearly weaker, then note it.",
    mistakes:
      "Yanking with the neck. Shrugging. Using a twist to finish. Also: standing almost upright so it becomes a shrug. Hinge enough that the bell can hang.",
    body: [
      {
        h2: "Why rows belong in week one",
        p: "Pressing without pulling is how shoulders get cranky. A dumbbell row is simple enough for a crowded gym. You are not waiting on a cable stack. You are not performing. You are filling your back.",
      },
      {
        h2: "Sets that fit 45 minutes",
        p: "3 sets of 8-10 each side after your squat and press. Rest about 90 seconds. If you cannot remember the weight, that is why Engine exists.",
      },
    ],
    faqs: [
      {
        q: "Should I row both arms at once?",
        a: "Two-arm chest-supported is a different page. One-arm teaches you to keep the torso quiet. Start here.",
      },
    ],
    engineCta:
      "Log each side in the free Vitality Engine. Same weight both sides unless you wrote a reason.",
    relatedTools: [],
    relatedSlugs: ["chest-supported-dumbbell-row", "lat-pulldown"],
  },
  {
    slug: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    cluster: "beginner",
    eyebrow: "Hinge without a bar",
    primaryMuscle: "hamstrings",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Dumbbell RDL how-to: push the hips back, soft knees, quiet back. Log the hinge in Vitality Engine.",
    lede: "This is a hip hinge, not a squat with dumbbells in your hands. Push the hips back. The bells slide down your legs.",
    hunterNote:
      "I cue this as 'close the car door with your hips.' If the bells float out in front, you turned it into a good-morning.",
    cues: [
      "Stand tall. Soft knees. Not a deep squat.",
      "Brace. Then push the hips back like you are closing a car door.",
      "Bells stay close to your legs. Shins stay mostly vertical.",
      "Stop when you feel hamstrings, not when your back rounds.",
      "Drive the hips forward to stand. Squeeze at the top. Do not lean back.",
    ],
    setup:
      "Two dumbbells at your sides. You can start from a standing hold. You do not need to pick them off the floor like a conventional deadlift. That is a different lift. This one lives in the hinge.",
    mistakes:
      "Bending the knees so much it becomes a squat. Rounding to chase depth. Yanking the neck up to look in the mirror. Watch a spot on the floor a few feet ahead.",
    body: [
      {
        h2: "First hinge on a school schedule",
        p: "After goblet squats, 3 sets of 8-10 RDLs. You will feel hamstrings tomorrow. That is training, not a medical event. If something sharp shows up, stop and tell a parent or coach. This page is not a clinic.",
      },
      {
        h2: "Why dumbbells first",
        p: "A barbell RDL is great later. Dumbbells let you learn the hip path without a bar pinning you. When the path is quiet, you can move to a bar and use the plate calculator so loading is not a math test between sets.",
      },
    ],
    faqs: [
      {
        q: "How far down should the bells go?",
        a: "Usually mid-shin. Flexibility is not the goal. A long, honest hinge is the goal.",
      },
    ],
    engineCta:
      "Log dumbbell RDLs in the free Vitality Engine. Hinge work needs a number, not a vibe.",
    relatedTools: ["plate-calculator"],
    relatedSlugs: ["goblet-squat", "farmer-carry"],
  },
  {
    slug: "farmer-carry",
    name: "Farmer Carry",
    cluster: "beginner",
    eyebrow: "Pick it up and walk",
    primaryMuscle: "full_body",
    equipment: "free_weight",
    trackingType: "distance",
    description:
      "Farmer carry cues for first gym weeks: tall, quiet grip, short steps. Log distance or time in Vitality Engine.",
    lede: "Pick up two heavy things. Walk like you have somewhere to be. Put them down like an adult.",
    hunterNote:
      "This is the lift that makes a grocery run feel easy. Also the one that tells you if your grip quit before your legs did.",
    cues: [
      "Stand tall. Ribs down. Do not lean back.",
      "Squeeze the handles like you mean it.",
      "Short, quick steps. Eyes forward.",
      "If one side dips, you are shrugging. Reset the shoulder down.",
      "Set the weights down with a hinge, not a crash.",
    ],
    setup:
      "Two dumbbells or kettlebells you can hold for a walk across the gym. If the gym is packed, walk a rectangle that does not cut through someone's set. Time or distance. Pick one and repeat it weekly.",
    mistakes:
      "Leaning. Racing. Dropping from mid-thigh because you got bored. Also: going so heavy you have to lean. The carry should look like walking, just denser.",
    body: [
      {
        h2: "Why it belongs in a beginner week",
        p: "Carries train grip, brace, and the kind of toughness that is useful on a field. They also end a session without another machine. Three trips. Log it. Leave.",
      },
      {
        h2: "How I track it",
        p: "Distance if you have a path. Time if you do not. Engine can take either. Do not mix them week to week or the log turns into fog.",
      },
    ],
    faqs: [
      {
        q: "One bell or two?",
        a: "Two for a farmer carry. One bell at your side is a suitcase carry. Different. Log the name you actually did.",
      },
    ],
    engineCta:
      "Log the farmer carry in the free Vitality Engine as distance or time. Pick one and keep it.",
    relatedTools: [],
    relatedSlugs: ["dumbbell-row", "plank"],
  },
  {
    slug: "lat-pulldown",
    name: "Lat Pulldown",
    cluster: "train",
    eyebrow: "Pull you can control",
    primaryMuscle: "back",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Lat pulldown cues: sit tall, pull to the upper chest, no behind-the-neck. Log the stack in Vitality Engine.",
    lede: "Sit. Grab. Pull the bar to your upper chest. Your torso stays tall. Behind-the-neck is not a personality.",
    hunterNote:
      "If you have to lean way back to finish, the stack is too heavy. I have watched that set. It is not a lat set.",
    cues: [
      "Thighs locked under the pad. Sit on your sit bones, not your low back.",
      "Grab a little wider than shoulders. Palms forward is fine to start.",
      "Pull the bar to your upper chest. Lead with the elbows.",
      "Pause a beat. Do not bounce off your collarbones.",
      "Let the arms stretch up without shrugging into your ears.",
    ],
    setup:
      "Adjust the thigh pad so you cannot lift off. Pick a grip you can control for 8-10. If the long bar feels chaotic, a neutral attachment is allowed. Same cues.",
    mistakes:
      "Yank, lean, bounce. Behind-the-neck pulldowns for no reason. Letting the stack slam. If the plates crash, you did not own the last inch.",
    body: [
      {
        h2: "Why the machine is not cheating",
        p: "Pull-ups are a goal. Pulldowns are how a lot of us get there without kipping in public. First gym month, this is the pull. Log the plate number on the stack. Next week, beat it or match it with cleaner reps.",
      },
      {
        h2: "Pair with a squat and a press",
        p: "Goblet squat, chest-press machine, pulldown. That is a full-body day. You do not need twelve machines because the floor layout looks like a tour.",
      },
    ],
    faqs: [
      {
        q: "Wide grip or close?",
        a: "Start medium. Wide is not more advanced. Close-neutral is a fine swap if your shoulders feel better.",
      },
    ],
    engineCta:
      "Log the lat pulldown stack in the free Vitality Engine. The number on the pin is the set.",
    relatedTools: [],
    relatedSlugs: ["dumbbell-row", "chest-supported-dumbbell-row"],
  },
  {
    slug: "chest-press-machine",
    name: "Chest Press Machine",
    cluster: "beginner",
    eyebrow: "Press without a spotter crowd",
    primaryMuscle: "chest",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Chest press machine cues for first gym weeks. Seat height, quiet wrists, own the last inch. Log it in Vitality Engine.",
    lede: "Seat so the handles hit mid-chest. Press until your elbows are long but not slammed. That is a press you can do without asking a stranger to spot.",
    hunterNote:
      "I still use this when the benches are full. It is not lesser. It is a press I can log and leave.",
    cues: [
      "Seat height: handles in line with mid-chest, not your neck.",
      "Back on the pad. Feet on the floor.",
      "Wrists stacked. Do not let them fold back.",
      "Press out. Own the last inch. Do not bounce the stack.",
      "Return until you feel a stretch you can control. Then press again.",
    ],
    setup:
      "Sit. Set the seat. Do a light set of 10 to confirm the path. Then your working sets. If the gym has a selectorized stack, write the pin number. If it is plate-loaded, use the plate calculator in your head or on your phone.",
    mistakes:
      "Seat too high so you press from the neck. Flaring elbows to 90 because it looks bigger. Short-changing the return because the weight was ego. Also: slamming the stack to announce you finished.",
    body: [
      {
        h2: "First gym, no audience",
        p: "Machines are how you train when you do not want a crowd around a barbell. That is allowed. You are still pressing. You are still logging. You can move to dumbbells when the path feels obvious.",
      },
      {
        h2: "A simple slot in 45 minutes",
        p: "After goblet squats, 3 sets of 8-10 here. Then a row. Then leave. If you want a tool page after, open 1RM later. You do not need a max on a machine your first month.",
      },
    ],
    faqs: [
      {
        q: "Is this as good as bench?",
        a: "It is a press. Bench is a different skill. Both can live in a week. Do not shame the machine because a comment section did.",
      },
    ],
    engineCta:
      "Log the chest-press machine in the free Vitality Engine. Pin number or plates, every working set.",
    relatedTools: ["one-rep-max", "plate-calculator"],
    relatedSlugs: ["push-up", "incline-push-up"],
  },
  {
    slug: "face-pull",
    name: "Face Pull",
    cluster: "train",
    eyebrow: "Shoulders that last a school year",
    primaryMuscle: "rear_delts",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Face pull cues: rope to your face, elbows high, no yanking. Accessory work you actually log in Vitality Engine.",
    lede: "Rope to your face. Elbows high. Pause. This is not a max-out. This is how your pressing stays available in April.",
    hunterNote:
      "I throw these in when I have pressed a lot. Light stack. Strict. If I have to lean, I dropped the pin.",
    cues: [
      "Set the cable around face height.",
      "Grab the rope ends. Step back so the stack is floating.",
      "Pull to your face. Elbows stay high, like a goal post.",
      "Externally rotate at the end: knuckles toward the wall behind you.",
      "Return slow. Do not let the stack dump.",
    ],
    setup:
      "You need a rope and a cable. If the rope is gone, two handles work. Light weight. 12-15 reps. This is not the lift you load to impress anyone walking by.",
    mistakes:
      "Turning it into an upright row with a shrug. Using so much stack that you have to jump. Pulling to your belt. If it does not finish near your face, it is a different row.",
    body: [
      {
        h2: "Why it is on a lift-cues week",
        p: "Beginners copy bench and skip the stuff that keeps shoulders durable. Face pulls are boring on purpose. Three sets at the end. Log them so they actually happen next session.",
      },
      {
        h2: "Band version at home",
        p: "Loop a band at face height. Same cues. Log it as a band face pull if that is what you did. Do not call it a cable set.",
      },
    ],
    faqs: [
      {
        q: "How heavy?",
        a: "Light enough that the last reps still rotate. If you cannot pause, it is too heavy.",
      },
    ],
    engineCta:
      "Log face pulls in the free Vitality Engine. Accessory work counts when it has a number.",
    relatedTools: [],
    relatedSlugs: ["lat-pulldown", "dumbbell-row"],
  },
  {
    slug: "chest-supported-dumbbell-row",
    name: "Chest-Supported Dumbbell Row",
    cluster: "train",
    eyebrow: "Row you cannot cheat",
    primaryMuscle: "back",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Chest-supported dumbbell row cues: 45-degree bench, pull to the hip, torso stays on the pad. Log it in Vitality Engine.",
    lede: "Lie on an incline bench. Row both bells. Your chest stays on the pad so you cannot turn it into a circus.",
    hunterNote:
      "This is the row I trust when I am tired. If the pad is there, I cannot swing. That is the point.",
    cues: [
      "Set the bench around 30-45 degrees. Chest on the pad. Head free.",
      "Let the bells hang. Shoulders long, not shrugged.",
      "Row to your hip pockets. Elbows follow, they do not flare to 90.",
      "Squeeze. Pause. The pad should still be in contact.",
      "Lower until you feel a stretch you can control.",
    ],
    setup:
      "Incline bench and two dumbbells. If the adjustable benches are all taken, the one-arm dumbbell row still exists. Do not wait 15 minutes for a pad. Train.",
    mistakes:
      "Ripping the chest off the pad to finish. Tiny range because the bells were too big. Letting the bells clang every rep. Also: setting the bench almost flat so you cannot breathe. Give your face a little room.",
    body: [
      {
        h2: "Why support beats ego",
        p: "A standing row lets you cheat with your hips. Chest support takes the hips out. You get a back set. That is useful in week one and week twelve. Log it as its own movement, not as a generic row, so the history stays clean.",
      },
      {
        h2: "Where it sits in a session",
        p: "After your hinge or squat. 3 sets of 8-10. Then a carry or a plank. Then you are done. If you want a how-to while you rest, this page is the rest.",
      },
    ],
    faqs: [
      {
        q: "What angle?",
        a: "Around 45 degrees is a good default. Steeper makes it more like an upright row. Flatter can feel like a seal row. Pick one and repeat it.",
      },
    ],
    engineCta:
      "Log chest-supported rows in the free Vitality Engine. Name the movement. Do not hide it inside a generic row.",
    relatedTools: [],
    relatedSlugs: ["dumbbell-row", "lat-pulldown"],
  },
  {
    slug: "leg-press",
    name: "Leg Press",
    cluster: "beginner",
    eyebrow: "Legs without a bar on your back",
    primaryMuscle: "quads",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Leg press cues for first gym weeks: full foot, controlled depth, no locked-out bounce. Log the plates in Vitality Engine.",
    lede: "Feet on the sled. Lower under control. Press the floor away. Do not turn it into a bounce contest.",
    hunterNote:
      "I like this when I am not ready to put a bar on my back, or when goblet squats already did the pattern work.",
    cues: [
      "Whole foot on the platform. Not just toes. Not just heels.",
      "Lower until your thighs are at a depth you can own without your low back peeling off.",
      "Press through the mid-foot. Knees track over toes.",
      "Do not slam the lockout. Soft finish.",
      "Keep your hands on the handles, not on your knees.",
    ],
    setup:
      "Sit. Safety catches where the gym wants them. Start lighter than your pride. A sled that is already loaded is not your working weight until you have felt the path.",
    mistakes:
      "Tiny range with a mountain of plates. Letting the seat round so your low back takes it. Bouncing out of the bottom. Also: loading every 45 in the gym because the guy next to you did.",
    body: [
      {
        h2: "Machine legs still count",
        p: "If squats feel like a stage, the leg press is a way to train quads and still leave in 45 minutes. Pair with a hinge and a carry. Log the plates. Use the plate calculator if the sled is plate-loaded and your brain is fried.",
      },
      {
        h2: "Depth you can repeat",
        p: "Match last week's depth. Chasing a deeper hole with more plates is how the set gets ugly. Ugly is not a PR.",
      },
    ],
    faqs: [
      {
        q: "High feet or low feet?",
        a: "Start with a stance that feels like a squat. High or low tweaks can wait. Same stance each week so the log is comparable.",
      },
    ],
    engineCta:
      "Log the leg press in the free Vitality Engine. Count the plates. Do not estimate from across the room.",
    relatedTools: ["plate-calculator"],
    relatedSlugs: ["goblet-squat", "bodyweight-squat"],
  },
  {
    slug: "seated-cable-row",
    name: "Seated Cable Row",
    cluster: "train",
    eyebrow: "Horizontal pull, stack you can see",
    primaryMuscle: "back",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Seated cable row cues: tall sit, pull to the ribs, no full-body rock. Log the stack in Vitality Engine.",
    lede: "Sit tall. Pull the handle to your ribs. Your torso is a post, not a rocking chair.",
    hunterNote:
      "If I see you leaning back like you are starting a boat, the stack won. Drop a plate. Row.",
    cues: [
      "Feet on the platform. Soft knees.",
      "Sit on your sit bones. Chest proud.",
      "Pull to the lower ribs or upper abs, depending on the handle.",
      "Squeeze. Pause. Do not bounce the stack off the pins.",
      "Reach forward to stretch without rounding into a shrimp.",
    ],
    setup:
      "V-handle is a fine start. Sit far enough that the stack is floating at the stretch. If you cannot keep your torso quiet, you sat too far or grabbed too much.",
    mistakes:
      "The rock. The shrug. The half-rep. Using a wide bar and turning it into a rear-delt swing. Pick one handle for a month so the log is not chaos.",
    body: [
      {
        h2: "Why it sits next to pulldowns",
        p: "Pulldowns are vertical. This is horizontal. You want both in a week if you press a lot. First gym month, 3 sets here after a press is a complete pull.",
      },
      {
        h2: "Rest, log, next set",
        p: "90 seconds. Write the pin. If the gym is loud and you will forget, Engine is the notebook. That is the whole reason the app is free to log.",
      },
    ],
    faqs: [
      {
        q: "Can I use straps?",
        a: "If grip dies before your back does, straps are allowed. Log the same. Grip can get extra work on carries.",
      },
    ],
    engineCta:
      "Log seated cable rows in the free Vitality Engine. Pin number, every working set.",
    relatedTools: [],
    relatedSlugs: ["lat-pulldown", "dumbbell-row"],
  },
  ...ENCYCLOPEDIA_BATCH_2026_08_18,
];

const bySlug = new Map(
  ENCYCLOPEDIA_PAGES.map((page) => [page.slug, page] as const),
);

export function getEncyclopediaPage(slug: string): EncyclopediaPage | undefined {
  return bySlug.get(slug);
}

export function encyclopediaSlugs(): string[] {
  return ENCYCLOPEDIA_PAGES.map((page) => page.slug);
}

export function featuredEncyclopediaPages(): EncyclopediaPage[] {
  return ENCYCLOPEDIA_PAGES.filter(
    (page) =>
      page.cluster === "beginner" &&
      (page.batch ?? FEATURED_ENCYCLOPEDIA_BATCH) === FEATURED_ENCYCLOPEDIA_BATCH,
  );
}
