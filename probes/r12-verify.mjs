// R12 behavioral verification — Codex round-10 fixes.
// (1) the draft sheet never survives a selection retarget it didn't initiate
// (2) orphan fallback direction: k lands ABOVE the vacated slot
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

// ---------- [1] sheet-open palette-filter retarget (mobile) ----------
console.log("[1] palette filter over the open sheet closes it");
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const sheet = page.locator('[role="dialog"][aria-label="Hermes draft"]');
  // Open (and thereby READ) row 2, then raise the sheet on it.
  await page.locator("button.h-10.w-full").nth(2).click();
  await page.locator('textarea[aria-label="Message composer"]').waitFor();
  await page.keyboard.press("d");
  await sheet.waitFor({ timeout: 2000 });
  ok("sheet open on the selected thread", await sheet.isVisible());
  // Palette over the sheet (R7 matrix keeps / live), apply the Unread
  // filter: the just-read thread leaves the view → reanchor retargets.
  await page.keyboard.press("/");
  await page.waitForTimeout(250);
  await page.keyboard.type("unread");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  ok("sheet closed by the retarget (not showing another conversation)",
    !(await sheet.isVisible().catch(() => false)));
  await page.close();
}

// ---------- [2] orphan fallback k-direction ----------
console.log("[2] k from an orphaned selection lands ABOVE the vacated slot");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const listTitles = async () =>
    (await page.locator("button.h-10.w-full").allInnerTexts()).map((t) => t.split("\n")[0]);
  // Unread filter → read a mid-list row (orphanIdx = 2, R11) → u → k.
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("unread");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  for (const k of ["j", "j"]) await page.keyboard.press(k); // idx 2
  const readTitle = await selectedTitle();
  await page.keyboard.press("Enter"); // read → row leaves, orphanIdx = 2
  await page.waitForTimeout(250);
  const after = await listTitles();
  ok("read row left the filtered list", !after.includes(readTitle));
  await page.keyboard.press("u");
  await page.keyboard.press("k"); // pre-fix: lands after[2] (feels like down)
  await page.waitForTimeout(150);
  const now = await selectedTitle();
  ok("k lands one ABOVE the vacated slot", now === after[1],
    `(now="${now}", above="${after[1]}", at-slot="${after[2]}")`);
  await page.close();
}

console.log(`\nR12 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
