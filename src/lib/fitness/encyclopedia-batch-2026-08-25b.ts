import type { EncyclopediaPage } from "./encyclopedia";

/** Second review batch: Aug 25, 2026. Remaining named-program lifts, then gym staples. */
export const ENCYCLOPEDIA_BATCH_2026_08_25B: EncyclopediaPage[] = [
  {
    slug: "pendlay-row",
    name: "Pendlay Row",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Row that starts dead on the floor",
    primaryMuscle: "back",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Pendlay row cues: bar on the floor every rep, hinge, pull to the stomach, pause dead. Log it in Vitality Engine.",
    lede: "Bar starts on the floor. Pull it to your stomach. Set it down dead. No bounce. That is the whole lift.",
    hunterNote:
      "PPL lists these first on pull day. If I cannot pause the bar on the floor, I drop a plate. A hover row is a different page.",
    cues: [
      "Bar over mid-foot. Hinge until your back is a table.",
      "Grip about shoulder width. Brace before you pull.",
      "Yank the bar to the lower ribs. Elbows not flared to 90.",
      "The plates tap the floor every rep. Dead stop. No rebound.",
      "Keep the hinge. Do not stand up into a deadlift between reps.",
    ],
    setup:
      "Same shoes as a deadlift. Empty bar to find the hinge. Four sets of 5-8 on PPL pull. Rest about 2 minutes. If the floor bounce becomes a trampoline, a chest-supported row is an honest swap. Log that name.",
    mistakes:
      "Bouncing the plates. Standing up every rep. Rounding into a shrimp. Half-reps that never touch the body. Also: straps plus ego so the log is fiction.",
    body: [
      {
        h2: "PPL pull day",
        p: "This is the heavy horizontal pull. Then a pulldown, a chest-supported row, face pulls, curls. You do not need five more row machines. Log the plates. If the gym is packed, a barbell row that hovers is allowed. Name what you did.",
      },
      {
        h2: "Vs a regular barbell row",
        p: "A barbell row can hover. A Pendlay dies on the floor every time. That pause is the point. Pick one for a month. Do not mix them in one working weight.",
      },
      {
        h2: "If the hinge leaks",
        p: "Chest-supported dumbbell rows still train the back without asking your low back to be a table. Use them. Come back to Pendlay when the hinge is quiet. Engine should see the name you actually pulled.",
      },
    ],
    faqs: [
      {
        q: "Touch the stomach?",
        a: "Yes, with control. If you cannot get there without a hop, the bar is too heavy.",
      },
      {
        q: "Straps?",
        a: "Allowed if grip dies first. Log the same. Grip can get extra work on hangs and carries.",
      },
    ],
    engineCta:
      "Log Pendlay rows in the free Vitality Engine. Plates, every working set.",
    relatedTools: ["plate-calculator"],
    relatedSlugs: ["barbell-row", "chest-supported-dumbbell-row", "deadlift"],
  },
  {
    slug: "walking-lunge",
    name: "Walking Lunge",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Split squat that travels",
    primaryMuscle: "quads",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Walking lunge cues: dumbbells at your sides, long step, back knee toward the floor, tall chest. Log each side in Vitality Engine.",
    lede: "Bells at your sides. Step. Drop the back knee. Stand up through the front heel. Walk it. This is the loaded version of the bodyweight walk.",
    hunterNote:
      "PPL legs lists these after the squat and the RDL. I count each leg. If the gym is a maze, I reverse lunge in place and log that name.",
    cues: [
      "Dumbbells hang like a farmer carry. Shoulders quiet. No shrug.",
      "Tall chest. Light brace.",
      "Step far enough that the front shin stays mostly vertical.",
      "Back knee travels toward the floor. Do not slam it.",
      "Push the front floor away. Bring the back foot through. Do not waddle.",
    ],
    setup:
      "Bodyweight walking lunges first if this is new. Then light bells. 3 sets of 8-10 each side. A clear lane. If you do not have one, reverse lunges in a tile. Same cues. Log the version.",
    mistakes:
      "Tiny steps that turn into a knee dive. Leaning the chest onto the front thigh. Racing so the bells swing. Also: loading both 50s in week one because a feed said so.",
    body: [
      {
        h2: "After bodyweight",
        p: "If the bodyweight walking lunge already looks quiet, this is the next number. Farmer-carry rules: tall, no shrug. Engine gets a weight then. Until the torso stays quiet, stay on bodyweight and log that page.",
      },
      {
        h2: "PPL legs day",
        p: "Back squat, Romanian deadlift, then this, then a curl and calves. Rest about 75 seconds. You do not need a walking tour of the whole gym. A rectangle that does not cut through someone's set is enough.",
      },
      {
        h2: "Reverse if space dies",
        p: "Reverse lunges in place are the same split stance. Log reverse lunges, not walking, so the history stays clean. Matching last week beats matching a screenshot of a hallway.",
      },
    ],
    faqs: [
      {
        q: "Bells or a bar?",
        a: "Dumbbells at your sides are the default. A bar on the back is fussier in a packed gym. Log the tool.",
      },
      {
        q: "How far is the step?",
        a: "Far enough that the front heel stays down. Too close is a dive. Too long is a stretch you cannot stand up from.",
      },
    ],
    engineCta:
      "Log walking lunges in the free Vitality Engine. Count each leg. Write the load.",
    relatedTools: [],
    relatedSlugs: ["walking-lunge-bodyweight", "reverse-lunge", "goblet-squat"],
  },
  {
    slug: "leg-curl",
    name: "Leg Curl",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Hamstrings you can see on the stack",
    primaryMuscle: "hamstrings",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Leg curl cues: hips glued, curl the pad, pause, no bounce. Lying or seated. Log the pin in Vitality Engine.",
    lede: "Hips stay down. Curl the pad. Pause. Let it back with control. This is the hamstring work a hinge does not fully cover.",
    hunterNote:
      "I use these after an RDL when my low back is done being a hero. The stack is the load. If I have to yank, I pull the pin up.",
    cues: [
      "Pad on the Achilles, not the calf meat. Hips glued to the bench or seat.",
      "Ankles flexed a little. Do not point the toes to cheat.",
      "Curl until the pad is close. Pause a beat.",
      "Do not bounce the stack off the pins.",
      "Lower under control. The stretch is part of the set.",
    ],
    setup:
      "Lying or seated. Pick one for a month. PPL and Upper Lower both list these after the hinge. 3 sets of 10-12. Pin you can own. If the machine is a line, a dumbbell RDL still trains hamstrings. Log that name.",
    mistakes:
      "Hips popping off the pad. Yanking with the low back. Tiny range. Slamming the stack. Also: a pin so heavy you need a kip.",
    body: [
      {
        h2: "After the RDL",
        p: "The hinge trained the hip. The curl trains the knee. You want both in a week if you squat and run. Three quiet sets. Then calves or you leave. Log the pin.",
      },
      {
        h2: "Seated vs lying",
        p: "Seated is often easier on the low back. Lying is the old default. They are not the same number. Log seated or lying so you do not compare a stack to a different groove next month.",
      },
      {
        h2: "No machine",
        p: "A stability-ball curl or a Nordic try is a different page. For this week, own the RDL and skip the curl rather than invent a number. Engine hates fiction.",
      },
    ],
    faqs: [
      {
        q: "Both legs or one?",
        a: "Two legs is the default. Single-leg later if one side is clearly weaker. Log it as its own movement.",
      },
      {
        q: "Toes in or out?",
        a: "Neutral is the default. Do not chase a trick angle because a clip said so. Pick one.",
      },
    ],
    engineCta:
      "Log leg curls in the free Vitality Engine. Pin number, every working set.",
    relatedTools: [],
    relatedSlugs: ["romanian-deadlift", "back-squat", "leg-extension"],
  },
  {
    slug: "standing-calf-raise",
    name: "Standing Calf Raise",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Calves that get a number",
    primaryMuscle: "calves",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Standing calf raise cues: full foot, rise onto the big toe side, pause, slow lower. Log the stack or plates in Vitality Engine.",
    lede: "Stand tall. Rise onto the balls of your feet. Pause. Lower until you feel a stretch. This is not a bounce contest.",
    hunterNote:
      "PPL puts these last on legs day. I still log them. If I skip calves for a month they do not magically show up from squats.",
    cues: [
      "Whole foot on the step or platform. Heels can hang. Do not perch on the toes like a ballerina unless that is the machine.",
      "Soft knees, not locked into a hyperextension.",
      "Rise. Pause a beat at the top. Squeeze.",
      "Lower under control. Own the stretch. Do not bounce out of the bottom.",
      "Ribs down. You are not throwing your chest at the ceiling.",
    ],
    setup:
      "Machine or a Smith with a step. Dumbbells on a stair if that is what you have. 3 sets of 10-15. Same tool for a month. If the calf machine is a line, a standing hold on a step still counts. Log the version.",
    mistakes:
      "Bouncing. Only moving an inch. Rolling to the outside of the foot. Bending the knees into a squat. Also: 40 noisy reps you will not repeat next week.",
    body: [
      {
        h2: "End of legs day",
        p: "Squat, hinge, lunges, curls, then this. Three sets. That is enough. Log the load. You do not need a seated calf machine plus a donkey plus a jump rope because the poster had six.",
      },
      {
        h2: "Dumbbell version",
        p: "One stair. One or two bells. Same pause. Log standing calf raise and put dumbbell in the notes if you want the history to stay honest. The machine pin and a 40-pound bell are not the same week.",
      },
      {
        h2: "Why it is not optional forever",
        p: "Ankles that never get loaded still have to sprint and change direction. Quiet calf work is cheaper than waiting until they cramp in the eighth inning. Log it so it happens twice.",
      },
    ],
    faqs: [
      {
        q: "Straight knees or bent?",
        a: "Standing with soft knees is this page. Seated bent-knee is a different machine. Pick one for a month.",
      },
      {
        q: "How slow?",
        a: "Up with control, pause, down slower than you rose. If you bounce, the weight is too heavy.",
      },
    ],
    engineCta:
      "Log standing calf raises in the free Vitality Engine. Stack, plates, or bells, named honestly.",
    relatedTools: [],
    relatedSlugs: ["back-squat", "walking-lunge", "leg-curl"],
  },
  {
    slug: "lat-pulldown-wide",
    name: "Lat Pulldown Wide",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Wide bar, still to the chest",
    primaryMuscle: "back",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Wide lat pulldown cues: long bar, pull to the upper chest, sit tall, no behind-the-neck. Log the stack in Vitality Engine.",
    lede: "Hands out on the long bar. Sit tall. Pull to the upper chest. Behind-the-neck is still not a personality.",
    hunterNote:
      "First Gym day 1 lists wide. I still pull to the chest. If the wide bar turns into a shrug, I move in a hand and log it.",
    cues: [
      "Thighs locked. Sit on your sit bones.",
      "Hands wider than shoulders on the long bar. Not the last inch of the sleeve.",
      "Pull the bar to the upper chest. Lead with the elbows.",
      "Pause. Do not bounce off the collarbones.",
      "Stretch up without shrugging into your ears. Torso stays a post.",
    ],
    setup:
      "Same pad rules as a regular pulldown. First Gym day 1 is 3 sets of 8-10 after bench. PPL pull uses these after Pendlay rows. Pin you can own. Use the plate-free stack number. Write it.",
    mistakes:
      "Behind the neck. Leaning into a sit-up. Only bending the elbows so it becomes an ugly curl. Slamming the stack. Also: a grip so wide you cannot reach the chest.",
    body: [
      {
        h2: "First Gym day 1",
        p: "Goblet squat, bench, then this, then RDLs, then a plank. That is the pull. You do not need a second pulldown variation the same night. Log the pin.",
      },
      {
        h2: "Wide is not more advanced",
        p: "Wide just changes the elbow path. Neutral and medium still build the same pull-up later. If your shoulders feel better closer, switch and log lat pulldown neutral. Do not suffer a wide bar because a chart ranked it.",
      },
      {
        h2: "Then a pull-up",
        p: "Pulldowns are how a lot of us get to a bar without kipping. When 10 wide reps look quiet, try a dead hang and a few pull-up attempts. Log both. Ugly kips do not count as pull-ups.",
      },
    ],
    faqs: [
      {
        q: "How wide?",
        a: "A little outside shoulder width. The last hole on the bar is usually too far. If you cannot pull to the chest, move in.",
      },
      {
        q: "Straps?",
        a: "Allowed if grip dies. Log the same.",
      },
    ],
    engineCta:
      "Log wide pulldowns in the free Vitality Engine. Pin number, every working set.",
    relatedTools: [],
    relatedSlugs: ["lat-pulldown", "lat-pulldown-neutral", "pull-up"],
  },
  {
    slug: "lat-pulldown-neutral",
    name: "Lat Pulldown Neutral",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Palms in, same tall sit",
    primaryMuscle: "back",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Neutral lat pulldown cues: palms facing, pull to the upper chest, sit tall, quiet shrug. Log the stack in Vitality Engine.",
    lede: "V-handle or parallel grips. Palms in. Pull to the upper chest. Your torso stays tall. This is the friendlier shoulder path for a lot of people.",
    hunterNote:
      "First Gym day 3 and Feel-18 both list neutral. I use it when the long bar feels like a crowd on my shoulders. Same sit. Same log.",
    cues: [
      "Thighs locked. Sit tall.",
      "Neutral handle. Palms face each other.",
      "Pull to the upper chest. Elbows travel down and back, not out to 90.",
      "Pause. Do not bounce.",
      "Reach long at the top without shrugging.",
    ],
    setup:
      "V-handle is a fine start. Parallel bars on a lat machine if you have them. First Gym day 3 is 3 sets of 8-10 after push-ups. Upper A uses these after the press. Same pin rules: own the last inch.",
    mistakes:
      "Turning it into a biceps curl by only bending the elbows. Leaning way back. Shrugging. Also: swapping handles every set so the history is fog.",
    body: [
      {
        h2: "First Gym day 3",
        p: "Goblet, push-up, then this, then a hip thrust, then a carry. Neutral is the pull that day. Log it as lat pulldown neutral, not a generic pulldown, so week two compares.",
      },
      {
        h2: "Feel-18 day B",
        p: "After the RDL and a dumbbell press. Same cues. A parent can finish this without a wide-bar scene. Log the pin. Leave.",
      },
      {
        h2: "Wide vs neutral",
        p: "They are cousins, not twins. Pick one as the main pulldown for four weeks. Use the other as a swap when the handle is taken. Do not treat the pins as the same lift.",
      },
    ],
    faqs: [
      {
        q: "V-handle or two grips?",
        a: "V-handle is the default. Two independent grips are allowed if they stay even. Log the handle.",
      },
      {
        q: "Closer than a chin-up?",
        a: "Close-neutral is the idea. You are not copying a chin-up grip unless that is the attachment you have. Pull to the chest either way.",
      },
    ],
    engineCta:
      "Log neutral pulldowns in the free Vitality Engine. Name the handle. Write the pin.",
    relatedTools: [],
    relatedSlugs: ["lat-pulldown", "lat-pulldown-wide", "chin-up"],
  },
  {
    slug: "dumbbell-overhead-press",
    name: "Dumbbell Overhead Press",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Stand and press two bells",
    primaryMuscle: "shoulders",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Dumbbell overhead press cues: bells at the shoulders, brace, press to lockout, no backbend. Log both bells in Vitality Engine.",
    lede: "Bells at your shoulders. Brace. Press them up. Stand tall at the top. Your low back is not a trampoline.",
    hunterNote:
      "First Gym day 2 and Feel-18 both use this. I like bells when the bar is a crowd. Each side has to finish. I still squeeze my glutes.",
    cues: [
      "Feet about hip width. Squeeze glutes so you do not lean back.",
      "Bells at the shoulders, wrists stacked, elbows slightly in front.",
      "Brace like someone is about to poke you.",
      "Press up. Bells travel in a slight arc, not out in front.",
      "Lock out tall. Lower to the shoulders with control. Do not crash them together.",
    ],
    setup:
      "Standing is the default. Seated if your low back keeps cheating. 3 sets of 6-8. Same weight both sides unless you wrote a reason. Kick the bells up with your knees if they are heavy.",
    mistakes:
      "Kicking the hips to finish. Flaring the ribs. Pressing out so you chase the bells. Uneven lockout you ignore. Also: looking at the ceiling the whole way so your neck takes it.",
    body: [
      {
        h2: "First Gym day 2",
        p: "After the trap-bar pull and a row. 3 sets. Then walking lunges. That is a press you can leave in 45 minutes. Log dumbbell overhead press, not the barbell page, so the number means something.",
      },
      {
        h2: "Feel-18 day B",
        p: "After RDLs. Same brace. A seated version is allowed. Log seated if that is the version. You do not need a military press scene to train shoulders.",
      },
      {
        h2: "Bar vs bells",
        p: "The bar is easier to load in even plates. Bells ask each side to work. Pike push-ups were the dorm cousin. This is the loaded version. Name the tool in Engine.",
      },
    ],
    faqs: [
      {
        q: "Neutral grip?",
        a: "Palms facing in is allowed if it feels better. Log it or note it. Pick one for a month.",
      },
      {
        q: "How heavy?",
        a: "Last 2 reps honest. If you need a hip hop to lock out, drop a size.",
      },
    ],
    engineCta:
      "Log dumbbell overhead press in the free Vitality Engine. Same weight both sides unless you wrote a reason.",
    relatedTools: [],
    relatedSlugs: ["overhead-press", "pike-push-up", "dumbbell-lateral-raise"],
  },
  {
    slug: "medicine-ball-slam",
    name: "Medicine Ball Slam",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Power you can hear once",
    primaryMuscle: "full_body",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Medicine ball slam cues: reach tall, slam through the floor, pick it up like an adult. Log the ball weight in Vitality Engine.",
    lede: "Reach the ball overhead. Slam it through the floor. Pick it up. That is one. This is power, not a tantrum with a toy.",
    hunterNote:
      "Baseball power day uses these after a trap-bar pull. I use a ball the gym will let me slam. I do not bounce it off a ceiling I cannot afford.",
    cues: [
      "Feet about hip width. Ball at the chest, then overhead.",
      "Tall reach. Ribs down. Do not lean back into a backbend.",
      "Slam through the floor. Hinge a little. Arms long.",
      "Let it bounce or stay, depending on the ball. Pick it up with a hinge, not a round-back scoop.",
      "Reset. Do not rush into a sloppy second slam.",
    ],
    setup:
      "A slam ball or a med ball the floor can take. 4 sets of 5-6. Rest about a minute. Soft ceilings and glass walls are a no. If you cannot slam, a kettlebell swing is the cousin. Log that name.",
    mistakes:
      "Only using the arms. Rounding to pick it up. Slamming toward someone else's set. A ball that rolls into a rack. Also: 20 noisy slams because you were mad. This is 5 quality reps.",
    body: [
      {
        h2: "Baseball power day",
        p: "Trap-bar, then slams, then rotational throws, then a single-leg RDL. You are not burying yourself before a start. Log the ball weight. Next week, same ball, cleaner slams, or a slightly heavier ball you can still reach tall with.",
      },
      {
        h2: "Why it is not cardio",
        p: "Keep the rest. Power dies when you turn it into a burpee. If you are gasping and the reach is short, you are conditioning. Log fewer reps and keep the quality.",
      },
      {
        h2: "No slam ball",
        p: "A dead-stop kettlebell swing or a med-ball chest pass into a wall (if the gym allows it) still trains intent. Log the name you did. Do not slam a gel ball that explodes.",
      },
    ],
    faqs: [
      {
        q: "How heavy?",
        a: "Heavy enough to feel, light enough to reach tall. If the overhead position collapses, drop a size.",
      },
      {
        q: "Bounce or no bounce?",
        a: "Slam balls stay. Bouncy med balls come back. Pick the one the gym wants. Same cues.",
      },
    ],
    engineCta:
      "Log medicine ball slams in the free Vitality Engine. Ball weight and reps, every working set.",
    relatedTools: ["heart-rate-zones"],
    relatedSlugs: ["trap-bar-deadlift", "kettlebell-swing", "box-jump"],
  },
  {
    slug: "rotational-med-ball-throw",
    name: "Rotational Med Ball Throw",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Rotate, then throw",
    primaryMuscle: "core",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Rotational med ball throw cues: hip turn, throw into a wall, catch or reset, both sides. Log it in Vitality Engine.",
    lede: "Load the back hip. Turn. Throw the ball into a wall. This is a throw pattern, not a twist contest with a broomstick.",
    hunterNote:
      "In-season baseball uses these on power day. I throw both sides. I do not fry the arm with long-toss volume in the weight room.",
    cues: [
      "Sideways to a solid wall. Ball at the hip. Athletic stance.",
      "Load the back hip. The torso turns. The arms are the last thing.",
      "Throw into the wall. Follow through without falling over.",
      "Catch the bounce or pick it up. Reset. Do not rush.",
      "Match the other side. Count each.",
    ],
    setup:
      "A wall that is allowed. A med ball that will bounce or a partner if you have one. 4 sets of 4-6 each side. Rest about a minute. If the gym bans wall throws, a rotational chop with a cable is a cousin. Log that name.",
    mistakes:
      "Only using the arms. Spinning the feet into a pirouette. Throwing at a window. Skipping the weak side. Also: a ball so heavy the hips never turn.",
    body: [
      {
        h2: "After slams",
        p: "Slams were vertical. This is rotational. Same power day. You are keeping intent without burying the arm. Log both sides. Next week, same ball, cleaner turns.",
      },
      {
        h2: "Both sides",
        p: "Hitters still train the other way. If one side is ugly, that is the side that needs the quiet reps, not more of the pretty side. Engine should see even counts unless you wrote a reason.",
      },
      {
        h2: "If something feels sharp",
        p: "Stop. Tell a coach. This page is coaching, not a clinic. A landmine press or a pallof-style hold can wait. Do not grind through a pinch to finish the set.",
      },
    ],
    faqs: [
      {
        q: "How far from the wall?",
        a: "Close enough to throw hard, far enough that the bounce does not eat your face. Start at a few feet and adjust.",
      },
      {
        q: "Shot-put or side toss?",
        a: "Side toss into the wall is this page. A shot-put throw is a different drill. Pick one.",
      },
    ],
    engineCta:
      "Log rotational throws in the free Vitality Engine. Count each side. Write the ball weight.",
    relatedTools: [],
    relatedSlugs: ["medicine-ball-slam", "landmine-press", "copenhagen-plank"],
  },
  {
    slug: "single-leg-rdl",
    name: "Single-Leg RDL",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Hinge on one leg",
    primaryMuscle: "hamstrings",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Single-leg RDL cues: push the hip back, soft knee, square hips, quiet back. Log each side in Vitality Engine.",
    lede: "Stand on one foot. Push that hip back. The other leg reaches behind you like a kickstand, not a circus. Hips stay square.",
    hunterNote:
      "Baseball power day ends here. I use a light bell. If my hips spin like a boat, I go back to two-leg RDLs. Pride is not a hinge.",
    cues: [
      "Soft knee on the standing leg. Not a squat.",
      "Brace. Push the hip back like you are closing a car door.",
      "Hips square. The back foot stays close to the line, not swinging out.",
      "Stop when the hamstring says so, not when the back rounds.",
      "Drive the hip forward to stand. Squeeze. Switch. Count each side.",
    ],
    setup:
      "Bodyweight first. Then one dumbbell in the opposite hand, or two light bells. 3 sets of 6-8 each side. A wall for a fingertip if balance is the limiter. That is allowed. Log it.",
    mistakes:
      "Turning it into a reaching toe-touch. Rotating the hip open. Rounding to chase depth. Hopping to finish. Also: a 50-pound bell in week one because the two-leg RDL used 50s.",
    body: [
      {
        h2: "After two-leg RDLs",
        p: "If the dumbbell RDL already looks quiet, this is the next hinge. Baseball uses it after throws so the hips still work without another heavy pull. Log each side. Matching last week beats matching a screenshot.",
      },
      {
        h2: "Balance vs hinge",
        p: "If you are dancing, lighten the bell or touch a rack. The hinge is the lift. A circus balance set is not. Put a fingertip on a wall and own the hip path.",
      },
      {
        h2: "Then a loaded two-leg hinge",
        p: "Trap-bar and barbell RDLs still belong in the week. Single-leg is extra honesty, not a replacement for a number you can load. Name both in Engine.",
      },
    ],
    faqs: [
      {
        q: "Which hand holds the bell?",
        a: "Opposite hand is the default. Same-side is a fine swap. Pick one for a month.",
      },
      {
        q: "How far down?",
        a: "Usually mid-shin. Flexibility is not the goal. A long, honest hinge that stays square is the goal.",
      },
    ],
    engineCta:
      "Log single-leg RDLs in the free Vitality Engine. Count each side. Write the load.",
    relatedTools: [],
    relatedSlugs: ["dumbbell-romanian-deadlift", "romanian-deadlift", "reverse-lunge"],
  },
  {
    slug: "a-skip",
    name: "A-Skip",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Skip that still counts",
    primaryMuscle: "full_body",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "A-skip cues: tall posture, knee up, quick ground, opposite arm. Log the contacts in Vitality Engine.",
    lede: "Skip. Knee up. Foot down quick. Arms like a run. This is not a playground joke. It is how you wake the springs up before jumps.",
    hunterNote:
      "Baseball speed day starts here. I look like I am skipping on purpose. I would rather look silly than stiff-leg into a box jump.",
    cues: [
      "Tall. Ribs down. Eyes forward.",
      "Drive a knee up. The other foot is a quick skip, not a stomp.",
      "Foot strikes under you. Not way out in front.",
      "Opposite arm. Elbows about 90. Hands do not cross the body like a windmill.",
      "Rhythm over height. If you bounce like a pogo, slow down.",
    ],
    setup:
      "A lane. Shoes that stay on. 4 sets of 10-12 contacts each side, or 10-12 skips down a line. Rest about 45 seconds. If the gym is packed, march in place with the same knee drive. Log A-skip either way.",
    mistakes:
      "Leaning back. Slapping the floor. Arms dead at your sides. Turning it into a high-knee sprint you cannot repeat. Also: 40 sloppy skips because a timer told you to.",
    body: [
      {
        h2: "Speed day primer",
        p: "Then lateral bounds, then box jumps, then a Copenhagen. The skip is the wake-up. Log it so the day is not only the jumps you remember. Quality over a highlight reel.",
      },
      {
        h2: "March if you need to",
        p: "A-march is the same knee and posture without the skip. Use it if the floor is slick or your calves are cooked. Note it in Engine. Progress back to a skip when the rhythm is quiet.",
      },
      {
        h2: "Not conditioning",
        p: "Keep the rest. If you are gasping, you turned a skip into cardio. Short sets. Then the bounds. Heart-rate zones can wait for a run day.",
      },
    ],
    faqs: [
      {
        q: "How high the knee?",
        a: "About hip height is plenty. Higher is usually a lean. Match a height you can repeat.",
      },
      {
        q: "Count each foot?",
        a: "Yes, or count skips down a line. Pick one for a month so the log compares.",
      },
    ],
    engineCta:
      "Log A-skips in the free Vitality Engine. Contacts still count when they look like skipping.",
    relatedTools: ["heart-rate-zones"],
    relatedSlugs: ["box-jump", "lateral-bound", "jumping-jack"],
  },
  {
    slug: "lateral-bound",
    name: "Lateral Bound",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Jump sideways, stick it",
    primaryMuscle: "glutes",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Lateral bound cues: push sideways, stick the landing on one foot, reset. Log each side in Vitality Engine.",
    lede: "Push off one foot. Travel sideways. Stick the landing. Pause. This is change of direction, not a skater hop you never own.",
    hunterNote:
      "Speed day uses these after skips. I stick the landing. If I cannot pause, I shorten the jump. Distance is earned.",
    cues: [
      "Athletic stance. Soft knees.",
      "Push sideways off the inside edge of the foot. Hips help. Do not only use the ankle.",
      "Land on the other foot. Knee tracks. Chest tall.",
      "Pause a beat. Own it. Then bound back.",
      "Arms help the jump. They do not flail.",
    ],
    setup:
      "Clear floor. 4 sets of 6-8 each way. Rest about a minute. First sessions can be small. A line on the floor is a target, not a dare. If landings are noisy, lower the distance.",
    mistakes:
      "Spinning the torso. Landing with a caved knee. Rushing so there is no stick. Jumping forward instead of sideways. Also: a distance you cannot repeat on the weak side.",
    body: [
      {
        h2: "Baseball speed day",
        p: "After A-skips. Then box jumps. Then Copenhagens. You are teaching the hips to push sideways. Log each side. Next week, same count, quieter landings, or a slightly longer bound you can still stick.",
      },
      {
        h2: "Stick is the standard",
        p: "A bound you cannot pause is a fall. Shorten it. Quality is the load until the stick is boring. Then add distance. Engine should see the count, not a vibe.",
      },
      {
        h2: "If a landing feels sharp",
        p: "Stop. Tell a coach. This page is coaching, not a clinic. Skips and a wall sit can finish the day. Do not bound through a pinch.",
      },
    ],
    faqs: [
      {
        q: "Hold the stick how long?",
        a: "A beat is enough. A 5-second statue is not the lift. Own it, then go.",
      },
      {
        q: "Arms across the body?",
        a: "They can help the jump. Do not windmill. Quiet arms, quiet landing.",
      },
    ],
    engineCta:
      "Log lateral bounds in the free Vitality Engine. Count each side. Stick the landing.",
    relatedTools: [],
    relatedSlugs: ["a-skip", "box-jump", "copenhagen-plank"],
  },
  {
    slug: "box-jump",
    name: "Box Jump",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Jump you can stick, then step down",
    primaryMuscle: "full_body",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Box jump cues: load, jump, stick the landing, step down. Log the box height in Vitality Engine.",
    lede: "Load. Jump on the box. Stick it. Step down. Do not bounce off. The height you own is the height you log.",
    hunterNote:
      "I pick a box I can land like a cat, not a box that makes a highlight. I step down. Jumping down is extra wear I do not need in-season.",
    cues: [
      "Stand close enough. Athletic stance. Arms back.",
      "Load the hips. Jump. Knees track. Feet land together.",
      "Stick. Stand tall on the box. Do not collapse into a deep squat you did not ask for.",
      "Step down one foot at a time. Reset on the floor.",
      "If the last rep was a scramble, the box is too high.",
    ],
    setup:
      "A stable box. 4 sets of 3-5. Rest about 75 seconds. Start lower than your ego. A 12 or 18 inch box is a real jump. If the gym only has a tall box, use a lower step or skip to bounds. Log the height in the notes.",
    mistakes:
      "Jumping down every rep. Rebounding into the next jump. A box so high you land on your knees. Soft boxes that slide. Also: 15 noisy jumps because a clock said so. This is 3-5 quality reps.",
    body: [
      {
        h2: "After skips and bounds",
        p: "The box is the vertical intent. Rest fully. Power dies when you turn it into conditioning. Log the reps and the height. Next week, same height, quieter landings, then maybe one notch up.",
      },
      {
        h2: "Step down is the rule",
        p: "Jumping down doubles the landing. In-season baseball does not need that. Step down. If you want extra landing work, say so and log it. Default is step down.",
      },
      {
        h2: "No box",
        p: "A target on a wall, a broad jump, or bounds still train intent. Log the name you did. Do not stack plates into a wobbly tower because a video had a tall box.",
      },
    ],
    faqs: [
      {
        q: "How high?",
        a: "High enough to jump, low enough to stick and stand tall. If you land in a deep squat every time, drop the box.",
      },
      {
        q: "Arms?",
        a: "They help. Swing them. Do not keep them glued to your sides like a statue.",
      },
    ],
    engineCta:
      "Log box jumps in the free Vitality Engine. Reps and box height. Step down.",
    relatedTools: ["heart-rate-zones"],
    relatedSlugs: ["a-skip", "lateral-bound", "burpee"],
  },
  {
    slug: "copenhagen-plank",
    name: "Copenhagen Plank",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Side plank with the top leg on a bench",
    primaryMuscle: "core",
    equipment: "bodyweight",
    trackingType: "duration",
    description:
      "Copenhagen plank cues: top foot on a bench, body a board, hips up, breathe. Log the seconds each side in Vitality Engine.",
    lede: "Top foot on a bench. Body in one line from shoulder to foot. Hips up. This is a side plank that also works the inner thigh. Short time. Honest squeeze.",
    hunterNote:
      "Speed day ends here. I start with the knee on the bench if the long-lever version shakes. I log which one. I do not grind a pinch.",
    cues: [
      "Side plank position. Top foot or knee on a bench. Bottom leg can hover or rest light on the floor while you learn.",
      "Elbow under the shoulder. Forearm planted.",
      "Hips up. Body one board. Do not pike. Do not sag.",
      "Squeeze the top inner thigh into the bench.",
      "Breathe. Stop when the line breaks. Switch sides.",
    ],
    setup:
      "A stable bench. Start with 15-25 seconds each side. Three sets. Knee-on-bench is the regression. Foot-on-bench is the longer lever. Rest about 45 seconds. If a groin pinch shows up, stop.",
    mistakes:
      "Hips dumped. Rolling the chest toward the floor. Holding your breath. A bench that slides. Also: 45-second records while the line died at 12.",
    body: [
      {
        h2: "Why baseball wants it",
        p: "Change of direction uses the inner thigh. This is a short isometric, not a stretch contest. Log the seconds. Next week, add a few seconds or keep the time and shake less.",
      },
      {
        h2: "Knee version first",
        p: "If the long lever is too much, put the knee on the bench. Same hip height. Same log name with a note. Earn the foot version. Pride is not a plank.",
      },
      {
        h2: "If something feels sharp",
        p: "Stop. Tell a coach or a parent. This page is coaching, not a clinic. A regular side plank or a dead bug can finish the day. Do not push through a pinch to match a clip.",
      },
    ],
    faqs: [
      {
        q: "Bottom leg up or down?",
        a: "Hover is harder. Resting the foot light on the floor is allowed while you learn. Pick one for a month.",
      },
      {
        q: "How long?",
        a: "Until the line breaks. Match last week, then add a little. Do not chase a minute because a video did.",
      },
    ],
    engineCta:
      "Log Copenhagen plank time in the free Vitality Engine. Each side. Name the bench height.",
    relatedTools: [],
    relatedSlugs: ["plank", "rkc-plank", "lateral-bound"],
  },
  {
    slug: "landmine-press",
    name: "Landmine Press",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Press on an arc that is kinder",
    primaryMuscle: "shoulders",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Landmine press cues: bar in a landmine, press on the arc, brace, no backbend. Log the plates in Vitality Engine.",
    lede: "One end of the bar is anchored. You press the other end on an arc. Standing. This is a press a lot of throwing shoulders can live with.",
    hunterNote:
      "Baseball upper-keep day starts here. I press both sides. I do not chase a vertical bar if this groove feels cleaner. I still brace.",
    cues: [
      "Staggered stance or square. Squeeze glutes. Ribs down.",
      "Hold the sleeve or a handle. Elbow in front of the bar, not flared.",
      "Press along the arc until the arm is long. Head stays neutral.",
      "Lower with control. Do not crash the plates into the floor.",
      "Switch sides. Count each. Same load unless you wrote a reason.",
    ],
    setup:
      "Landmine sleeve in a corner or a true landmine. Light plates. 3 sets of 6-8 each side. If you do not have a landmine, a single-arm dumbbell press is the cousin. Log that name. Use the plate calculator for even loading.",
    mistakes:
      "Leaning back to finish. Flaring the elbow. Pressing into a shrug. Only training the strong side. Also: loading a 45 because the bar looked empty.",
    body: [
      {
        h2: "Upper keep day",
        p: "Then face pulls, pull-aparts, hangs. You are keeping a press without frying the arm before a start. Log each side. Next week, same plates, cleaner lockouts, or a small jump you can own.",
      },
      {
        h2: "Why the arc helps",
        p: "The path is a little in front. For a lot of people that is kinder than a strict vertical bar. It is still a press. It still needs a brace. It is not a magic medical tool. It is a groove.",
      },
      {
        h2: "Half-kneeling",
        p: "One knee down if your low back keeps cheating. Log half-kneeling. Same arc. Same Engine number rules.",
      },
    ],
    faqs: [
      {
        q: "Two hands on the bar?",
        a: "Two-hand landmine press is a different groove. This page is one arm. Pick one for a month.",
      },
      {
        q: "How high?",
        a: "Until the elbow is long without the ribs flaring. Higher is usually a lean.",
      },
    ],
    engineCta:
      "Log landmine presses in the free Vitality Engine. Plates and each side.",
    relatedTools: ["plate-calculator"],
    relatedSlugs: ["dumbbell-overhead-press", "overhead-press", "band-pull-apart"],
  },
  {
    slug: "pull-up",
    name: "Pull-Up",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Chin over, no kip",
    primaryMuscle: "back",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Pull-up cues: dead hang, pull the chest to the bar, chin over, lower with control. Log the honest reps in Vitality Engine.",
    lede: "Hang. Pull until your chin is over the bar. Lower. No kip. The reps you own are the reps you log.",
    hunterNote:
      "I would rather see 3 clean pull-ups than 10 kips. Pulldowns and hangs are how I get here. Pride is not a set.",
    cues: [
      "Hands a little wider than shoulders. Palms forward. Thumbs around the bar.",
      "Start from a packed hang. Shoulders down, not shrugged.",
      "Pull. Lead with the elbows. Chest toward the bar.",
      "Chin over. Pause a beat. Do not crane the neck to cheat the chin.",
      "Lower to a long hang. That is one. Do not drop from the top as a stunt.",
    ],
    setup:
      "A bar you can hang from. Dead hangs first if you cannot pull one. Band-assisted is allowed. Log pull-up or band-assisted pull-up as the name you did. 3 sets of as many clean reps as you can stop two before failure.",
    mistakes:
      "Kipping. Half-reps that never get the chin over. Shrugging into the bar. Swinging. Also: mixing banded and unbanded in one number and calling it progress.",
    body: [
      {
        h2: "After pulldowns",
        p: "Wide and neutral pulldowns built the pattern. The bar is the test. If you get one honest rep, log it. Next week, try two. Engine should see the real count, not a video kip.",
      },
      {
        h2: "Assistance that stays honest",
        p: "A band, a machine assist, or a foot on a box for a jump to the top and a slow lower (a negative) all count if you name them. Do not log banded reps as pull-ups. Next month will lie to you.",
      },
      {
        h2: "Chin-up is a different grip",
        p: "Palms toward you is the chin-up page. Both are vertical pulls. They are not interchangeable in the log. Pick one as the main for a month.",
      },
    ],
    faqs: [
      {
        q: "What if I cannot do one?",
        a: "Dead hangs, pulldowns, and slow negatives. Log those. A pull-up will come. Do not kip your way to a fake number.",
      },
      {
        q: "Chest to bar?",
        a: "Chin over is the default here. Chest-to-bar is a later standard. Own chin over first.",
      },
    ],
    engineCta:
      "Log pull-ups in the free Vitality Engine. Only the reps that got the chin over without a kip.",
    relatedTools: [],
    relatedSlugs: ["dead-hang", "lat-pulldown-wide", "chin-up"],
  },
  {
    slug: "chin-up",
    name: "Chin-Up",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Palms toward you",
    primaryMuscle: "back",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Chin-up cues: palms toward you, packed hang, chin over the bar, slow lower. Log the honest reps in Vitality Engine.",
    lede: "Palms face you. Hang. Pull until the chin is over. Lower. Your biceps help. Your back still has to work. No kip.",
    hunterNote:
      "I use chin-ups when pull-ups feel like a wall. Same honesty. If I have to kip, I go back to a pulldown and a hang.",
    cues: [
      "Hands about shoulder width. Palms toward you. Thumbs around.",
      "Packed hang. Shoulders down.",
      "Pull. Elbows toward your ribs. Chest up.",
      "Chin over. Pause. Do not throw the head back to cheat.",
      "Lower to a long hang. That is one.",
    ],
    setup:
      "Same bar as a pull-up. Band-assisted is allowed. Log the name. Neutral-grip pull-ups on parallel handles are a cousin. Log those as their own movement if you use them.",
    mistakes:
      "Kipping. Only curling so the shoulders shrug. Half-reps. Mixing chin-ups and pull-ups in one set. Also: a false grip that wrecks the wrists in week one.",
    body: [
      {
        h2: "Vs a pull-up",
        p: "Supinated grip usually lets more people get chin over sooner. It is not a lesser pull. It is a different grip. Neutral pulldowns are the machine cousin. Log the tool you used.",
      },
      {
        h2: "Arms still need curls",
        p: "Chin-ups use the biceps. EZ-bar curls still belong on a pull day if you want extra arm work. Do not skip logging either one because they overlap. They are not the same set.",
      },
      {
        h2: "Assistance",
        p: "Band, machine, or negatives. Name them. Three clean assisted reps beat ten ugly swings. Engine is how next week stays honest.",
      },
    ],
    faqs: [
      {
        q: "Closer grip?",
        a: "About shoulder width is the default. Too close can bother the wrists. Move out a little if they complain.",
      },
      {
        q: "Should I add weight?",
        a: "After 8 clean bodyweight reps. A backpack or a belt. Log the extra. Do not add plates because a clip did.",
      },
    ],
    engineCta:
      "Log chin-ups in the free Vitality Engine. Chin over, no kip, named as chin-ups.",
    relatedTools: [],
    relatedSlugs: ["pull-up", "dead-hang", "ez-bar-curl"],
  },
  {
    slug: "kettlebell-swing",
    name: "Kettlebell Swing",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Hinge that pops, not a squat",
    primaryMuscle: "hamstrings",
    equipment: "free_weight",
    trackingType: "weight_reps",
    description:
      "Kettlebell swing cues: hinge, snap the hips, bell to about chest height, no squat. Log the bell in Vitality Engine.",
    lede: "Push the hips back. Snap them forward. The bell floats. Arms are ropes. This is a hinge, not a squat with a kettlebell.",
    hunterNote:
      "I use these when I cannot slam a ball. Same idea: power from the hips. If the bell goes over my head, I went too far. Chest height is plenty.",
    cues: [
      "Feet about shoulder width. Bell on the floor in front. Hike it back like a snap.",
      "Hinge. Soft knees. Flat enough back to brace.",
      "Snap the hips. Squeeze glutes at the top. Stand tall. Do not lean back.",
      "The bell floats to about chest height. Arms stay long. You did not lift it with your shoulders.",
      "Let it come back. Hinge again. Park it like an adult when the set is done.",
    ],
    setup:
      "A bell you can hinge, not a bell you can curl. 3 sets of 8-12. Rest about a minute. Two-hand is the default. If the gym has no kettlebell, a dumbbell held by the head works in a pinch. Log the tool. Clear the people behind you.",
    mistakes:
      "Squatting every rep. Lifting with the arms. Letting the bell pull you into a round back. Leaning back at the top. Also: American swings over the head because a class counted them. This page stops at chest height.",
    body: [
      {
        h2: "Power without a slam ball",
        p: "Same hip snap as a slam, quieter on the floor. Pair with a trap-bar or an RDL in the week, not as a replacement for all hinge work. Log the bell size. Next week, same bell, cleaner snaps, or a jump you can still float at chest height.",
      },
      {
        h2: "Conditioning later",
        p: "Keep the rest until the hinge is quiet. Then you can shorten rest and use heart-rate zones if you want. Ugly fast swings are not cardio. They are a bad hinge at speed.",
      },
      {
        h2: "One-hand later",
        p: "Two hands first. One-hand is a different anti-rotation demand. Log it as its own movement when you get there.",
      },
    ],
    faqs: [
      {
        q: "How high?",
        a: "About chest height. Higher is usually arms and a backbend. Float, do not muscle.",
      },
      {
        q: "Shoes?",
        a: "Flat soles. Bouncy running shoes make the hinge sloppy.",
      },
    ],
    engineCta:
      "Log kettlebell swings in the free Vitality Engine. Bell size, every working set.",
    relatedTools: ["heart-rate-zones"],
    relatedSlugs: ["romanian-deadlift", "trap-bar-deadlift", "medicine-ball-slam"],
  },
  {
    slug: "leg-extension",
    name: "Leg Extension",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Quads you can see on the stack",
    primaryMuscle: "quads",
    equipment: "machine",
    trackingType: "weight_reps",
    description:
      "Leg extension cues: pad on the shins, extend, pause, slow lower, hips quiet. Log the pin in Vitality Engine.",
    lede: "Sit. Pad on the shins. Kick out. Pause. Lower. Your hips stay in the seat. This is isolation, not a squat replacement.",
    hunterNote:
      "I use these after a squat when I still want quad work without another bar. If my knees yell, I shorten the range or I skip. This page is not a clinic.",
    cues: [
      "Seat so the knee lines up with the machine's pivot. Back against the pad.",
      "Pad on the lower shin, not the ankle bone if it pinches.",
      "Extend until the knees are long. Pause a beat. Do not slam the lockout.",
      "Lower under control. Do not bounce the stack.",
      "Hands on the handles. Do not yank your torso to finish.",
    ],
    setup:
      "Pin you can own for 10-12. Three sets after a squat pattern. If the machine is a line, goblet squats still train quads. Log that name. Pair with a curl if you want both sides of the thigh in one visit.",
    mistakes:
      "Seat so far back you are swinging. Momentum from the hips. Tiny range. Slamming lockout. Also: a pin so heavy you need to grab the seat like a roller coaster.",
    body: [
      {
        h2: "After the squat",
        p: "The squat trained the pattern. This fills the quad if you still have time. Three sets. Log the pin. You do not need a hack squat plus a belt squat plus this because the floor had three machines.",
      },
      {
        h2: "With the curl",
        p: "Leg curl then extension, or the other way, is a fine pair. Rest after the pair. Write both numbers. Skipping the log because it was a superset is how the history dies.",
      },
      {
        h2: "If the knees complain",
        p: "Shorten the range. Lighten the pin. Or skip and squat. Tell a parent or coach if something is sharp. Coaching, not a clinic.",
      },
    ],
    faqs: [
      {
        q: "Toes in or out?",
        a: "Neutral is the default. Do not chase a trick angle. Pick one for a month.",
      },
      {
        q: "One leg?",
        a: "Later, if one side is clearly weaker. Log single-leg as its own movement.",
      },
    ],
    engineCta:
      "Log leg extensions in the free Vitality Engine. Pin number, every working set.",
    relatedTools: [],
    relatedSlugs: ["back-squat", "goblet-squat", "leg-curl"],
  },
  {
    slug: "dip",
    name: "Dip",
    cluster: "train",
    batch: "2026-08-25b",
    eyebrow: "Parallel bars, not a bench behind you",
    primaryMuscle: "triceps",
    equipment: "bodyweight",
    trackingType: "reps_only",
    description:
      "Dip cues: bars at your sides, shoulders packed, lower until the upper arms are about parallel, press up. Log it in Vitality Engine.",
    lede: "Hands on parallel bars. Jump to support. Lower. Press. This is not a bench dip. Your feet hang. Own a range you can repeat.",
    hunterNote:
      "I keep the range honest and I do not chase depth to the floor. If my shoulders yell, I stop or I go back to a bench dip. Pride is not a set.",
    cues: [
      "Bars at your sides. Shoulders packed. Not shrugged into your ears.",
      "Lean a little forward if you want more chest. Stay more upright for more triceps. Pick one.",
      "Lower until the upper arms are about parallel. Not a deep hang if it pinches.",
      "Elbows point back, not flared wide.",
      "Press to long arms. Do not bounce out of the bottom.",
    ],
    setup:
      "Parallel bars or a dip station. Bench dips first if you cannot own a support position. Band-assisted is allowed. Log the name. 3 sets of 5-10. If the bars are a scene, close-grip push-ups are a fine swap.",
    mistakes:
      "Dropping into a deep stretch because more range looked tougher. Flaring. Swinging the legs. Adding a belt in week one. Also: mixing bench dips and bar dips in one number.",
    body: [
      {
        h2: "After bench dips",
        p: "The bench version shortened the lever. These are the real bars. When 8-12 bench dips look quiet, try 3-5 bar dips. Log both if you mix them in a session.",
      },
      {
        h2: "Chest vs triceps bias",
        p: "A little forward lean hits more chest. Upright hits more triceps. Pick one for a month so the log compares. You do not need both in one night.",
      },
      {
        h2: "If the shoulders complain",
        p: "Raise the range. Use a band. Or stay on bench dips and a pushdown. Stop if something is sharp. This page is coaching, not a clinic.",
      },
    ],
    faqs: [
      {
        q: "How deep?",
        a: "About upper arms parallel is the default. Deeper is optional later if it stays quiet. Depth is earned.",
      },
      {
        q: "Weighted?",
        a: "After 8 clean bodyweight reps. A belt or a dumbbell. Log the extra. Do not add plates because the person next to you did.",
      },
    ],
    engineCta:
      "Log dips in the free Vitality Engine. Bar dips, not bench dips, unless that is what you did.",
    relatedTools: [],
    relatedSlugs: ["bench-dip", "push-up", "cable-pushdown-rope"],
  },
];
