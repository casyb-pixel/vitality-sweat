type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechDictationAvailable(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function transcriptFromSpeechEvent(
  event: SpeechRecognitionEventLike,
): { finalChunk: string; interimChunk: string } {
  let finalChunk = "";
  let interimChunk = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const spoken = result?.[0]?.transcript?.trim() ?? "";
    if (!spoken) continue;
    if (result.isFinal) finalChunk = [finalChunk, spoken].filter(Boolean).join(" ");
    else interimChunk = [interimChunk, spoken].filter(Boolean).join(" ");
  }
  return { finalChunk, interimChunk };
}
