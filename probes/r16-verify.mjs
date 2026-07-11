// R16 behavioral verification — Codex round-14 fixes.
// (1) ⌘K never opens the palette under the shortcut sheet
// (2) edited send: receipt records the FINAL sent body, not pre-edit text
// (3) done→done and snoozed→snoozed no-op at the store (no dup audit,
//     no R15 composer clear on a no-op)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

console.log("[1] ⌘K gated behind the shortcut sheet");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  await page.keyboard.press("?"); // open the hotkeys-OFF modal
  await page.waitForTimeout(250);
  const sheetVisible = () =>
    page.getByText(/keyboard shortcuts/i).first().isVisible().catch(() => false);
  ok("shortcut sheet open", await sheetVisible());
  await page.keyboard.press("Meta+k"); // must NOT open the palette underneath
  await page.waitForTimeout(250);
  ok("palette did not open under the sheet",
    !(await page.locator("[cmdk-root]").isVisible().catch(() => false)));
  await page.keyboard.press("Escape"); // one press closes the VISIBLE layer
  await page.waitForTimeout(250);
  ok("Esc closed the sheet (not a hidden palette)", !(await sheetVisible()));
  // Control: ⌘K works again once the sheet is gone.
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  ok("⌘K works after the sheet closes",
    await page.locator("[cmdk-root]").isVisible().catch(() => false));
  await page.close();
}

console.log("[2] edited send receipt = final sent body");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const panel = page.locator('[aria-label="Hermes draft panel"]');
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // v1 handed…
  await page.waitForTimeout(200);
  await page.keyboard.press("a"); // added_to_chat
  await page.waitForTimeout(300);
  await composer.click();
  await page.keyboard.type(" — plus my own closing line."); // …then EDITED
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500);
  // The receipt must be a NEW version holding the final body (v2/2),
  // not the pre-edit v1 labeled Sent.
  const stepper = await panel.getByText(/v\d+\/\d+/).first().innerText().catch(() => "none");
  ok("receipt is the appended final version (v2/2)", stepper === "v2/2", `(stepper="${stepper}")`);
  ok("receipt card shows the edited closing line",
    await panel.getByText(/plus my own closing line/i).first().isVisible().catch(() => false));
  // (the "edited" note lives on the version's instructions field — the
  // card renders text only, so the stepper + body assertions above are the
  // observable truth)
  await page.close();
}

console.log("[3] triage no-op guards at the store");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  // Walk to a DONE row (fixtures include done threads in All).
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  // find a row with a "done" chip? drive by state: use a needs_reply row and
  // mark it done first, staying in All (row + selection hold).
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 20) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(50); }
  await page.getByRole("button", { name: "Mark done · e" }).click(); // done #1 (real)
  await page.waitForTimeout(400);
  // Type into the composer of the now-done thread, then press e (done→done).
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.keyboard.type("typing on a done thread");
  await page.keyboard.press("Escape");
  await page.keyboard.press("e"); // pre-fix: dup audit + composer wiped
  await page.waitForTimeout(300);
  ok("done→done no-ops (composer survives)",
    (await composer.inputValue()) === "typing on a done thread",
    `(got "${await composer.inputValue()}")`);
  // Snoozed→snoozed: snooze a fresh row, then press s again in All.
  await page.keyboard.press("j"); // another row
  const who = await selectedTitle();
  await page.keyboard.press("s"); // snooze #1 (row stays in All, chip shows)
  await page.waitForTimeout(400);
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.keyboard.type("survives re-snooze");
  await page.keyboard.press("Escape");
  await page.keyboard.press("s"); // pre-fix: dup audit + R15 clear
  await page.waitForTimeout(300);
  ok("snoozed→snoozed no-ops (composer survives)",
    (await composer.inputValue()) === "survives re-snooze",
    `(who="${who}", got "${await composer.inputValue()}")`);
  await page.close();
}

console.log(`\nR16 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
