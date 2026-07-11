// R9 behavioral verification — Codex round-7 fixes.
// (1) palette-initiated send lands in list scope (like direct ⌘Enter)
// (2) drawer auto-closes crossing md; stale state never swallows desktop keys
// (3) sweep twins: palette Reply focuses composer; Shortcuts lands in dialog
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

const active = (page) =>
  page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    label: document.activeElement?.getAttribute("aria-label"),
  }));

// ---------- [1] palette send → list scope ----------
console.log("[1] palette-initiated send blurs to list scope");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.keyboard.type("Quick ping — did you see this?");
  // Open the palette FROM the composer: the trap's opener is the textarea.
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("send mess");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter"); // run Send message
  await page.waitForTimeout(400);
  ok("message sent (composer emptied)", (await composer.inputValue()) === "");
  const a = await active(page);
  ok("focus NOT restored into the emptied composer", a.label !== "Message composer",
    `(active=${JSON.stringify(a)})`);
  // Crisp scope proof: ? must open the shortcut sheet, not type into the composer.
  await page.keyboard.press("?");
  await page.waitForTimeout(250);
  ok("hotkeys live after palette send (? opens sheet)",
    await page.locator('[role="dialog"][aria-label*="hortcut"], [aria-modal="true"]:has-text("Shortcuts")').first().isVisible()
      .catch(() => false) || await page.getByText(/keyboard shortcuts/i).first().isVisible().catch(() => false));
  ok("? did not type into the composer", (await composer.inputValue()) === "");
  await page.keyboard.press("Escape");
  await page.close();
}

// ---------- [2] drawer vs breakpoint ----------
console.log("[2] drawer auto-close on crossing md");
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const drawer = page.locator('[role="dialog"][aria-label="Views and sources"]');
  await page.getByRole("button", { name: "Open views and sources" }).click();
  await drawer.waitFor({ timeout: 2000 });
  ok("drawer open below md", await drawer.isVisible());
  // Cross the breakpoint: the drawer must close (state, not just CSS).
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  ok("drawer closed after crossing md", !(await drawer.isVisible().catch(() => false)));
  // Keys must be live on desktop — pre-fix the stale flag swallowed j.
  const rowTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const before = await rowTitle();
  await page.keyboard.press("j");
  await page.waitForTimeout(150);
  ok("j moves selection at desktop (keys not swallowed)", (await rowTitle()) !== before,
    `(stuck on "${before}")`);
  // Re-narrow: the drawer must NOT re-pop uninvited.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  ok("drawer does not re-pop on re-narrow", !(await drawer.isVisible().catch(() => false)));
  await page.close();
}

// ---------- [3] sweep twins ----------
console.log("[3] palette focus twins match their hotkeys");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  // Reply: direct `c` focuses the composer — the palette route must too.
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("focus composer"); // unambiguous — "reply" also matches Draft-reply
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const a1 = await active(page);
  ok("palette Reply ends focused in the composer", a1.label === "Message composer",
    `(active=${JSON.stringify(a1)})`);
  await page.keyboard.press("Escape"); // blur composer
  // Shortcuts: focus must land INSIDE the sheet (restore must not steal it).
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("shortcuts");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const inDialog = await page.evaluate(() =>
    !!document.activeElement?.closest('[aria-modal="true"]'));
  ok("palette Shortcuts lands focus inside the sheet", inDialog);
  await page.close();
}

console.log(`\nR9 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
