// R5 behavioral verification — the four Codex round-3 fixes.
// Theme: no-op actions never cost user state; counts share the visibility lens.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// The rail's active view item ALSO carries aria-current="true"; the selected
// row is the LAST aria-current in DOM (nav renders before the list).
const selectedTitle = async () =>
  (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
const composer = page.locator('textarea[aria-label="Message composer"]');
const focusComposerAndType = async (text) => {
  await page.keyboard.press("c");
  for (let i = 0; i < 20; i++) {
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") === "Message composer",
    );
    if (focused) break;
    await page.waitForTimeout(50);
  }
  await page.keyboard.type(text);
  await page.keyboard.press("Escape"); // composer blurs itself, text stays
};
const fresh = async () => {
  await page.goto(URL);
  // MOCK_SYNC_MS=650 — rows exist only after the topbar reads "Synced";
  // keys pressed against the skeleton leak as hotkeys into loaded state.
  await page.getByText("Synced", { exact: true }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(150);
};

// ---------- Fix 2: same-view re-entry (g i in Important) ----------
console.log("[1] setView same-view no-op");
await fresh();
for (const k of ["j", "j", "j"]) await page.keyboard.press(k);
const beforeSel = await selectedTitle();
await focusComposerAndType("must survive the no-op");
await page.keyboard.press("g"); await page.keyboard.press("i");
await page.waitForTimeout(150);
ok("selection survives g i in Important", (await selectedTitle()) === beforeSel,
  `(was "${beforeSel}", now "${await selectedTitle()}")`);
ok("composer text survives g i", (await composer.inputValue()) === "must survive the no-op",
  `(now "${await composer.inputValue()}")`);
await page.keyboard.press("g"); await page.keyboard.press("s");
await page.waitForTimeout(150);
ok("real view change clears composer", (await composer.inputValue().catch(() => "")) === "");

// ---------- Fix 3: no-op filter patch (active "All sources" click) ----------
console.log("[2] applyFilters no-op patch");
await fresh();
for (const k of ["j", "j"]) await page.keyboard.press(k);
const beforeSel2 = await selectedTitle();
await focusComposerAndType("second survivor");
await page.getByRole("button", { name: /all sources/i }).click(); // already active
await page.waitForTimeout(150);
ok("selection survives active-source click", (await selectedTitle()) === beforeSel2,
  `(was "${beforeSel2}", now "${await selectedTitle()}")`);
ok("composer text survives active-source click", (await composer.inputValue()) === "second survivor",
  `(now "${await composer.inputValue()}")`);
await page.getByRole("button", { name: /imessage/i }).first().click(); // real change
await page.waitForTimeout(150);
ok("real filter change clears composer", (await composer.inputValue().catch(() => "")) === "");

// ---------- Fix 4: draftingIds per-thread pending set ----------
console.log("[3] draftingIds pending set");
await fresh();
const cta = () =>
  page.getByRole("button", { name: /draft (reply|follow-up)/i }).isVisible().catch(() => false);
let hops = 0;
while (!(await cta()) && hops < 12) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
ok("found a CTA row for A", await cta());
const titleA = await selectedTitle();
await page.keyboard.press("d"); // draft on A (timer: 620ms)
await page.keyboard.press("j"); // → B
if (await cta()) await page.keyboard.press("d"); // draft on B — overwrote A's marker pre-fix
await page.keyboard.press("k"); // ← back to A
ok("back on A", (await selectedTitle()) === titleA);
const spinnerOnA = await page.getByText("Hermes is drafting…").isVisible().catch(() => false);
ok("A still shows 'Hermes is drafting…' while B drafts", spinnerOnA);
await page.waitForTimeout(900); // both timers settle
const anglesOnA = await page.locator("kbd", { hasText: "1" }).first().isVisible().catch(() => false);
const spinnerGone = !(await page.getByText("Hermes is drafting…").isVisible().catch(() => false));
ok("A settles to angles, spinner gone", spinnerGone && anglesOnA, `(anglesVisible=${anglesOnA})`);

// ---------- Fix 1: snoozed done rows excluded from Show done (N) ----------
console.log("[4] sentDoneCount snooze lens");
// Clean fixtures hold ZERO "done, last word yours" rows (generated done items
// all end with THEIR message) — so construct one: `e` on a sent thread makes
// a done row whose last message is out, then snooze it and watch the count.
await fresh();
await page.keyboard.press("g"); await page.keyboard.press("s");
await page.waitForTimeout(200);
const doneBtn = page.getByRole("button", { name: /show done|hide done/i });
const countOf = async () => {
  const t = await doneBtn.innerText().catch(() => "");
  const m = t.match(/\((\d+)\)/);
  return m ? Number(m[1]) : 0; // button absent = honest 0
};
const baseline = await countOf(); // fixtures hold 1 curated sent-done row
const archived = await selectedTitle(); // reanchored to row 0 by the view switch
await page.keyboard.press("e"); // mark done — last word was yours → isSentDone
await page.waitForTimeout(400); // exit animation + commit
const before = await countOf();
ok("count rises after e on a sent row", before === baseline + 1,
  `(baseline=${baseline}, now=${before})`);
await doneBtn.click(); // reveal done rows
await page.waitForTimeout(150);
for (let i = 0; i < 60; i++) await page.keyboard.press("j"); // last row = done group
await page.waitForTimeout(100);
const target = await selectedTitle();
ok("walked to the constructed done row", target === archived,
  `(archived "${archived}", at "${target}")`);
await page.keyboard.press("s"); // snooze the selected done row
await page.waitForTimeout(500); // exit animation + commit
const after = await countOf();
ok("count drops when the done row is snoozed (no lying reveal)", after === before - 1,
  `(before=${before}, after=${after}, snoozed="${target}")`);

console.log(`\nR5 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
