// R18 behavioral verification — Codex round-16 fix.
// The supersede decision fires at ACTION time: a mark-done in the last
// ~150ms before the mock angles timer must prevent the timer from landing
// angles for the superseded request (pre-fix: token still valid inside the
// EXIT_MS-delayed commit window → bogus angles + audit, momentary stale UI).
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL);
await page.getByText("Synced", { exact: true }).waitFor();
await page.waitForTimeout(150);

const selectedTitle = async () =>
  (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
const cta = () =>
  page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
let hops = 0;
while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
ok("found CTA thread", await cta());
const who = await selectedTitle();

console.log("[1] supersede inside the exit window");
// d at t0; header-Done at ~t0+520 (row exits Important → commit ~t0+670);
// the mock timer fires at t0+620 — INSIDE (action, commit).
const t0 = Date.now();
await page.keyboard.press("d");
await page.waitForTimeout(470);
await page.getByRole("button", { name: "Mark done · e" }).click();
const actionAt = Date.now() - t0;
await page.waitForTimeout(Math.max(0, 640 - (Date.now() - t0)));
// Just after the timer's firing moment, before/around the commit: the
// superseded request must NOT have produced angle cards.
const anglesMid = await page.locator("kbd:has-text('1')").first().isVisible().catch(() => false);
const sampleAt = Date.now() - t0;
ok("timer inside the window produced NO angles for the superseded request",
  !anglesMid, `(action@${actionAt}ms, sample@${sampleAt}ms)`);
ok("race window was actually exercised (action before 620ms)", actionAt < 620 && actionAt > 300,
  `(action@${actionAt}ms — rerun if outside (300,620))`);

console.log("[2] settled end state is clean and exact");
await page.waitForTimeout(600); // everything settles
ok("no spinner anywhere (markers settled exactly)",
  !(await page.getByText("Hermes is drafting…").isVisible().catch(() => false)));
// Follow the thread into All: clean not_started — no resurrected state.
await page.keyboard.press("g"); await page.keyboard.press("a");
await page.waitForTimeout(200);
let found = false;
for (let i = 0; i < 60; i++) {
  if ((await selectedTitle()) === who) { found = true; break; }
  await page.keyboard.press("j");
  await page.waitForTimeout(30);
}
ok("found the done thread in All", found, `(who="${who}")`);
ok("no stale angles or card on the done thread",
  !(await page.locator("kbd:has-text('1')").first().isVisible().catch(() => false)) &&
  !(await page.getByText(/v\d+\/\d+/).first().isVisible().catch(() => false)) &&
  !(await page.getByText("Hermes is drafting…").isVisible().catch(() => false)));

console.log(`\nR18 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
