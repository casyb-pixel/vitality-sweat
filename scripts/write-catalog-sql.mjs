import { extraCatalogSeed } from "../src/lib/fitness/catalog-seed.ts";
import { writeFileSync } from "node:fs";

const rows = extraCatalogSeed();
const values = rows
  .map((r) => {
    const aliases = r.aliases.length
      ? `array[${r.aliases.map((a) => `'${a.replace(/'/g, "''")}'`).join(",")}]`
      : "array[]::text[]";
    const slug = r.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `  ('${r.name.replace(/'/g, "''")}', '${r.category}', '${r.primary_muscle}', '${r.equipment}', '${r.tracking_type}', ${aliases}, '${slug}')`;
  })
  .join(",\n");

const sql = `-- Expanded shared catalog toward 400+ movements.
insert into public.exercises (name, category, primary_muscle, equipment, tracking_type, aliases, slug)
values
${values}
on conflict do nothing;

update public.exercises
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where created_by is null and (slug is null or slug = '');
`;

writeFileSync(
  "supabase/migrations/20260813121000_exercise_catalog_expansion.sql",
  sql,
);
console.log(`Wrote ${rows.length} exercises`);
