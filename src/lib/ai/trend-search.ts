import { createGeminiClient, getGeminiModel } from "@/lib/ai/gemini";

export type TrendSource = {
  title: string;
  url: string;
};

export type TrendResearch = {
  provider: "serper" | "tavily" | "gemini-search";
  queries: string[];
  /** Condensed plain-text digest of trending queries, questions, and articles. */
  findings: string;
  sources: TrendSource[];
};

const SEARCH_TIMEOUT_MS = 20_000;
const MAX_QUERIES = 3;

/**
 * Researches current, high-engagement search trends around Hunter's daily notes.
 * Provider chain: SERPER_API_KEY → TAVILY_API_KEY → Gemini Google Search grounding
 * (the last one needs no extra key beyond GEMINI_API_KEY).
 */
export async function runTrendResearch(input: {
  geminiApiKey: string;
  notes: string;
}): Promise<TrendResearch> {
  const serperKey = process.env.SERPER_API_KEY?.trim();
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();

  if (serperKey || tavilyKey) {
    const queries = await deriveSearchQueries(input.geminiApiKey, input.notes);
    return serperKey
      ? searchSerper(serperKey, queries)
      : searchTavily(tavilyKey as string, queries);
  }

  return searchWithGeminiGrounding(input.geminiApiKey, input.notes);
}

/**
 * Turns raw workout/meal/practice notes into 2–3 Google-style queries aimed
 * at what people are actively searching for around those topics.
 */
async function deriveSearchQueries(
  geminiApiKey: string,
  notes: string,
): Promise<string[]> {
  const fallback = [notes.replace(/\s+/g, " ").slice(0, 90)];
  try {
    const ai = createGeminiClient(geminiApiKey);
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [
        "You convert an athlete's raw daily fitness notes into Google search queries.",
        `Return ONLY a JSON array of ${MAX_QUERIES} short search queries (strings).`,
        "Target what fitness readers are actively searching for RIGHT NOW around these topics — trending exercises, questions, and content angles. No hashtags.",
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
    return queries.length ? queries : fallback;
  } catch {
    return fallback;
  }
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

async function searchTavily(
  apiKey: string,
  queries: string[],
): Promise<TrendResearch> {
  const lines: string[] = [];
  const sources: TrendSource[] = [];

  for (const query of queries.slice(0, MAX_QUERIES)) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, max_results: 6, search_depth: "basic" }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Tavily search failed (${res.status}) for "${query}".`);
    }

    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
      answer?: string;
    };

    lines.push(`## Query: ${query}`);
    if (data.answer) lines.push(`- Summary: ${data.answer}`);
    for (const item of data.results ?? []) {
      if (!item.title) continue;
      lines.push(`- Article: ${item.title} — ${(item.content ?? "").slice(0, 240)}`);
      if (item.url) sources.push({ title: item.title, url: item.url });
    }
  }

  return {
    provider: "tavily",
    queries,
    findings: lines.join("\n"),
    sources: dedupeSources(sources),
  };
}

/**
 * No dedicated search key configured — use Gemini's built-in Google Search
 * grounding tool as the web search mechanism.
 */
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
