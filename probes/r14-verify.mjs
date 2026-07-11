// R14 behavioral verification — Codex round-12 fixes (send attribution).
// (1) manual send over an unused draft: no Hermes-as-Sent misattribution
// (2) stepper after add-to-chat: receipt pins the HANDED version
// (3) done last-outgoing rows are followup-shaped (CTA + angle labels)
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

const huntCta = async (page) => {
  const cta = () =>
    page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  return cta();
};

console.log("[1] manual send over an unused generated draft");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  ok("found CTA thread", await huntCta(page));
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // generated v1 — NEVER added to chat
  await page.waitForTimeout(200);
  await page.keyboard.press("c"); // user types their OWN words
  await page.waitForTimeout(300);
  await page.keyboard.type("Actually let me handle this differently — my own words here.");
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500);
  // The unused draft must be superseded, not receipted: no "Sent" lifecycle
  // chip on a v1/1 card claiming Hermes text was sent.
  const receipt = await page.getByText(/v\d+\/\d+/).first().isVisible().catch(() => false);
  ok("no receipt card for the unused draft", !receipt);
  ok("fresh-draft path back (CTA visible on the sent thread)",
    await page.getByRole("button", { name: /draft follow-up/i }).first().isVisible().catch(() => false));
  await page.close();
}

console.log("[2] stepper browse after add-to-chat");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  ok("found CTA thread", await huntCta(page));
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // v1
  await page.waitForTimeout(200);
  await page.keyboard.press("r"); // refine → v2
  await page.waitForTimeout(200);
  await page.keyboard.type("make it shorter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700); // v2 lands, becomes active
  await page.keyboard.press("a"); // add v2 → handedVersionId = v2
  await page.waitForTimeout(300);
  // Browse BACK to v1 with the stepper — attribution must not follow.
  await page.getByRole("button", { name: "Previous version" }).click();
  await page.waitForTimeout(200);
  const panel = page.locator('[aria-label="Hermes draft panel"]');
  ok("stepper browsed to v1", await panel.getByText("v1/2").first().isVisible().catch(() => false));
  // Send from the COMPOSER (click to focus — Meta+Enter on the stepper
  // button would go nowhere) — the composer still holds the v2 handoff.
  const composer = page.locator('textarea[aria-label="Message composer"]');
  await composer.click();
  await page.keyboard.press("Meta+Enter");
  await page.waitForTimeout(500);
  ok("send happened (composer emptied)", (await composer.inputValue()) === "");
  // The receipt pins the HANDED version: v2/2, not the browsed v1.
  const stepper = await panel.getByText(/v\d+\/2/).first().innerText().catch(() => "none");
  ok("receipt shows the version actually sent (v2/2)", stepper === "v2/2",
    `(stepper="${stepper}")`);
  ok("lifecycle reads Sent (panel-scoped)",
    await panel.getByText("Sent", { exact: true }).first().isVisible().catch(() => false));
  await page.close();
}

console.log("[3] done last-outgoing rows draft as follow-ups");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  // Sent view → show done → walk to the done group (last rows).
  await page.keyboard.press("g"); await page.keyboard.press("s");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /show done/i }).click();
  await page.waitForTimeout(200);
  for (let i = 0; i < 60; i++) await page.keyboard.press("j");
  await page.waitForTimeout(150);
  // The fixture done row may carry a standing card (no CTA at all) — the
  // invariant is that NOTHING reply-flavored shows on a last-word-yours row.
  ok("no reply-flavored CTA on the done row",
    !(await page.getByRole("button", { name: /draft reply/i }).first().isVisible().catch(() => false)));
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  ok("angles carry follow-up labels (Gentle nudge)",
    await page.getByText("Gentle nudge").first().isVisible().catch(() => false));
  ok("no reply-flavored 'Warm' label", !(await page.getByText("Warm", { exact: true }).first().isVisible().catch(() => false)));
  await page.close();
}

console.log(`\nR14 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
