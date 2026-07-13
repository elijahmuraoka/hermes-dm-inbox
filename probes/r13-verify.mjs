// R13 behavioral verification — Codex round-11 fixes.
// (1) re-draft over a sent receipt starts CLEAN (stepper + cancel path)
// (2) fold commands disabled under a flat sort override (+sweep disables)
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
// Build a sent receipt on the selected CTA thread: d → 1 → e → ⌘Enter.
const makeReceipt = async (page) => {
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1");
  await page.waitForTimeout(200);
  await page.keyboard.press("a"); // add to chat (focuses composer)
  await page.waitForTimeout(300);
  await page.keyboard.press("Meta+Enter"); // send → draft = sent_mock receipt
  await page.waitForTimeout(500);
};

console.log("[1] re-draft over receipt starts clean");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  ok("found CTA thread", await huntCta(page));
  await makeReceipt(page);
  // Re-draft from the receipt.
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // pick a fresh angle
  await page.waitForTimeout(250);
  const stepper = await page.getByText(/v\d+\/\d+/).first().innerText().catch(() => "none");
  ok("fresh card is v1/1 — the sent version did NOT ride along", stepper === "v1/1",
    `(stepper="${stepper}")`);
  const prevDisabled = await page.getByRole("button", { name: "Previous version" })
    .isDisabled().catch(() => true);
  ok("no step-back to the sent text", prevDisabled);
  await page.close();
}

console.log("[2] cancel during re-draft-over-receipt does not resurrect it");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  ok("found CTA thread", await huntCta(page));
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const who = await selectedTitle();
  await makeReceipt(page);
  await page.keyboard.press("d"); // re-draft (requested, clean slate)
  await page.waitForTimeout(120);
  // Cancel inside the window via the header Done button (the unguarded path).
  await page.getByRole("button", { name: "Mark done · e" }).click();
  await page.waitForTimeout(900); // stale timer window fully past
  // markDone retargets selection (R10/R12) — the panel now shows a NEIGHBOR.
  // Follow the canceled thread into All and inspect ITS state.
  await page.keyboard.press("g"); await page.keyboard.press("a");
  await page.waitForTimeout(200);
  let found = false;
  for (let i = 0; i < 60; i++) {
    if ((await selectedTitle()) === who) { found = true; break; }
    await page.keyboard.press("j");
    await page.waitForTimeout(30);
  }
  ok("found canceled thread in All", found, `(who="${who}")`);
  const resurrect = await page.getByText(/v\d+\/\d+/).first().isVisible().catch(() => false);
  const addBtn = await page.getByRole("button", { name: /add to chat/i }).isVisible().catch(() => false);
  ok("no resurrected card after cancel (clean not_started)", !resurrect && !addBtn,
    `(stepper=${resurrect}, add=${addBtn})`);
  await page.close();
}

console.log("[3] fold commands under a flat sort + sweep disables");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  // Sweep: the ACTIVE source command is disabled (source=all at rest).
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("all sources");
  await page.waitForTimeout(150);
  ok("active source command disabled",
    await page.locator('[cmdk-item][data-disabled="true"]', { hasText: /all sources/i })
      .first().isVisible().catch(() => false));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // Fold command enabled under default sort…
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("collapse");
  await page.waitForTimeout(150);
  const enabledFold = await page.locator('[cmdk-item]:not([data-disabled="true"])', { hasText: /collapse/i })
    .first().isVisible().catch(() => false);
  ok("fold command enabled under default sort", enabledFold);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // …switch Important to newest, fold commands go disabled with honest label.
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("newest");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("collapse");
  await page.waitForTimeout(150);
  const disabledFold = page.locator('[cmdk-item][data-disabled="true"]', { hasText: /collapse/i }).first();
  ok("fold command disabled under flat sort", await disabledFold.isVisible().catch(() => false));
  const label = await disabledFold.innerText().catch(() => "");
  ok("honest label says why", /default sort only/i.test(label), `(label="${label}")`);
  await page.close();
}

console.log(`\nR13 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
