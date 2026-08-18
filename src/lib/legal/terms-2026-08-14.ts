import type { PolicyBlock, PolicyPage } from "@/lib/legal/policy-types";

/** Bump this when the Terms change. Existing members must re-accept. */
export const CURRENT_TERMS_VERSION = "2026-08-18";
export const TERMS_LAST_UPDATED = "August 18, 2026";

export const TERMS_ACCEPT_LABEL =
  "I am 18 or older, or I am a parent or guardian accepting for a minor I supervise. I have read and agree to the Terms of Use and Release of Liability.";

export const NUTRITION_SAFETY_BANNER =
  "Suggested meals are not medical or dietitian advice. If you are allergic or unsure about any ingredient, do not eat it. Read labels. Stop and talk to a clinician if you have a condition that affects diet.";

export const GROCERY_SHARE_SAFETY_LINE =
  "If you are allergic or intolerant to any food on this list, do not buy or eat it. Read labels. This list is a suggestion, not dietitian advice.";

export const WORKOUT_SAFETY_NOTE =
  "This is not medical advice. Stop if you feel pain, dizziness, or chest symptoms. Get physician clearance before hard training."

export const HEALTH_FITNESS_DISCLAIMER_TITLE =
  "Vitality Sweat: health and fitness disclaimer";

export const HEALTH_FITNESS_DISCLAIMER_BLOCKS: PolicyBlock[] = [
  {
    type: "h3",
    text: "For informational purposes only. Not medical advice.",
  },
  {
    type: "p",
    text: "All content provided on or through the Vitality Sweat website, Sweatlife Chronicles, and the Vitality Engine app, including text, graphics, workouts, video demonstrations, exercise plans, nutrition suggestions, grocery lists, and other materials, is provided solely for general educational and informational purposes.",
  },
  {
    type: "h3",
    text: "Consult your physician",
  },
  {
    type: "p",
    text: "This content is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider with any questions you have about a medical condition, physical limitation, allergy, or before starting any new exercise, nutrition, or wellness program. Never disregard professional medical advice or delay seeking it because of something you read or accessed through Vitality Sweat.",
  },
  {
    type: "h3",
    text: "Assumption of risk",
  },
  {
    type: "p",
    text: "Participating in physical exercise or athletic activities carries inherent risks of physical injury. By voluntarily performing any workouts, exercises, or routines presented on Vitality Sweat, you acknowledge that you are doing so at your own risk. Vitality Sweat and its creators, owners, employees, contractors, and affiliates assume no responsibility or liability for any injury, loss, or damage incurred as a result of using this platform, except to the extent Louisiana law does not allow that limitation.",
  },
  {
    type: "h3",
    text: "Food, allergies, and meal suggestions",
  },
  {
    type: "p",
    text: "Suggested meal plans, recipes, and grocery lists may include foods you cannot safely eat, even if you listed allergies or dislikes in your profile. Artificial intelligence and automated planning can miss ingredients, cross-contact, or labeling differences. If you are allergic or intolerant to any food in a suggested plan, do not eat it. Read every label. When in doubt, skip the item and talk to a clinician or registered dietitian.",
  },
];

