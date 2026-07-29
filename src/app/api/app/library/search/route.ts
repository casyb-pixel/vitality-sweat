import { NextResponse } from "next/server";
import { normalizeLibraryQuery } from "@/lib/library/search";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type SearchLogBody = {
  query?: string;
  resultCount?: number;
  matchedSlugs?: string[];
};

/**
 * Record a member Library topic search so creators can spot content gaps.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: SearchLogBody;
    try {
      body = (await request.json()) as SearchLogBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const queryRaw = (body.query ?? "").trim().slice(0, 160);
    const queryNormalized = normalizeLibraryQuery(queryRaw);
    if (queryNormalized.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Search query too short." },
        { status: 400 },
      );
    }

    const resultCount = Math.max(
      0,
      Math.min(500, Number(body.resultCount) || 0),
    );
    const matchedSlugs = Array.isArray(body.matchedSlugs)
      ? body.matchedSlugs
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim().slice(0, 160))
          .slice(0, 40)
      : [];

    const { error } = await supabase.from("library_search_events").insert({
      user_id: user.id,
      query_raw: queryRaw,
      query_normalized: queryNormalized,
      result_count: resultCount,
      matched_slugs: matchedSlugs,
    });

    if (error) {
      console.error("[library/search] insert failed:", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not save search." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[library/search]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
