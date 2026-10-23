import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, getYear } from "../src/utils/datetime.ts";

test("content dates and year groups do not drift with the build machine timezone", () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Shanghai"]) {
      process.env.TZ = timezone;
      assert.equal(formatDate("2026-01-01"), "2026年1月1日");
      assert.equal(formatDate(new Date("2026-07-25")), "2026年7月25日");
      assert.equal(getYear("2026-01-01"), 2026);
    }
    process.env.TZ = "America/Los_Angeles";
    assert.equal(formatDate("2026-01-01", true, false), "2025年12月31日");
    assert.throws(() => formatDate("invalid"), /Invalid Date/);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
