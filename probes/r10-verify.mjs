// R10 behavioral verification — Codex round-8 fixes.
// (1) Enter defers to a focused interactive control (native activation)
// (2) advanceSelection falls back to the orphan slot on beforeIdx -1
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

// ---------- [1] Enter on a focused button ----------
console.log("[1] Enter activates the focused control");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  // Focus a real topbar button the way a keyboard user would land on it.
  await page.evaluate(() => {
    document.querySelector('[aria-label="Open command palette"]')?.focus();
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const paletteOpen = await page.locator("[cmdk-root]").isVisible().catch(() => false);
  ok("Enter on the ⌘K button opens the palette (native click)", paletteOpen);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // Control: the body-scope Enter mapping is unchanged.
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("j");
  await page.keyboard.press("Enter"); // open thread
  await page.keyboard.press("Enter"); // focus composer
  await page.waitForTimeout(300);
  const a = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  ok("body-scope Enter still opens thread → composer", a === "Message composer", `(active=${a})`);
  await page.close();
}

// ---------- [2] routing-strip done from a hidden thread → orphan slot ----------
console.log("[2] advanceSelection orphan fallback");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const listTitles = async () =>
    (await page.locator("button.h-10.w-full").allInnerTexts()).map((t) => t.split("\n")[0]);
  for (const k of ["j", "j", "j"]) await page.keyboard.press(k); // mid-list, idx 3
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.keyboard.type("Can you take a look when you get a chance?");
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(600); // row exits Important; orphanIdx = 3 recorded
  ok("strip open on the hidden thread", await page.getByText(/open until they respond/i).isVisible());
  const titles = await listTitles(); // list WITHOUT the sent thread
  ok("captured list state", titles.length > 4);
  await page.getByRole("button", { name: "Mark done", exact: true }).click(); // beforeIdx = -1
  await page.waitForTimeout(400);
  const now = await selectedTitle();
  ok("selection lands on the orphan slot, not row 0", now === titles[3] && now !== titles[0],
    `(now="${now}", slot="${titles[3]}", row0="${titles[0]}")`);
  await page.close();
}

console.log(`\nR10 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
