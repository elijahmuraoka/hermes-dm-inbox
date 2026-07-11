// R8 behavioral verification — Codex round-6 fixes.
// (1) addToChat rejected mid-iterate (stale-version protection) + palette mirror
// (2) supersede settles markers + tokens: no lying spinner, no stale timer
//     completing a LATER request (done-then-re-request race)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

const focusWait = async (page, label) => {
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(
      (l) => document.activeElement?.getAttribute("aria-label") === l, label)) return true;
    await page.waitForTimeout(50);
  }
  return false;
};

// ---------- [1] addToChat mid-iterate is rejected ----------
console.log("[1] add-to-chat during in-flight iterate");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 12) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // generated v1
  await page.waitForTimeout(200);
  // Iterate window 1: e must NOT copy the stale v1 into the composer.
  await page.keyboard.press("r");
  ok("studio input focused", await focusWait(page, "Refine the draft"));
  await page.keyboard.type("make it shorter");
  await page.keyboard.press("Enter"); // iterate starts (520ms)
  await page.keyboard.press("Escape"); // blur — back to hotkey scope
  await page.keyboard.press("a"); // pre-fix: composer = stale v1
  await page.waitForTimeout(120);
  ok("composer stays empty mid-iterate (stale add rejected)",
    (await composer.inputValue()) === "", `(got "${(await composer.inputValue()).slice(0, 30)}")`);
  await page.waitForTimeout(700); // v2 lands, marker settles
  await page.keyboard.press("a"); // now legitimate
  await page.waitForTimeout(200);
  const refined = await composer.inputValue();
  ok("post-iterate e adds the REFINED version", refined.length > 0);

  // Iterate window 2: the palette item is disabled during the in-flight op.
  await page.keyboard.press("r");
  await focusWait(page, "Refine the draft");
  await page.keyboard.type("warmer tone");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(200);
  ok("palette add-to-chat disabled mid-iterate",
    await page.locator('[cmdk-item][data-disabled="true"]', { hasText: /add draft to chat/i })
      .first().isVisible().catch(() => false));
  await page.keyboard.press("Escape");
  await page.close();
}

// ---------- [2] done-then-re-request race + lying spinner ----------
console.log("[2] supersede settles markers and kills stale timers");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  // All view: marking done keeps the row AND the selection — the whole race
  // runs on one thread with the panel visible throughout.
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 20) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(50); }
  ok("found CTA thread in All", await cta());
  const drafting = () => page.getByText("Hermes is drafting…").isVisible().catch(() => false);
  const angles = () => page.locator("kbd:has-text('1')").first().isVisible().catch(() => false);
  await page.keyboard.press("d"); // T1 (620ms)
  await page.waitForTimeout(120);
  ok("T1 spinner up", await drafting());
  // `e` is M3-guarded during "requested" (a key-slip must not archive
  // in-flight work) — the race path is the thread header's Done button,
  // which calls markDone without a draft-status guard.
  await page.getByRole("button", { name: "Mark done · e" }).click();
  await page.waitForTimeout(200); // well inside T1's window (t≈350ms)
  ok("spinner settles WITH the cancel (no lying spinner on a done thread)",
    !(await drafting()));
  ok("draft reset to clean CTA", await cta());
  await page.keyboard.press("d"); // T2 — the NEW request (t≈350ms; T1 fires ≈620ms)
  await page.waitForTimeout(120);
  ok("T2 spinner up", await drafting());
  await page.waitForTimeout(280); // t≈750ms — past T1's firing moment
  ok("stale T1 did NOT complete the new request (still drafting, no angles)",
    (await drafting()) && !(await angles()));
  await page.waitForTimeout(400); // t≈1150ms ≈ T2+800ms — T2's own completion
  ok("T2 completes on its own schedule", (await angles()) && !(await drafting()));
  await page.close();
}

console.log(`\nR8 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
