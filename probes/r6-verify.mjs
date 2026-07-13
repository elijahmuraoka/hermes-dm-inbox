// R6 behavioral verification — Codex round-4 fixes.
// (1) flipRouting exit/advance flow  (2) mobile no-op filter keeps thread pane
// (3) same-view chord preserves exitingIds  (+sweep: send predicts draft flip)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

const browser = await chromium.launch();

// ---------- [1] flipRouting routes through exit/advance ----------
console.log("[1] flipRouting exit + selection advance");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const who = await selectedTitle(); // row 0 of Important
  // Send a closer → thread lands in Sent, strip suggests done.
  await page.keyboard.press("c");
  await page.waitForTimeout(250);
  await page.keyboard.type("Sounds good — thanks again!");
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500); // exit from Important + commit
  ok("strip suggests done after closer", await page.getByText(/reads like a wrap-up/i).isVisible());
  // Into Sent (done hidden): walk selection onto the just-sent thread.
  await page.keyboard.press("g"); await page.keyboard.press("s");
  await page.waitForTimeout(200);
  let idx = -1, titles = [];
  for (let i = 0; i < 40; i++) {
    const t = await selectedTitle();
    if (!titles.length || titles[titles.length - 1] !== t) titles.push(t);
    if (t === who) { idx = titles.length - 1; break; }
    await page.keyboard.press("j");
    await page.waitForTimeout(40);
  }
  ok("found sent thread mid-list (idx>0)", idx > 0, `(idx=${idx}, who="${who}")`);
  // Flip to done from Sent with done hidden → row leaves the view.
  await page.getByRole("button", { name: "Mark done", exact: true }).click();
  await page.waitForTimeout(100); // inside EXIT_MS: row should be animating out
  // The exit class rides the row's WRAPPER div, not the inner button.
  const exitingNow = await page
    .locator(`button:has-text("${who}")`).first()
    .evaluate((el) => !!el.closest("div")?.className.includes("animate-row-exit"))
    .catch(() => true); // already unmounted also proves the flow ran
  ok("row plays exit animation on flip", exitingNow);
  await page.waitForTimeout(450);
  const after = await selectedTitle();
  ok("selection advances to neighbor slot, not row 0", after !== who && after !== titles[0],
    `(after="${after}", row0="${titles[0]}")`);
  // j/k don't yank: next j moves to the row after the neighbor, still mid-list.
  await page.keyboard.press("j");
  ok("j continues from the slot", (await selectedTitle()) !== titles[0]);
  // Reopen direction: All view keeps the row visible → instant flip, no move.
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  let found = false;
  for (let i = 0; i < 60; i++) {
    if ((await selectedTitle()) === who) { found = true; break; }
    await page.keyboard.press("j");
    await page.waitForTimeout(30);
  }
  ok("found done thread in All", found);
  ok("strip offers Reopen", await page.getByRole("button", { name: "Reopen", exact: true }).isVisible());
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await page.waitForTimeout(300);
  ok("reopen keeps selection (row stays in All)", (await selectedTitle()) === who);
  // routedAfterSend === "done" persists, so the strip re-offers the wrap-up
  // suggestion (correct: Hermes still thinks this closer is done-able).
  ok("strip re-offers done after reopen",
    await page.getByText(/reads like a wrap-up/i).isVisible() &&
    await page.getByRole("button", { name: "Mark done", exact: true }).isVisible());
  await page.close();
}

// ---------- [2] mobile: no-op filter keeps the thread pane ----------
console.log("[2] mobile no-op filter preserves reading position");
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  // Open a thread (tap the first row).
  await page.locator('[aria-current="true"]').last().click().catch(() => {});
  // If nothing selected on mobile, tap the first list row by role.
  if (!(await composer.isVisible().catch(() => false))) {
    await page.locator("button:has(time), button").filter({ hasText: /./ }).first().click();
  }
  await composer.waitFor({ timeout: 3000 });
  ok("thread pane open (composer visible)", await composer.isVisible());
  // Hamburger → drawer → tap the ALREADY-ACTIVE "All sources".
  await page.getByRole("button", { name: "Open views and sources" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /all sources/i }).click();
  await page.waitForTimeout(300);
  ok("drawer closed after no-op tap",
    !(await page.getByRole("button", { name: /imessage/i }).first().isVisible().catch(() => false)));
  ok("STILL in thread pane after no-op filter", await composer.isVisible(),
    "(no-op must not cost the reading position)");
  // Control: a REAL filter change returns to the list.
  await page.getByRole("button", { name: "Open views and sources" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /imessage/i }).first().click();
  await page.waitForTimeout(300);
  ok("real filter change returns to list", !(await composer.isVisible().catch(() => false)));
  await page.close();
}

// ---------- [3] same-view chord preserves exitingIds ----------
console.log("[3] g-chord to current view mid-exit");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  // Find a row whose panel shows the initial CTA (no draft — `e` archives).
  const cta = () =>
    page.getByRole("button", { name: /draft (reply|follow-up)/i }).isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 12) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  const doomed = await selectedTitle();
  // e (exit starts) then IMMEDIATELY g i — inside the 150ms window.
  await page.keyboard.press("e");
  await page.keyboard.press("g");
  await page.keyboard.press("i");
  await page.waitForTimeout(70); // let React paint the exit frame (~150ms window)
  // Mid-window: the row must still be exiting (or already gone) — never
  // flashed back to a normal render by a cleared exitingIds. The class
  // rides the row's wrapper div.
  const state = await page
    .locator(`button:has-text("${doomed}")`).first()
    .evaluate((el) =>
      el.closest("div")?.className.includes("animate-row-exit") ? "exiting" : "normal",
    )
    .catch(() => "gone");
  ok("mid-exit row not flashed back by same-view chord", state !== "normal", `(state=${state})`);
  await page.waitForTimeout(450);
  const rowGone = !(await page.locator(`button:has-text("${doomed}")`).first().isVisible().catch(() => false));
  ok("row committed out after the window", rowGone, `(doomed="${doomed}")`);
  await page.close();
}

console.log(`\nR6 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
