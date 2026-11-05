export type MatchLevel = "likely" | "stretch" | "unlikely" | "needs_info";

export type ScholarshipCriteria = {
  minGpa?: number;
  minAct?: number;
  targetAct?: number;
  unlikelyAboveIncome?: number;
  orActInsteadOfGpa?: boolean;
  affiliation?: "louisiana" | "beci" | "swlacu" | "lba_parent" | "dyb" | "service" | "beta";
  phase?: "after_enrollment" | "local_list";
  kind?: "action" | "retake";
  likelyReason?: string;
};

export type ScholarshipAnswers = {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  parish: string;
  highSchool: string;
  graduationYear: string;
  gpaUnweighted: number | null;
  classRank: string;
  actComposite: number | null;
  actEnglish: number | null;
  actMath: number | null;
  actReading: number | null;
  actScience: number | null;
  citizenship: string;
  college: string;
  startTerm: string;
  major: string;
  minor: string;
  housingPlan: string;
  parent1Name: string;
  parent1Employer: string;
  parent1College: string;
  parent1Degree: string;
  parent1GradYear: string;
  parent2Name: string;
  parent2Employer: string;
  parent2College: string;
  parent2Degree: string;
  parent2GradYear: string;
  beciMember: boolean | null;
  swlacuMember: boolean | null;
  householdIncome: number | null;
  othersInCollege: string;
  fsaIdsCreated: boolean | null;
  fafsaFiled: boolean | null;
  activities: string;
  hasTranscript: boolean;
  hasScoreReport: boolean;
  hasRecommendations: boolean;
};

export const EMPTY_ANSWERS: ScholarshipAnswers = {
  studentFirstName: "",
  studentLastName: "",
  studentEmail: "",
  phone: "",
  city: "",
  state: "LA",
  zip: "",
  parish: "",
  highSchool: "",
  graduationYear: "",
  gpaUnweighted: null,
  classRank: "",
  actComposite: null,
  actEnglish: null,
  actMath: null,
  actReading: null,
  actScience: null,
  citizenship: "",
  college: "",
  startTerm: "",
  major: "",
  minor: "",
  housingPlan: "",
  parent1Name: "",
  parent1Employer: "",
  parent1College: "",
  parent1Degree: "",
  parent1GradYear: "",
  parent2Name: "",
  parent2Employer: "",
  parent2College: "",
  parent2Degree: "",
  parent2GradYear: "",
  beciMember: null,
  swlacuMember: null,
  householdIncome: null,
  othersInCollege: "",
  fsaIdsCreated: null,
  fafsaFiled: null,
  activities: "",
  hasTranscript: false,
  hasScoreReport: false,
  hasRecommendations: false,
};
