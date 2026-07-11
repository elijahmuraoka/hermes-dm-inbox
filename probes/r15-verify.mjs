// R15 behavioral verification — Codex round-13 fixes.
// (1) triage on the SELECTED thread reconciles composer/handoff even when the
//     row stays visible — but never for a different row (scoping control)
// (2) palette-over-sheet Reply closes the sheet, focus lands in the composer
// (3) message bodies preserve newlines and contain long tokens (one lens)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

console.log("[1] reconcile-on-stay (All view) + different-row scoping");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const panel = page.locator('[aria-label="Hermes draft panel"]');
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  // Build a live handoff on a CTA thread.
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 20) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(50); }
  ok("found CTA thread in All", await cta());
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1");
  await page.waitForTimeout(200);
  await page.keyboard.press("a"); // handoff: added_to_chat, composer prefilled
  await page.waitForTimeout(300);
  ok("handoff live (composer prefilled)", (await composer.inputValue()).length > 0);
  // Mark done via the header button — in All the row STAYS and selection holds.
  await page.getByRole("button", { name: "Mark done · e" }).click();
  await page.waitForTimeout(400);
  ok("composer cleared though the row stayed", (await composer.inputValue()) === "");
  ok("handoff discarded (no 'In composer' lifecycle)",
    !(await panel.getByText(/in composer|edited in composer/i).first().isVisible().catch(() => false)));

  // SCOPING control: type into the selected thread, hover-Done a DIFFERENT row.
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.keyboard.type("half-typed reply that must survive");
  await page.keyboard.press("Escape");
  const rows = page.locator("button.h-10.w-full");
  const otherName = (await rows.nth(5).innerText()).split("\n")[0];
  await rows.nth(5).hover();
  // FYI rows label the same action "Acknowledge" — accept either verb.
  await page.getByRole("button", { name: new RegExp(`(Mark done|Acknowledge) — ${otherName}`) }).click();
  await page.waitForTimeout(400);
  ok("different-row Done never clears the composer you're typing in",
    (await composer.inputValue()) === "half-typed reply that must survive",
    `(got "${await composer.inputValue()}")`);
  await page.close();
}

console.log("[2] palette-over-sheet Reply clears the way");
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const sheet = page.locator('[role="dialog"][aria-label="Hermes draft"]');
  await page.locator("button.h-10.w-full").nth(1).click();
  await page.locator('textarea[aria-label="Message composer"]').waitFor();
  await page.keyboard.press("d");
  await sheet.waitFor({ timeout: 2000 });
  await page.keyboard.press("/"); // palette over the sheet (R7 matrix)
  await page.waitForTimeout(250);
  await page.keyboard.type("focus composer");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(450);
  ok("sheet closed by Reply", !(await sheet.isVisible().catch(() => false)));
  const a = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  ok("focus landed IN the composer (not behind a modal)", a === "Message composer",
    `(active=${a})`);
  await page.close();
}

console.log("[3] content wrap lens — newlines preserved, long tokens contained");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  const token = "https://example.com/" + "x".repeat(90);
  await page.keyboard.type("line one");
  await page.keyboard.press("Enter"); // newline inside the textarea
  await page.keyboard.type(token);
  await composer.click();
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500);
  const bubble = page.locator("p.content-text", { hasText: "line one" }).first();
  ok("bubble rendered", await bubble.isVisible().catch(() => false));
  const metrics = await bubble.evaluate((el) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const parentBox = el.closest("div")?.parentElement?.getBoundingClientRect();
    return {
      ws: cs.whiteSpace,
      ow: cs.overflowWrap,
      lines: Math.round(box.height / parseFloat(cs.lineHeight)),
      overflow: el.scrollWidth > el.clientWidth + 1,
      withinParent: !parentBox || box.width <= parentBox.width + 1,
    };
  });
  ok("newline preserved (pre-wrap, 3+ line boxes)", metrics.ws === "pre-wrap" && metrics.lines >= 3,
    `(ws=${metrics.ws}, lines=${metrics.lines})`);
  ok("long token contained (anywhere, no overflow)",
    metrics.ow === "anywhere" && !metrics.overflow && metrics.withinParent,
    `(ow=${metrics.ow}, overflow=${metrics.overflow})`);
  await page.close();
}

console.log(`\nR15 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
