"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScholarshipDesk as DeskData } from "@/lib/scholarships/load";
import ScholarshipQuestionnaire from "./ScholarshipQuestionnaire";
import ScholarshipTracker from "./ScholarshipTracker";

export default function ScholarshipDesk({ initial }: { initial: DeskData }) {
  const router = useRouter();
  const hasAnswers = Boolean(initial.answers.studentFirstName.trim());
  const [editing, setEditing] = useState(!hasAnswers);

  if (editing) {
    return (
      <ScholarshipQuestionnaire
        answers={initial.answers}
        onDone={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return <ScholarshipTracker data={initial} onEdit={() => setEditing(true)} />;
}
