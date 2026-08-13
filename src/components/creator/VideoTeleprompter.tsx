"use client";

import { useState } from "react";

export type TeleprompterScript = {
  spokenLines: string[];
  shotList?: string[];
  coachNote?: string;
  durationSec?: number;
  filmMode?: "silent_vo" | "talking_head";
};

export default function VideoTeleprompter({
  script,
}: {
  script: TeleprompterScript;
}) {
  const [index, setIndex] = useState(0);
  const [rehearsals, setRehearsals] = useState(0);
  const [recording, setRecording] = useState(false);
  const line = script.spokenLines[index] ?? "";
  const done = index >= script.spokenLines.length;

  return (
    <div className="space-y-4">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
        {script.filmMode === "talking_head"
          ? "Talk to camera"
          : "Silent lift, then read this at home"}
      </p>
      {script.coachNote ? (
        <p className="font-sans text-sm text-brand-muted">
          Coach: {script.coachNote}
        </p>
      ) : null}
      {script.shotList?.length ? (
        <ul className="list-disc pl-5 font-sans text-sm text-brand-ink">
          {script.shotList.map((shot) => (
            <li key={shot}>{shot}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex min-h-48 items-center justify-center bg-surface-dark px-6 py-10 text-center">
        <p className="font-display text-3xl leading-tight text-white sm:text-4xl">
          {done ? "That is the whole script." : line}
        </p>
      </div>
      <p className="font-sans text-xs text-brand-muted">
        Line {Math.min(index + 1, script.spokenLines.length)} of{" "}
        {script.spokenLines.length}
        {script.durationSec ? ` · ~${script.durationSec}s` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIndex((n) => Math.max(0, n - 1))}
          className="border border-brand-ink/20 px-4 py-2 font-sans text-xs font-bold uppercase"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() =>
            setIndex((n) => Math.min(script.spokenLines.length, n + 1))
          }
          className="bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase text-white"
        >
          Next line
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setRehearsals((n) => n + 1);
            setRecording(false);
          }}
          className="font-sans text-xs font-semibold text-brand-orange"
        >
          Rehearse again ({rehearsals}/3)
        </button>
        <button
          type="button"
          onClick={() => setRecording(true)}
          className="font-sans text-xs font-semibold text-brand-ink"
        >
          {recording ? "Recording mode on" : "Ready to record"}
        </button>
      </div>
    </div>
  );
}

export function scriptFromIdea(idea: {
  spokenLines?: string[] | null;
  voiceoverScript?: string | null;
  shotList?: string[] | null;
  coachNote?: string | null;
  durationSec?: number | null;
  filmMode?: "silent_vo" | "talking_head" | null;
}): TeleprompterScript {
  const spoken =
    idea.spokenLines?.map((l) => l.trim()).filter(Boolean) ?? [];
  const fromVo = scriptFromVoiceover(idea.voiceoverScript ?? "");
  return {
    spokenLines: spoken.length ? spoken : fromVo.spokenLines,
    shotList: idea.shotList?.filter(Boolean).length
      ? idea.shotList.filter(Boolean)
      : fromVo.shotList,
    coachNote: idea.coachNote?.trim() || fromVo.coachNote,
    durationSec: idea.durationSec ?? fromVo.durationSec,
    filmMode: idea.filmMode === "talking_head" ? "talking_head" : "silent_vo",
  };
}

export function scriptFromVoiceover(voiceover: string): TeleprompterScript {
  const spokenLines = voiceover
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    spokenLines:
      spokenLines.length > 0
        ? spokenLines
        : ["Log this in the free Vitality Engine so it shows up on the right day."],
    filmMode: "silent_vo",
    coachNote: "Have him smile on the last line, then look at the bar.",
    durationSec: Math.min(45, spokenLines.length * 4 || 20),
  };
}
