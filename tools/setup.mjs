// npm run setup: copies card.example.json and wrangler.example.jsonc to the files you edit,
// without overwriting ones that already exist.
import fs from "node:fs";

for (const [from, to] of [
  ["card.example.json", "card.json"],
  ["wrangler.example.jsonc", "wrangler.jsonc"],
]) {
  if (fs.existsSync(to)) {
    console.log(`${to} exists, left as it is`);
  } else {
    fs.copyFileSync(from, to);
    console.log(`${to} created from ${from}`);
  }
}
