const fs = require("fs");
const p =
  "C:/Users/CasyB/.cursor/projects/c-Vitality-Engine-APP/agent-transcripts/c682863f-b1a1-4a14-9b31-9e30187f7ea7/c682863f-b1a1-4a14-9b31-9e30187f7ea7.jsonl";
const lines = fs.readFileSync(p, "utf8").trim().split("\n");
for (let i = lines.length - 1; i >= 0; i--) {
  const row = JSON.parse(lines[i]);
  const parts = row?.message?.content;
  if (!Array.isArray(parts)) continue;
  const text = parts.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  if (text.includes("Verdict") || text.includes("ranked")) {
    fs.writeFileSync("C:/Vitality_Engine_APP/tmp-audit-out.md", text);
    console.log("line", i, "chars", text.length);
    break;
  }
}
