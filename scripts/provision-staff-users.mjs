/**
 * One-shot: provision Hunter (creator) + Casy (admin) in Supabase Auth + profiles.
 * Run: node scripts/provision-staff-users.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY (or fetches via CLI) + NEXT_PUBLIC_SUPABASE_URL.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function ensureServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return;
  const raw = execSync(
    "npx supabase projects api-keys --project-ref gjlvqgkgwoqhbonlfkti -o json",
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const startArr = raw.indexOf("[");
  const startObj = raw.indexOf("{");
  const start =
    startArr >= 0 && (startObj < 0 || startArr < startObj) ? startArr : startObj;
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  if (start < 0 || end < 0) {
    throw new Error("Could not parse api-keys CLI output.");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1));
  const keys = Array.isArray(parsed) ? parsed : parsed.keys;
  const service = (keys ?? []).find(
    (k) => k.name === "service_role" || k.id === "service_role",
  );
  if (!service?.api_key) {
    throw new Error("Could not resolve service_role API key.");
  }
  process.env.SUPABASE_SERVICE_ROLE_KEY = service.api_key;
}

function tempPassword() {
  // Readable temp password: avoid ambiguous characters
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = randomBytes(16);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function upsertStaffUser(admin, {
  email,
  role,
  displayName,
  password,
  siteOrigin,
}) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;

  const existing = list.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId;
  let created = false;

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: {
        ...(existing.app_metadata ?? {}),
        role,
        provider: existing.app_metadata?.provider ?? "email",
        providers: existing.app_metadata?.providers ?? ["email"],
      },
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        full_name: displayName,
      },
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role, provider: "email", providers: ["email"] },
      user_metadata: { full_name: displayName },
    });
    if (error) throw error;
    userId = data.user.id;
    created = true;
  }

  // Keep public.profiles in sync (trigger covers inserts; update covers existing).
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      role,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const redirectTo = `${siteOrigin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
  if (linkError) throw linkError;

  return {
    email,
    role,
    displayName,
    userId,
    created,
    temporaryPassword: password,
    recoveryLink: linkData.properties?.action_link ?? null,
  };
}

async function main() {
  loadEnvLocal();
  ensureServiceRoleKey();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const siteOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://vitalitysweat.com"
  );

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const hunterPass = tempPassword();
  const casyPass = tempPassword();

  const hunter = await upsertStaffUser(admin, {
    email: "hunter@vitalitysweat.com",
    role: "creator",
    displayName: "Hunter Broussard",
    password: hunterPass,
    siteOrigin,
  });

  const casy = await upsertStaffUser(admin, {
    email: "casyb@vitalitysweat.com",
    role: "admin",
    displayName: "Casy Broussard",
    password: casyPass,
    siteOrigin,
  });

  console.log(JSON.stringify({ ok: true, siteOrigin, users: [hunter, casy] }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message ?? String(err) }));
  process.exit(1);
});