export const TERMS_PAGE: PolicyPage = {
  slug: "terms",
  title: "Terms of Use and Release of Liability",
  description:
    "Terms of use, assumption of risk, nutrition warnings, and release of liability for Vitality Sweat, Vitality Engine, Sweatlife Chronicles, and The Engine Room.",
  sourceUrl: "https://vitalitysweat.com/terms",
  blocks: [
    {
      type: "p",
      text: `Last updated: ${TERMS_LAST_UPDATED}. Version ${CURRENT_TERMS_VERSION}. Please read these Terms of Use carefully before using Vitality Sweat or any related service. By creating an account, clicking accept, or using the Vitality Sweat website, the Vitality Engine app, Sweatlife Chronicles, The Engine Room, Train together, Share the Engine, grocery lists, or related services (together, the "Services"), you agree to be bound by these Terms. If you do not agree, do not create an account and do not use the Services.`,
    },
    { type: "h2", text: "1. Agreement" },
    {
      type: "p",
      text: "These Terms form a binding agreement between you and Vitality Sweat (Hunter Broussard and affiliated operators, together \"Vitality Sweat,\" \"we,\" or \"us\"). They apply to visitors and to members. Additional Community Guidelines at /community-guidelines are part of these Terms.",
    },
    { type: "h2", text: "2. Who we are and what this is not" },
    {
      type: "p",
      text: "Vitality Sweat is a Southwest Louisiana training, coaching, nutrition-education, and youth baseball brand. The Vitality Engine is a free member app that can suggest workouts and meals, including with automated or AI-generated content. The Engine Room coach is the same kind of automated coaching, not a licensed clinician and not a direct message between members.",
    },
    {
      type: "p",
      text: "The Services are not a medical practice, physical therapy clinic, or licensed dietitian service. Nothing in the Services is medical advice, diagnosis, treatment, or an individualized clinical care plan. We are not your physician, physical therapist, or registered dietitian. AI-generated programs and meals are tools, not a substitute for professional care.",
    },
    { type: "h2", text: "3. Eligibility and parental consent" },
    {
      type: "p",
      text: "You represent that you are at least 18 years of age, or that a parent or legal guardian is accepting these Terms on behalf of a minor and will supervise that minor's use of the Services. Youth baseball articles and coaching notes do not make the Services pediatric medical care. If you accept for a minor, you are responsible for their use, their posts, and any injury or claim arising from that use.",
    },
    { type: "h2", text: "4. Acknowledgment of physical demands and risk" },
    {
      type: "p",
      text: "You acknowledge that workouts, exercise programs, Train together sessions, video-guided routines, and instructional content involve strenuous physical activity. That can include strength training, cardiovascular exercise, mobility work, high-intensity interval training, baseball-related training, and unsupervised home or gym work.",
    },
    {
      type: "p",
      text: "You represent and warrant that: (a) you meet the eligibility rules above; (b) you are in adequate physical condition to participate, or you have chosen to proceed anyway at your own risk; and (c) you have been cleared by a licensed physician to engage in physical exercise, or you have voluntarily chosen to proceed without such clearance at your own risk.",
    },
    {
      type: "p",
      text: "Stop immediately if you feel chest pain, dizziness, faintness, unusual shortness of breath, or sharp pain. Seek emergency care when needed. You are responsible for your form, load selection, equipment setup, spotting, and the space where you train. Unsupervised exercise, poor form, and misuse of equipment can cause serious injury.",
    },
    { type: "h2", text: "5. Express assumption of risk" },
    {
      type: "p",
      text: "You understand that unsupervised home workouts, gym sessions, video-guided routines, app-based exercise, and partner sessions carry inherent risks. Those risks include muscle strain, joint injury, bone fractures, cardiovascular events, heat exhaustion, allergic reaction, choking, foodborne illness, and in rare cases permanent disability or death.",
    },
    {
      type: "p",
      text: "You voluntarily, knowingly, and freely assume all risks, known and unknown, associated with your use of the Services, including risks arising from other members in The Engine Room or Train together, and from following suggested meals.",
    },
    { type: "h2", text: "6. Nutrition, allergies, and suggested meals" },
    {
      type: "p",
      text: "Meal plans, recipes, fuel logs, and grocery lists are suggestions only. They may include foods you cannot safely eat even if you listed allergies, dislikes, or health notes in your profile. Automated planning can omit ingredients, miss cross-contact, or fail to match store labels.",
    },
    {
      type: "p",
      text: "If you are allergic or intolerant to any food in a suggested plan, do not eat it. Do not feed suggested meals to anyone with a known allergy unless you have independently verified every ingredient. Always read labels. Vitality Sweat is not responsible if you eat a suggested food that harms you.",
    },
    { type: "h2", text: "7. Waiver and release of liability" },
    {
      type: "p",
      text: "To the fullest extent permitted by law, you release, waive, discharge, and hold harmless Vitality Sweat, Hunter Broussard, founders, owners, operators, certified or uncertified trainers, software developers, contractors, and affiliates (the \"Released Parties\") from any and all claims, demands, liabilities, causes of action, damages, or costs (including attorney fees) arising out of or related to:",
    },
    {
      type: "ul",
      items: [
        "Personal injury, illness, allergic reaction, or death resulting from your use of any exercise plan, routine, Train together session, video, or advice in the Services.",
        "Personal injury, illness, or death resulting from suggested meals, recipes, grocery lists, or nutrition content.",
        "Property damage from equipment or the space where you train.",
        "Content posted by you or other members in The Engine Room or elsewhere in the Services.",
        "Technical interruptions, app errors, inaccurate or incomplete AI output, or missed allergens.",
      ],
    },
    {
      type: "p",
      text: "Nothing in these Terms waives liability that Louisiana law does not allow us to waive, including where a waiver of gross negligence or similar conduct is unenforceable. If a court finds any part of this release unenforceable, the rest remains in effect.",
    },
    { type: "h2", text: "8. Indemnity" },
    {
      type: "p",
      text: "You agree to defend, indemnify, and hold the Released Parties harmless from claims, damages, losses, and expenses (including reasonable attorney fees) arising from: (a) your misuse of workouts or meals; (b) your posts, photos, or other content; (c) a minor you supervise; or (d) your violation of these Terms or applicable law.",
    },
    { type: "h2", text: "9. No guarantee of results" },
    {
      type: "p",
      text: "Vitality Sweat provides tools and guidance. Individual results vary based on genetics, effort, diet, recovery, consistency, and factors outside our control. We make no representations, guarantees, or warranties regarding specific weight loss, muscle gain, strength improvement, athletic performance, or fitness outcomes.",
    },
    { type: "h2", text: "10. User content and The Engine Room" },
    {
      type: "p",
      text: "You own the content you post. You grant Vitality Sweat a non-exclusive, worldwide, royalty-free license to host, display, and store that content so the Services can function. You may delete your posts subject to backups and legal holds.",
    },
    {
      type: "p",
      text: "You will not post: child sexual abuse material; sexual or exploitative content involving minors; photos of minors; harassment, threats, or hate; illegal activity; spam; or medical advice directed at other members as if you were their clinician. You will not impersonate others.",
    },
    {
      type: "p",
      text: "We do not pre-screen member posts. Posts reflect the author's views, not Vitality Sweat. We may remove content, restrict features, or close accounts at our discretion. We are not liable for what other members post, for follows or encouragement between members, or for your decision to train with someone you met in the app. Followers-only is the default. If you opt into public Engine Room posts, those posts can be seen by other members who also opted in. Visibility settings are not a promise of privacy from people you follow, who follow you, or who share the public square.",
    },
    {
      type: "p",
      text: "Photo posts require you to confirm you are 18 or older and that no minors appear in the photo. Report and block tools exist. There are no direct messages between members in The Engine Room. The Engine coach is an automated coaching thread for you, not a clinician, and not a conversation with other members. Personal ranks are training estimates from bodyweight and estimated one-rep max, not competition judging.",
    },
    { type: "h2", text: "11. Community Guidelines" },
    {
      type: "p",
      text: "The Community Guidelines at /community-guidelines are incorporated into these Terms. First-visit summaries in the app do not replace this agreement.",
    },
    { type: "h2", text: "12. Intellectual property" },
    {
      type: "p",
      text: "Workouts, original video demonstrations, blog articles, graphics, software, and branding under Vitality Sweat, Vitality Engine, Sweatlife, and related names are the exclusive property of Vitality Sweat and protected by copyright and other intellectual property laws, except for content you post (which you own, subject to the license above). You may not reproduce, redistribute, or resell app or site content without written permission.",
    },
    { type: "h2", text: "13. Third-party social posting" },
    {
      type: "p",
      text: "Share the Engine, Share a win, and similar tools help you prepare a caption and graphic. Posting to Facebook, Instagram, X, or any other network is your act. Those platforms' rules apply. We do not auto-post to personal social accounts without a separate, explicit confirm flow, and we are not responsible for how those platforms display or moderate your post.",
    },
    { type: "h2", text: "14. Account, changes, and termination" },
    {
      type: "p",
      text: "We may update these Terms. The version date and version key will change. Continued use after a new version requires a fresh accept in the app. We may suspend or terminate accounts that violate these Terms. You may stop using the Services at any time.",
    },
    { type: "h2", text: "15. Governing law and venue" },
    {
      type: "p",
      text: "These Terms are governed by the laws of the State of Louisiana, without regard to conflict-of-law rules. Exclusive venue for disputes is the state courts of Allen Parish, Louisiana, except where applicable law requires otherwise.",
    },
    { type: "h2", text: "16. Contact" },
    {
      type: "p",
      text: "Questions about these Terms: info@vitalitysweat.com. Privacy: see /privacy. Merchandise returns: see /return-policy.",
    },
    { type: "h2", text: "Health and fitness disclaimer" },
    ...HEALTH_FITNESS_DISCLAIMER_BLOCKS,
  ],
};

