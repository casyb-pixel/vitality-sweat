import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Name and email are required." },
      { status: 400 },
    );
  }

  const row = {
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    business:
      typeof body.business === "string" ? body.business.trim().slice(0, 160) : null,
    package_id:
      typeof body.package_id === "string" ? body.package_id.trim().slice(0, 80) : null,
    market: typeof body.market === "string" ? body.market.trim().slice(0, 80) : null,
    message:
      typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null,
  };

  const supabase = createServiceRoleClient() ?? (await createClient());
  const { error } = await supabase.from("sponsor_inquiries").insert(row);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
