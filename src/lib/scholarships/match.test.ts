import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daysUntilDeadline, isAlertWindow } from "./dates";
import { matchScholarship } from "./match";
import type { ScholarshipAnswers } from "./types";

const profile: ScholarshipAnswers = {
  studentFirstName: "Student",
  studentLastName: "Example",
  studentEmail: "",
  phone: "",
  city: "",
  state: "LA",
  zip: "",
  parish: "Allen",
  highSchool: "",
  graduationYear: "2027",
  gpaUnweighted: 3.85,
  classRank: "",
  actComposite: 20,
  actEnglish: null,
  actMath: null,
  actReading: null,
  actScience: null,
  citizenship: "US citizen",
  college: "University of Louisiana at Lafayette",
  startTerm: "Fall 2027",
  major: "Business",
  minor: "Kinesiology",
  housingPlan: "On campus",
  parent1Name: "",
  parent1Employer: "",
  parent1College: "",
  parent1Degree: "",
  parent1GradYear: "",
  parent2Name: "",
  parent2Employer: "Example Member Bank",
  parent2College: "",
  parent2Degree: "",
  parent2GradYear: "",
  beciMember: true,
  swlacuMember: null,
  householdIncome: 140000,
  othersInCollege: "",
  fsaIdsCreated: null,
  fafsaFiled: false,
  activities: "Youth baseball",
  hasTranscript: false,
  hasScoreReport: false,
  hasRecommendations: false,
};

describe("scholarship match", () => {
  it("marks TOPS as likely and GO Grant as unlikely at this income", () => {
    assert.equal(
      matchScholarship(profile, { minGpa: 2.5, minAct: 20, affiliation: "louisiana" }).match,
      "likely",
    );
    assert.equal(
      matchScholarship(profile, { unlikelyAboveIncome: 80000 }).match,
      "unlikely",
    );
  });

  it("treats ACT 20 as a Cypress stretch and a retake worth doing", () => {
    assert.equal(
      matchScholarship(profile, { minGpa: 3, targetAct: 23 }).match,
      "stretch",
    );
    const retake = matchScholarship(profile, { kind: "retake", targetAct: 23 });
    assert.equal(retake.match, "likely");
    assert.match(retake.reason, /short of 23/);
  });

  it("asks for credit union membership and accepts the bank parent", () => {
    assert.equal(
      matchScholarship(profile, { minGpa: 3, affiliation: "swlacu" }).match,
      "needs_info",
    );
    assert.equal(
      matchScholarship(profile, {
        minGpa: 3,
        minAct: 20,
        orActInsteadOfGpa: true,
        affiliation: "lba_parent",
      }).match,
      "likely",
    );
    assert.equal(
      matchScholarship(profile, { minGpa: 2, affiliation: "beci" }).match,
      "likely",
    );
  });

  it("holds Dixie Youth until the league is confirmed", () => {
    assert.equal(matchScholarship(profile, { affiliation: "dyb" }).match, "needs_info");
    assert.equal(
      matchScholarship(
        { ...profile, activities: "Played Dixie Youth Baseball at age 11" },
        { affiliation: "dyb" },
      ).match,
      "likely",
    );
  });

  it("counts alert windows from a Chicago calendar date", () => {
    assert.equal(daysUntilDeadline("2027-02-15", "2027-02-01"), 14);
    assert.equal(isAlertWindow(14), true);
    assert.equal(isAlertWindow(10), false);
  });
});
