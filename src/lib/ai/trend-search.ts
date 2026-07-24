import { createGeminiClient, getGeminiModel } from "@/lib/ai/gemini";

export type TrendSource = {
  title: string;
  url: string;
};

export type TrendResearch = {
  provider: "tavily" | "serper" | "gemini-search" | "baseline";
  queries: string[];
  /** Condensed plain-text digest of trending queries, questions, and articles. */
  findings: string;
  sources: TrendSource[];
};

const SEARCH_TIMEOUT_MS = 18_000;
const MAX_QUERIES = 2;
const MAX_RESULTS_PER_QUERY = 6;

/**
 * Researches current, high-engagement fitness/nutrition trends around Hunter's notes.
 * Preferred provider: TAVILY_API_KEY → SERPER_API_KEY → Gemini Google Search grounding.
 */
export async function runTrendResearch(input: {
  geminiApiKey: string;
  notes: string;
}): Promise<TrendResearch> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const serperKey = process.env.SERPER_API_KEY?.trim();
  const queries = await deriveFitnessTrendQueries(
    input.geminiApiKey,
    input.notes,
  );

  if (tavilyKey) {
    return searchTavily(tavilyKey, queries);
  }
  if (serperKey) {
    return searchSerper(serperKey, queries);
  }
  return searchWithGeminiGrounding(input.geminiApiKey, input.notes);
}

/**
 * Tavily-only helper for the generate_ideas workflow.
 * Returns null when the key is missing so callers can fall back cleanly.
 */
export async function fetchTavilyTrends(input: {
  geminiApiKey: string;
  notes: string;
}): Promise<TrendResearch | null> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return null;

  const queries = await deriveFitnessTrendQueries(
    input.geminiApiKey,
    input.notes,
  );
  return searchTavily(apiKey, queries);
}

/**
 * Turns raw gym/meal notes into 1–2 high-engagement fitness search queries.
 * Example: "incline bench 185" → "trending chest workout advice incline bench tips"
 */
async function deriveFitnessTrendQueries(
  geminiApiKey: string,
  notes: string,
): Promise<string[]> {
  const heuristic = heuristicFitnessQuery(notes);

  try {
    const ai = createGeminiClient(geminiApiKey);
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [
        "You convert an athlete's messy daily fitness notes into web search queries.",
        `Return ONLY a JSON array of ${MAX_QUERIES} short queries (strings).`,
        "Optimize for high-engagement fitness and nutrition content people are searching for RIGHT NOW.",
        'Example: notes mention "incline bench" → "trending chest workout advice tips incline bench growth".',
        "No hashtags. Keep each query under 12 words.",
        `Notes:\n${notes.slice(0, 2000)}`,
      ].join("\n\n"),
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse((response.text ?? "").trim()) as unknown;
    const queries = Array.isArray(parsed)
      ? parsed
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .map((q) => q.trim())
          .slice(0, MAX_QUERIES)
      : [];

    if (queries.length) return queries;
  } catch {
    // Fall through to heuristic — idea generation must not stall on query NLP.
  }

  return [heuristic];
}

function heuristicFitnessQuery(notes: string): string {
  const compact = notes.replace(/\s+/g, " ").trim().slice(0, 80);
  const lower = compact.toLowerCase();

  if (/incline|bench|chest|pec/.test(lower)) {
    return "trending chest workout advice tips incline bench growth";
  }
  if (/squat|deadlift|leg|glute|quad/.test(lower)) {
    return "trending leg day workout tips squat strength";
  }
  if (/meal|protein|calorie|diet|chicken|rice|macro/.test(lower)) {
    return "trending athlete nutrition meal tips high protein";
  }
  if (/sprint|cardio|conditioning|run/.test(lower)) {
    return "trending athlete conditioning cardio tips";
  }
  if (/baseball|pitch|bat|throw/.test(lower)) {
    return "trending youth baseball training tips strength";
  }

  return compact
    ? `trending fitness workout advice tips ${compact}`
    : "trending fitness workout advice tips 2026";
}

