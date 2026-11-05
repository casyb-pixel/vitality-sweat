import { EMPTY_ANSWERS, type ScholarshipAnswers } from "./types";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function flag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

export function parseAnswers(value: unknown): ScholarshipAnswers {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ...EMPTY_ANSWERS,
    studentFirstName: text(raw.studentFirstName),
    studentLastName: text(raw.studentLastName),
    studentEmail: text(raw.studentEmail),
    phone: text(raw.phone),
    city: text(raw.city),
    state: text(raw.state) || "LA",
    zip: text(raw.zip),
    parish: text(raw.parish),
    highSchool: text(raw.highSchool),
    graduationYear: text(raw.graduationYear),
    gpaUnweighted: num(raw.gpaUnweighted),
    classRank: text(raw.classRank),
    actComposite: num(raw.actComposite),
    actEnglish: num(raw.actEnglish),
    actMath: num(raw.actMath),
    actReading: num(raw.actReading),
    actScience: num(raw.actScience),
    citizenship: text(raw.citizenship),
    college: text(raw.college),
    startTerm: text(raw.startTerm),
    major: text(raw.major),
    minor: text(raw.minor),
    housingPlan: text(raw.housingPlan),
    parent1Name: text(raw.parent1Name),
    parent1Employer: text(raw.parent1Employer),
    parent1College: text(raw.parent1College),
    parent1Degree: text(raw.parent1Degree),
    parent1GradYear: text(raw.parent1GradYear),
    parent2Name: text(raw.parent2Name),
    parent2Employer: text(raw.parent2Employer),
    parent2College: text(raw.parent2College),
    parent2Degree: text(raw.parent2Degree),
    parent2GradYear: text(raw.parent2GradYear),
    beciMember: flag(raw.beciMember),
    swlacuMember: flag(raw.swlacuMember),
    householdIncome: num(raw.householdIncome),
    othersInCollege: text(raw.othersInCollege),
    fsaIdsCreated: flag(raw.fsaIdsCreated),
    fafsaFiled: flag(raw.fafsaFiled),
    activities: text(raw.activities),
    hasTranscript: raw.hasTranscript === true,
    hasScoreReport: raw.hasScoreReport === true,
    hasRecommendations: raw.hasRecommendations === true,
  };
}

export function answersFromForm(form: FormData): ScholarshipAnswers {
  const read = (key: string) => String(form.get(key) ?? "");
  const optionalFlag = (key: string): boolean | null => {
    const value = read(key);
    if (value === "yes") return true;
    if (value === "no") return false;
    return null;
  };
  const optionalNumber = (key: string): number | null => {
    const value = read(key).trim();
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    studentFirstName: read("studentFirstName").trim(),
    studentLastName: read("studentLastName").trim(),
    studentEmail: read("studentEmail").trim(),
    phone: read("phone").trim(),
    city: read("city").trim(),
    state: read("state").trim() || "LA",
    zip: read("zip").trim(),
    parish: read("parish").trim(),
    highSchool: read("highSchool").trim(),
    graduationYear: read("graduationYear").trim(),
    gpaUnweighted: optionalNumber("gpaUnweighted"),
    classRank: read("classRank").trim(),
    actComposite: optionalNumber("actComposite"),
    actEnglish: optionalNumber("actEnglish"),
    actMath: optionalNumber("actMath"),
    actReading: optionalNumber("actReading"),
    actScience: optionalNumber("actScience"),
    citizenship: read("citizenship").trim(),
    college: read("college").trim(),
    startTerm: read("startTerm").trim(),
    major: read("major").trim(),
    minor: read("minor").trim(),
    housingPlan: read("housingPlan").trim(),
    parent1Name: read("parent1Name").trim(),
    parent1Employer: read("parent1Employer").trim(),
    parent1College: read("parent1College").trim(),
    parent1Degree: read("parent1Degree").trim(),
    parent1GradYear: read("parent1GradYear").trim(),
    parent2Name: read("parent2Name").trim(),
    parent2Employer: read("parent2Employer").trim(),
    parent2College: read("parent2College").trim(),
    parent2Degree: read("parent2Degree").trim(),
    parent2GradYear: read("parent2GradYear").trim(),
    beciMember: optionalFlag("beciMember"),
    swlacuMember: optionalFlag("swlacuMember"),
    householdIncome: optionalNumber("householdIncome"),
    othersInCollege: read("othersInCollege").trim(),
    fsaIdsCreated: optionalFlag("fsaIdsCreated"),
    fafsaFiled: optionalFlag("fafsaFiled"),
    activities: read("activities").trim(),
    hasTranscript: form.get("hasTranscript") === "on",
    hasScoreReport: form.get("hasScoreReport") === "on",
    hasRecommendations: form.get("hasRecommendations") === "on",
  };
}
