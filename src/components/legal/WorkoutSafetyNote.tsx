import { WORKOUT_SAFETY_NOTE } from "@/lib/legal/terms-2026-08-14";

export default function WorkoutSafetyNote() {
  return (
    <p
      role="note"
      className="font-sans text-xs leading-relaxed text-brand-muted"
    >
      {WORKOUT_SAFETY_NOTE}
    </p>
  );
}