async function searchTavily(
  apiKey: string,
  queries: string[],
): Promise<TrendResearch> {
  const lines: string[] = [];
  const sources: TrendSource[] = [];
  const succeeded: string[] = [];
  const errors: string[] = [];

  for (const query of queries.slice(0, MAX_QUERIES)) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          topic: "general",
          search_depth: "basic",
          include_answer: true,
          max_results: MAX_RESULTS_PER_QUERY,
        }),
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        errors.push(
          `Tavily ${res.status} for "${query}"${detail ? `: ${detail.slice(0, 120)}` : ""}`,
        );
        continue;
      }

      const data = (await res.json()) as {
        results?: {
          title?: string;
          url?: string;
          content?: string;
          score?: number;
        }[];
        answer?: string;
      };

      succeeded.push(query);
      lines.push(`## Query: ${query}`);
      if (data.answer?.trim()) {
        lines.push(`- Trend summary: ${data.answer.trim()}`);
      }

      const ranked = [...(data.results ?? [])].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0),
      );
      for (const item of ranked) {
        if (!item.title) continue;
        const snippet = (item.content ?? "").replace(/\s+/g, " ").slice(0, 280);
        lines.push(
          snippet
            ? `- Article: ${item.title} — ${snippet}`
            : `- Article: ${item.title}`,
        );
        if (item.url) sources.push({ title: item.title, url: item.url });
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `Tavily network error for "${query}": ${error.message}`
          : `Tavily network error for "${query}"`,
      );
    }
  }

  if (!succeeded.length) {
    throw new Error(
      errors[0] || "Tavily returned no usable search results.",
    );
  }

  return {
    provider: "tavily",
    queries: succeeded,
    findings: lines.join("\n"),
    sources: dedupeSources(sources),
  };
}

async function searchSerper(
  apiKey: string,
  queries: string[],
): Promise<TrendResearch> {
  const lines: string[] = [];
  const sources: TrendSource[] = [];

  for (const query of queries.slice(0, MAX_QUERIES)) {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 6 }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Serper search failed (${res.status}) for "${query}".`);
    }

    const data = (await res.json()) as {
      organic?: { title?: string; link?: string; snippet?: string }[];
      peopleAlsoAsk?: { question?: string }[];
      relatedSearches?: { query?: string }[];
    };

    lines.push(`## Query: ${query}`);
    for (const item of data.organic ?? []) {
      if (!item.title) continue;
      lines.push(`- Article: ${item.title} — ${item.snippet ?? ""}`);
      if (item.link) sources.push({ title: item.title, url: item.link });
    }
    const questions = (data.peopleAlsoAsk ?? [])
      .map((p) => p.question)
      .filter(Boolean);
    if (questions.length) {
      lines.push(`- People also ask: ${questions.join(" | ")}`);
    }
    const related = (data.relatedSearches ?? [])
      .map((r) => r.query)
      .filter(Boolean);
    if (related.length) {
      lines.push(`- Related trending searches: ${related.join(" | ")}`);
    }
  }

  return {
    provider: "serper",
    queries,
    findings: lines.join("\n"),
    sources: dedupeSources(sources),
  };
}

async function searchWithGeminiGrounding(
  geminiApiKey: string,
  notes: string,
): Promise<TrendResearch> {
  const ai = createGeminiClient(geminiApiKey);
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [
      "Use Google Search to research what fitness/sports content is trending RIGHT NOW around the topics in these raw daily training notes.",
      "Report back, as plain text bullets:",
      "- The highest-engagement search queries and questions people are asking about these topics",
      "- Recent trending articles/angles (with what makes each one resonate)",
      "- Any seasonal or news hooks worth riding this week",
      `Raw notes:\n${notes.slice(0, 2000)}`,
    ].join("\n\n"),
    config: { tools: [{ googleSearch: {} }] },
  });

  const findings = (response.text ?? "").trim();
  if (!findings) {
    throw new Error("Gemini search grounding returned no research text.");
  }

  const grounding = response.candidates?.[0]?.groundingMetadata;
  const queries = (grounding?.webSearchQueries ?? []).slice(0, 6);
  const sources = dedupeSources(
    (grounding?.groundingChunks ?? [])
      .map((chunk) => ({
        title: chunk.web?.title ?? chunk.web?.uri ?? "",
        url: chunk.web?.uri ?? "",
      }))
      .filter((s) => s.url),
  );

  return { provider: "gemini-search", queries, findings, sources };
}

function dedupeSources(sources: TrendSource[]): TrendSource[] {
  const seen = new Set<string>();
  const out: TrendSource[] = [];
  for (const source of sources) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    out.push(source);
    if (out.length >= 12) break;
  }
  return out;
}
