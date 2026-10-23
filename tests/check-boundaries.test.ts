import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint({ cache: false });

test("private experiments and research are outside the production lint boundary", async () => {
  for (const path of [
    ".local/visual-lab/src/example.ts",
    ".local/projects-research/radial-menu-js/js/RadialMenu.js",
    ".local/release-evidence/example.mjs",
  ]) {
    assert.equal(await eslint.isPathIgnored(path), true, path);
  }
});

test("production source, scripts, tests and config remain covered", async () => {
  for (const path of [
    "src/components/views/GroupView.astro",
    "src/utils/datetime.ts",
    "scripts/build-search.mjs",
    "tests/datetime.test.ts",
    "astro.config.ts",
  ]) {
    assert.equal(await eslint.isPathIgnored(path), false, path);
  }
});

test("real production rule violations still fail instead of being hidden", async () => {
  const [result] = await eslint.lintText(
    "const unusedReleaseProbe = 1;\nmissingReleaseFunction();\n",
    { filePath: "src/release-boundary-probe.ts" },
  );
  assert.ok(result.errorCount > 0);
  assert.ok(
    result.messages.some(
      (message) => message.ruleId === "@typescript-eslint/no-unused-vars",
    ),
  );
  const [javascript] = await eslint.lintText("missingReleaseFunction();\n", {
    filePath: "scripts/release-boundary-probe.mjs",
  });
  assert.ok(
    javascript.messages.some((message) => message.ruleId === "no-undef"),
  );
});
