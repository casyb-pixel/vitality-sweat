import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { LibrarySearchSignal } from "@/lib/library/signals";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export type { LibrarySearchSignal };

type EventRow = {
  query_normalized: string;
  query_raw: string;
  result_count: number;
  created_at: string;
};

/**
 * Aggregated member Library searches for Creator Studio content-gap alerts.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized — creator privileges required." },
        { status: 401 },
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - 45);

    const { data, error } = await supabase
      .from("library_search_events")
      .select("query_normalized, query_raw, result_count, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(800);

    if (error) {
      console.error("[creator/library-signals]", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not load search signals." },
        { status: 500 },
      );
    }

    const buckets = new Map<
      string,
      {
        searchCount: number;
        zeroResultCount: number;
        lastSearchedAt: string;
        sampleRaw: string;
      }
    >();

    for (const row of (data as EventRow[] | null) ?? []) {
      const key = row.query_normalized?.trim();
      if (!key) continue;
      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, {
          searchCount: 1,
          zeroResultCount: row.result_count === 0 ? 1 : 0,
          lastSearchedAt: row.created_at,
          sampleRaw: row.query_raw || key,
        });
      } else {
        existing.searchCount += 1;
        if (row.result_count === 0) existing.zeroResultCount += 1;
      }
    }

    const signals: LibrarySearchSignal[] = [...buckets.entries()]
      .map(([query, b]) => ({
        query,
        searchCount: b.searchCount,
        zeroResultCount: b.zeroResultCount,
        lastSearchedAt: b.lastSearchedAt,
        isGap: b.zeroResultCount > 0 && b.zeroResultCount >= b.searchCount / 2,
        sampleRaw: b.sampleRaw,
      }))
      .filter((s) => s.isGap || s.searchCount >= 2)
      .sort((a, b) => {
        if (a.isGap !== b.isGap) return a.isGap ? -1 : 1;
        return b.searchCount - a.searchCount;
      })
      .slice(0, 24);

    return NextResponse.json({ ok: true, signals });
  } catch (err) {
    console.error("[creator/library-signals]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
