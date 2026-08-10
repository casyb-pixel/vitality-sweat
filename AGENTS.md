<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:copy-style -->
# Copy style: no em dashes

Never use em dashes (`—`) or en dashes (`–`) in product copy, AI prompts/outputs, emails, or social posts. They look AI-generated. Use commas, periods, colons, or a plain hyphen (`-`).

Helpers: `src/lib/text/humanize-copy.ts` (`NO_EM_DASH_RULE`, `stripEmDashes`, `stripEmDashesDeep`).
<!-- END:copy-style -->
