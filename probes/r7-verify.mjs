// R7 behavioral verification — Codex round-5 fixes.
// (1) draft sheet key matrix (mobile)  (2) flipRouting cancels pending draft
// (3) discard-reconcile on selection change  (4) palette draft-reply guard
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

// ---------- [1] sheet is modal for keys (375) ----------
console.log("[1] draft sheet key matrix");
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const rowTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const who = await rowTitle();
  await page.locator('[aria-current="true"]').last().click(); // open thread
  await page.locator('textarea[aria-label="Message composer"]').waitFor();
  await page.keyboard.press("d"); // sheet opens, drafting
  await page.getByText("Hermes is drafting…").waitFor({ timeout: 2000 });
  // Swallowed keys behind the modal: j (retarget), s (snooze), p, g-chord.
  for (const k of ["j", "j", "s", "p", "g", "s"]) await page.keyboard.press(k);
  await page.waitForTimeout(700); // angles land (620ms)
  const anglesInSheet = await page.locator("kbd:has-text('1')").first().isVisible().catch(() => false);
  ok("angles landed in the sheet (same thread — j was swallowed)", anglesInSheet);
  await page.keyboard.press("2"); // live: angle pick
  await page.waitForTimeout(200);
  const cardShown = await page.getByRole("button", { name: /add to chat/i }).isVisible().catch(() => false);
  ok("angle pick (2) works inside the sheet", cardShown);
  await page.keyboard.press("a"); // live: add to chat (generated; R20 key — was e)
  await page.waitForTimeout(300);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  ok("a = add-to-chat closes sheet and prefills composer",
    (await composer.isVisible()) && (await composer.inputValue()).length > 0);
  // Back to the list: selection unchanged, thread neither snoozed nor archived.
  await page.keyboard.press("Escape"); // blur nothing / safety
  await page.keyboard.press("u");
  await page.waitForTimeout(300);
  ok("selection unchanged after swallowed keys", (await rowTitle()) === who,
    `(who="${who}", now="${await rowTitle()}")`);
  // The rail lives in the (unmounted) drawer on mobile — the list header
  // carries the view name.
  ok("view unchanged (g-chord swallowed)",
    await page.locator('h2:has-text("Important")').first().isVisible().catch(() => false));
  await page.close();
}

// ---------- [2] flipRouting done-direction cancels pending draft ----------
console.log("[2] flip to done cancels pending request");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  // Start from a thread with NO draft versions (CTA visible), so the
  // canceled request reverts to not_started → clean CTA (a thread with
  // fixture versions would correctly revert to its standing card instead).
  const ctaHere = () =>
    page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops2 = 0;
  while (!(await ctaHere()) && hops2 < 12) { await page.keyboard.press("j"); hops2++; await page.waitForTimeout(60); }
  const who = await selectedTitle();
  await page.keyboard.press("c");
  await page.waitForTimeout(250);
  await page.keyboard.type("Can you send over the numbers?");
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500); // send commits; strip: open-until-they-respond
  ok("strip shows open state after ask", await page.getByText(/open until they respond/i).isVisible());
  await page.keyboard.press("d"); // pending follow-up request (620ms timer)
  await page.getByText("Hermes is drafting…").waitFor({ timeout: 2000 });
  await page.getByRole("button", { name: "Mark done", exact: true }).click(); // flip during window
  await page.waitForTimeout(900); // timer fires after the flip — guard must drop angles
  // Find the thread in All: its draft must be back to the clean CTA (request
  // canceled — no angles on a done thread, no phantom spinner).
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  let found = false;
  for (let i = 0; i < 60; i++) {
    if ((await selectedTitle()) === who) { found = true; break; }
    await page.keyboard.press("j");
    await page.waitForTimeout(30);
  }
  ok("found flipped thread in All", found);
  ok("no stale angles or spinner on the done thread",
    !(await page.locator("kbd:has-text('1')").first().isVisible().catch(() => false)) &&
    !(await page.getByText("Hermes is drafting…").isVisible().catch(() => false)));
  // Sharpest discriminator: reopen — pre-fix the panel would show the stale
  // angle picker; post-fix the draft is clean not_started → fresh CTA.
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await page.waitForTimeout(300);
  ok("reopened panel shows clean CTA, not stale angles",
    (await page.getByRole("button", { name: /draft follow-up/i }).first().isVisible().catch(() => false)) &&
    !(await page.locator("kbd:has-text('1')").first().isVisible().catch(() => false)));
  await page.close();
}

// ---------- [3] discard-reconcile + [4] palette guard ----------
console.log("[3] handoff draft reconciles on selection change");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 12) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  await page.keyboard.press("d");
  await page.waitForTimeout(750); // angles
  await page.keyboard.press("1"); // generated card
  await page.waitForTimeout(200);
  await page.keyboard.press("a"); // added_to_chat, composer prefilled
  await page.waitForTimeout(250);
  const prefilled = await composer.inputValue();
  ok("add-to-chat prefilled composer", prefilled.length > 0);

  // [4] while the handoff is live, the palette's draft-reply item is disabled
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  const item = page.locator('[cmdk-item][data-disabled="true"]', { hasText: /draft reply with hermes/i });
  ok("palette draft-reply disabled during handoff",
    await item.first().isVisible().catch(() => false));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // Harden to the EDITED dead-end: diverge the composer, then leave + return.
  await composer.click();
  await page.keyboard.type(" — tweaked");
  await page.keyboard.press("Escape"); // blur (typing targets own Esc)
  await page.keyboard.press("j"); // leave: buffer discarded, status must revert
  await page.waitForTimeout(150);
  await page.keyboard.press("k"); // return
  await page.waitForTimeout(150);
  ok("composer empty on return (buffer discarded)", (await composer.inputValue()) === "");
  await page.keyboard.press("a"); // pre-fix: dead no-op; post-fix: add-to-chat again (R20 key)
  await page.waitForTimeout(250);
  const refill = await composer.inputValue();
  ok("a re-adds the standing card after return (status reverted)", refill.length > 0,
    `(refill="${refill.slice(0, 40)}")`);
  await page.close();
}

console.log(`\nR7 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
