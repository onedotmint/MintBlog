import { glob, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Pagefind falls back to the whole site without body markers, and rejects a zero-page index.
const site = process.argv[2] ?? "dist";
await rm(join(site, "pagefind"), { recursive: true, force: true });
let searchable = false;
for await (const path of glob(join(site, "**/*.html"))) {
  if (
    /<article\b[^>]*\sdata-pagefind-body(?:[\s=>])/.test(
      await readFile(path, "utf8"),
    )
  ) {
    searchable = true;
    break;
  }
}
if (searchable) {
  const cli = fileURLToPath(
    new URL("runner/bin.cjs", import.meta.resolve("pagefind")),
  );
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--site",
      site,
      "--exclude-selectors",
      "pre",
      "--include-characters",
      "<>",
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Pagefind indexing failed");
  for await (const path of glob(join(site, "pagefind/*ui*"))) await rm(path);
} else {
  console.log(
    "Search: no eligible articles; no index emitted (no whole-site fallback).",
  );
}
