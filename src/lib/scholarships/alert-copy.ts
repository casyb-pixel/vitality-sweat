import { stripEmDashes } from "@/lib/text/humanize-copy";

export type AlertItem = {
  name: string;
  deadline: string;
  url: string | null;
  days: number;
};

export function buildScholarshipAlert(items: AlertItem[]): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = stripEmDashes(
    items.length === 1
      ? `Scholarship deadline in ${items[0].days} days: ${items[0].name}`
      : `${items.length} scholarship deadlines need an application`,
  );
  const lines = items.map((item) => {
    const when = item.days < 0 ? "overdue" : `${item.days} days left`;
    const link = item.url ? ` ${item.url}` : "";
    return `${item.name} (${item.deadline}, ${when}).${link}`;
  });
  const text = stripEmDashes(
    [
      "These scholarships are not marked applied.",
      "",
      ...lines,
      "",
      "Open the private list: https://vitalitysweat.com/app/scholarships",
    ].join("\n"),
  );
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#404040;max-width:560px">
      <p>These scholarships are not marked applied.</p>
      <ul>
        ${items
          .map((item) => {
            const when = item.days < 0 ? "overdue" : `${item.days} days left`;
            const link = item.url
              ? ` <a href="${item.url}">Application</a>`
              : "";
            return `<li>${escapeHtml(item.name)} (${escapeHtml(item.deadline)}, ${when}).${link}</li>`;
          })
          .join("")}
      </ul>
      <p><a href="https://vitalitysweat.com/app/scholarships">Open the private list</a></p>
    </div>`;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