export const COMMUNITY_GUIDELINES_PAGE: PolicyPage = {
  slug: "community-guidelines",
  title: "Community Guidelines",
  description:
    "Rules for The Engine Room and member content on Vitality Sweat. These guidelines are part of the Terms of Use.",
  sourceUrl: "https://vitalitysweat.com/community-guidelines",
  blocks: [
    {
      type: "p",
      text: `Last updated: ${TERMS_LAST_UPDATED}. These Community Guidelines are part of the Terms of Use and Release of Liability. By using The Engine Room or posting in the Services, you agree to them.`,
    },
    { type: "h2", text: "Purpose" },
    {
      type: "p",
      text: "The Engine Room is a member space for celebrating training, posting encouragement, sharing wins, and locking personal lift ranks when you post a finished session. Posts default to followers only. You can opt into a public square with other members who also opt in. It is not an open internet social network and not a place for medical advice.",
    },
    { type: "h2", text: "Required conduct" },
    {
      type: "ul",
      items: [
        "Treat other members with respect. No harassment, threats, stalking, or hate.",
        "Do not post sexual content involving minors, child sexual abuse material, or photos of minors.",
        "Photo posts: confirm you are 18 or older and that no minors are in the photo.",
        "Do not give clinical or dietitian advice to other members as if you were their provider.",
        "Treat Engine ranks as training estimates, not meet results. The Engine coach is AI, not a clinician.",
        "Do not post illegal content, spam, scams, or impersonation.",
        "Do not share another person's private information.",
      ],
    },
    { type: "h2", text: "Visibility and no guarantee of privacy" },
    {
      type: "p",
      text: "Posts default to you and the people who follow you. If you opt into public Engine Room sharing, your public posts can be seen by other members who also opted in. Followers-only is not secrecy. People you follow, people who follow you, members in the public square you joined, and Vitality Sweat operators (for safety and reports) may see content as described in the Terms.",
    },
    { type: "h2", text: "Moderation" },
    {
      type: "p",
      text: "We do not pre-screen posts. We may remove content or suspend accounts. Report and block tools are available. There are no direct messages between members in The Engine Room in this version of the app. The Engine coach is AI, not a clinician, and not a DM with other members.",
    },
    { type: "h2", text: "Your liability" },
    {
      type: "p",
      text: "You are responsible for what you post. Vitality Sweat is not liable for member posts, for training with someone you met in the app, or for harm caused by content you chose to follow. If you post something unlawful or that injures another person, you may be solely responsible.",
    },
    { type: "h2", text: "Related terms" },
    {
      type: "p",
      text: "See the full Terms of Use and Release of Liability at /terms, including assumption of risk, nutrition warnings, and the liability release.",
    },
  ],
};
