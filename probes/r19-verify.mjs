// R19 behavioral verification — Codex round-17 fixes.
// (1) ⌘K with the shortcut sheet open: claimed (defaultPrevented), no palette
// (2) click → j/k → Enter opens the NEW selection (rove-blur)
// (3) tab-to-row + Enter still activates that row natively (a11y path)
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
const rows = page.locator("button.h-10.w-full");

console.log("[1] sheet-open ⌘K stays in-app");
// Late-added bubble listener sees the event AFTER the palette's handler.
await page.evaluate(() => {
  window.__kClaimed = null;
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      window.__kClaimed = e.defaultPrevented;
  });
});
await page.keyboard.press("?");
await page.waitForTimeout(250);
await page.keyboard.press("Meta+k");
await page.waitForTimeout(250);
ok("⌘K claimed by the app (defaultPrevented)", (await page.evaluate(() => window.__kClaimed)) === true);
ok("palette did not open", !(await page.locator("[cmdk-root]").isVisible().catch(() => false)));
ok("sheet still up", await page.locator('[aria-label="Keyboard shortcuts"]').isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

console.log("[2] click → j → Enter opens the NEW selection");
await rows.nth(1).click(); // DOM focus lands on row 1's button
await page.waitForTimeout(200);
const clicked = await selectedTitle();
await page.keyboard.press("j"); // store selection moves; stale row focus roved
await page.waitForTimeout(150);
const jTarget = await selectedTitle();
ok("j moved the selection", jTarget !== clicked, `(clicked="${clicked}", j="${jTarget}")`);
const focusRoved = await page.evaluate(
  () => !document.activeElement?.closest?.("[data-conv-row]"));
ok("stale row focus roved off by j", focusRoved);
await page.keyboard.press("Enter"); // must act on the STORE selection
await page.waitForTimeout(200);
ok("Enter kept the NEW selection (no yank back to the clicked row)",
  (await selectedTitle()) === jTarget, `(now="${await selectedTitle()}")`);
await page.keyboard.press("Enter"); // second Enter → composer (thread pane)
await page.waitForTimeout(300);
const a = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
ok("Enter mapping alive (composer focused)", a === "Message composer", `(active=${a})`);
await page.keyboard.press("Escape");

console.log("[3] tab-to-row + Enter still activates that row (a11y path)");
const fourthTitle = ((await rows.nth(4).innerText()) || "").split("\n")[0];
await rows.nth(4).evaluate((el) => el.focus()); // keyboard user arrived by Tab
await page.keyboard.press("Enter"); // native activation must win (R10)
await page.waitForTimeout(250);
ok("Enter activated the FOCUSED row", (await selectedTitle()) === fourthTitle,
  `(now="${await selectedTitle()}", focused="${fourthTitle}")`);

console.log(`\nR19 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
