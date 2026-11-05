import type {
  MatchLevel,
  ScholarshipAnswers,
  ScholarshipCriteria,
} from "./types";

export type MatchResult = {
  match: MatchLevel;
  reason: string;
};

function bankParent(profile: ScholarshipAnswers): boolean | null {
  const employer = `${profile.parent1Employer} ${profile.parent2Employer}`.trim();
  if (!employer) return null;
  const text = employer.toLowerCase();
  return text.includes("first federal") || text.includes("bank");
}

export function matchScholarship(
  profile: ScholarshipAnswers,
  criteria: ScholarshipCriteria,
): MatchResult {
  const gpa = profile.gpaUnweighted;
  const act = profile.actComposite;

  if (criteria.kind === "retake") {
    const target = criteria.targetAct ?? 23;
    if (act == null) {
      return {
        match: "needs_info",
        reason: "Add the ACT composite. A 23 is the line for Cypress and TOPS Performance.",
      };
    }
    if (act >= target) {
      return {
        match: "likely",
        reason: `Composite ${act} already meets ${target}. Send the score to UL Lafayette, school code 1612.`,
      };
    }
    return {
      match: "likely",
      reason: `Composite ${act} is short of ${target}. That retake is the main way to add money on top of TOPS tuition.`,
    };
  }

  if (criteria.phase === "after_enrollment") {
    return {
      match: "stretch",
      reason: "This opens after he is a full-time UL Lafayette student, not during high school.",
    };
  }

  if (criteria.phase === "local_list") {
    if (!profile.highSchool.trim()) {
      return {
        match: "needs_info",
        reason: "Add his high school, then ask that counseling office for this year's local awards.",
      };
    }
    return {
      match: "likely",
      reason: `Ask the counseling office at ${profile.highSchool} and add each local award with its link and deadline.`,
    };
  }

  if (criteria.affiliation === "swlacu") {
    if (profile.swlacuMember == null) {
      return {
        match: "needs_info",
        reason:
          "Confirm a Southwest Louisiana Credit Union membership. A mortgage is not the same thing as the member account this scholarship requires.",
      };
    }
    if (!profile.swlacuMember) {
      return {
        match: "unlikely",
        reason: "This scholarship requires a Southwest Louisiana Credit Union member in good standing.",
      };
    }
  }

  if (criteria.affiliation === "beci") {
    if (profile.beciMember == null) {
      return {
        match: "needs_info",
        reason: "Confirm the Beauregard Electric membership has been in good standing for 12 months.",
      };
    }
    if (!profile.beciMember) {
      return {
        match: "unlikely",
        reason: "BECi awards this to members and their children.",
      };
    }
  }

  if (criteria.affiliation === "beta") {
    if (!profile.activities.toLowerCase().includes("beta")) {
      return {
        match: "needs_info",
        reason: "Confirm he is a 12th-grade Senior Beta member registered with National Beta.",
      };
    }
  }

  if (criteria.affiliation === "dyb") {
    if (!profile.activities.toLowerCase().includes("dixie")) {
      return {
        match: "needs_info",
        reason:
          "Confirm he played at least one season of Dixie Youth Baseball from ages 5 to 12. Other youth baseball does not count.",
      };
    }
  }

  if (criteria.affiliation === "service") {
    const activities = profile.activities.toLowerCase();
    if (!activities.includes("volunteer") && !activities.includes("community service")) {
      return {
        match: "needs_info",
        reason:
          "This award needs volunteer service and two letters from those organizations. Add that service before treating this as a fit.",
      };
    }
  }

  if (criteria.affiliation === "lba_parent") {
    const bank = bankParent(profile);
    if (bank == null) {
      return {
        match: "needs_info",
        reason: "Add the parent employer. This award is for a student whose parent works at an LBA member bank.",
      };
    }
    if (!bank) {
      return {
        match: "unlikely",
        reason: "Needs a parent employed by a Louisiana Bankers Association member bank.",
      };
    }
  }

  if (criteria.unlikelyAboveIncome != null) {
    if (profile.householdIncome == null) {
      return {
        match: "needs_info",
        reason: "Add household income. This grant is need-based.",
      };
    }
    if (profile.householdIncome > criteria.unlikelyAboveIncome) {
      return {
        match: "unlikely",
        reason:
          "Household income is above the usual range for this need-based grant. File the FAFSA anyway. Do not count this toward room and board.",
      };
    }
  }

  if (criteria.targetAct != null) {
    if (act == null) {
      return { match: "needs_info", reason: "Add the ACT composite." };
    }
    if (gpa == null && criteria.minGpa != null) {
      return { match: "needs_info", reason: "Add the unweighted GPA." };
    }
    if (criteria.minGpa != null && gpa != null && gpa < criteria.minGpa) {
      return { match: "unlikely", reason: `Needs a ${criteria.minGpa} unweighted GPA.` };
    }
    if (act < criteria.targetAct) {
      return {
        match: "stretch",
        reason: `Needs ACT ${criteria.targetAct}. Current composite is ${act}.`,
      };
    }
  }

  if (criteria.orActInsteadOfGpa) {
    const gpaOk = gpa != null && criteria.minGpa != null && gpa >= criteria.minGpa;
    const actOk = act != null && criteria.minAct != null && act >= criteria.minAct;
    if (gpa == null && act == null) {
      return { match: "needs_info", reason: "Add GPA or ACT." };
    }
    if (!gpaOk && !actOk) {
      return { match: "unlikely", reason: "Needs the published GPA or ACT minimum." };
    }
  } else {
    if (criteria.minGpa != null) {
      if (gpa == null) return { match: "needs_info", reason: "Add the unweighted GPA." };
      if (gpa < criteria.minGpa) {
        return { match: "unlikely", reason: `Needs a ${criteria.minGpa} unweighted GPA.` };
      }
    }
    if (criteria.minAct != null && criteria.targetAct == null) {
      if (act == null) return { match: "needs_info", reason: "Add the ACT composite." };
      if (act < criteria.minAct) {
        return { match: "unlikely", reason: `Needs ACT ${criteria.minAct}.` };
      }
    }
  }

  return {
    match: "likely",
    reason: criteria.likelyReason ?? "The saved answers meet the published requirements.",
  };
}
