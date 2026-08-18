import { gymNameKey, normalizeGymName } from "@/lib/gyms/names";

/** Seeded check-in names from Breaux Bridge to Vinton, north to Alexandria. No GPS. */
export const SWLA_GYM_DIRECTORY: ReadonlyArray<{ name: string; metro: string }> = [
  // Lafayette metro
  { name: "Red's Health Club Lafayette", metro: "Lafayette" },
  { name: "Red Lerille's Lafayette", metro: "Lafayette" },
  { name: "Planet Fitness Lafayette (Ambassador Caffery)", metro: "Lafayette" },
  { name: "Anytime Fitness Lafayette (Kaliste Saloom)", metro: "Lafayette" },
  { name: "Anytime Fitness Lafayette (Johnston)", metro: "Lafayette" },
  { name: "CLUB4 Fitness Lafayette (Ambassador Caffery)", metro: "Lafayette" },
  { name: "CLUB4 Fitness Lafayette (Johnston)", metro: "Lafayette" },
  { name: "Snap Fitness Lafayette (Congress)", metro: "Lafayette" },
  { name: "Orangetheory Lafayette", metro: "Lafayette" },
  { name: "F45 Training Lafayette", metro: "Lafayette" },
  { name: "Iron House Lafayette", metro: "Lafayette" },
  { name: "CrossFit Amis Lafayette", metro: "Lafayette" },
  { name: "CrossFit Acadiana Lafayette", metro: "Lafayette" },
  { name: "HOTWORX Lafayette (River Ranch)", metro: "Lafayette" },
  { name: "HOTWORX Lafayette (Midtown)", metro: "Lafayette" },
  { name: "UL Lafayette Rec Center", metro: "Lafayette" },
  { name: "Anytime Fitness Broussard", metro: "Broussard" },
  { name: "Cajun Fitness Broussard", metro: "Broussard" },
  { name: "Snap Fitness Broussard", metro: "Broussard" },
  { name: "Anytime Fitness Youngsville", metro: "Youngsville" },
  { name: "Cajun Fitness Youngsville", metro: "Youngsville" },
  { name: "Ole Glory Health and Fitness Youngsville", metro: "Youngsville" },
  { name: "Anytime Fitness Carencro", metro: "Carencro" },
  { name: "Anytime Fitness Scott", metro: "Scott" },
  { name: "CrossFit Acadiana Breaux Bridge", metro: "Breaux Bridge" },

  // East / south Acadiana
  { name: "Planet Fitness New Iberia", metro: "New Iberia" },
  { name: "Anytime Fitness New Iberia", metro: "New Iberia" },
  { name: "Ole Glory Health and Fitness New Iberia", metro: "New Iberia" },
  { name: "Snap Fitness Abbeville", metro: "Abbeville" },

  // I-49 / north Acadiana
  { name: "Planet Fitness Opelousas", metro: "Opelousas" },
  { name: "Anytime Fitness Opelousas", metro: "Opelousas" },
  { name: "Cajun Fitness Opelousas", metro: "Opelousas" },
  { name: "Cajun Fitness Eunice", metro: "Eunice" },
  { name: "Anytime Fitness Ville Platte", metro: "Ville Platte" },
  { name: "Anytime Fitness Bunkie", metro: "Bunkie" },

  // I-10 west of Lafayette
  { name: "Cajun Fitness Rayne", metro: "Rayne" },
  { name: "Planet Fitness Crowley", metro: "Crowley" },
  { name: "Anytime Fitness Crowley", metro: "Crowley" },
  { name: "Anytime Fitness Jennings", metro: "Jennings" },
  { name: "Anytime Fitness Iowa", metro: "Iowa" },

  // Lake Charles / west
  { name: "Planet Fitness Lake Charles (Ryan)", metro: "Lake Charles" },
  { name: "Anytime Fitness Lake Charles (Nelson)", metro: "Lake Charles" },
  { name: "CLUB4 Fitness Lake Charles", metro: "Lake Charles" },
  { name: "Hurricane CrossFit Lake Charles", metro: "Lake Charles" },
  { name: "Orangetheory Lake Charles", metro: "Lake Charles" },
  { name: "Mayweather Boxing + Fitness Lake Charles", metro: "Lake Charles" },
  { name: "Project Fit Lake Charles", metro: "Lake Charles" },
  { name: "Fit Body Boot Camp Lake Charles", metro: "Lake Charles" },
  { name: "YMCA of Southwest Louisiana", metro: "Lake Charles" },
  { name: "McNeese Campus Recreation", metro: "Lake Charles" },
  { name: "Anytime Fitness Moss Bluff", metro: "Moss Bluff" },
  { name: "Genesis Fitness Center Westlake", metro: "Westlake" },
  { name: "Anytime Fitness Sulphur", metro: "Sulphur" },
  { name: "All Hours Fitness DeRidder", metro: "DeRidder" },

  // Alexandria / Pineville
  { name: "Planet Fitness Alexandria", metro: "Alexandria" },
  { name: "Anytime Fitness Alexandria (Coliseum)", metro: "Alexandria" },
  { name: "Body Roque Fitness Alexandria", metro: "Alexandria" },
  { name: "Rapides Fitness Center Alexandria", metro: "Alexandria" },
  { name: "Alexandria Family YMCA", metro: "Alexandria" },
  { name: "LSUA Fitness Center", metro: "Alexandria" },
  { name: "Anytime Fitness Pineville (Hwy 165)", metro: "Pineville" },
  { name: "Body Roque Fitness Pineville", metro: "Pineville" },
  { name: "CrossFit 28 Pineville", metro: "Pineville" },
];

export function swlaGymDirectoryRows(): { name: string; name_key: string; metro: string }[] {
  return SWLA_GYM_DIRECTORY.map((gym) => ({
    name: normalizeGymName(gym.name),
    name_key: gymNameKey(gym.name),
    metro: gym.metro,
  }));
}
