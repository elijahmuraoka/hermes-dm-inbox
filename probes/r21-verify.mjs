// R21 behavioral verification — merge-readiness review fixes.
// (1) selection follows visibility: j below the fold scrolls; lens-change
//     reanchor brings row 0 back on screen
// (2) errored sync: rail counts go honest ("—", no dots), matching the header
// (3) pre-armed g-chord cannot hijack `a` inside the open draft surface
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

console.log("[1] selection follows visibility");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(200);
  const visible = async () => {
    const sel = await page.locator('[aria-current="true"]').last().boundingBox();
    const box = await page.locator("div.min-h-0.flex-1").first().boundingBox();
    return sel && box && sel.y >= box.y - 2 && sel.y + sel.height <= box.y + box.height + 2;
  };
  for (let i = 0; i < 25; i++) await page.keyboard.press("j");
  await page.waitForTimeout(250);
  ok("selection visible after 25 j (was off-screen pre-fix)", await visible());
  for (let i = 0; i < 25; i++) await page.keyboard.press("k");
  await page.waitForTimeout(250);
  ok("selection visible after walking back up", await visible());
  // Lens change: scroll mid-list, apply a sort override (keeps row count) —
  // reanchor to row 0 must scroll it into view.
  for (let i = 0; i < 20; i++) await page.keyboard.press("j");
  await page.waitForTimeout(250);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type("newest");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  ok("reanchored row 0 visible after sort override", await visible());
  await page.close();
}

console.log("[2] errored sync makes the rail honest");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL + "?state=error");
  await page.getByText("Sync failed").waitFor({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const nav = page.locator("nav[aria-label='Views and sources']");
  const dashes = await nav.getByText("—", { exact: true }).count();
  ok("rail view counts show — while errored", dashes >= 3, `(dashes=${dashes})`);
  const dots = await nav.locator('[title$="unread"]').count();
  ok("no unread dots while errored", dots === 0, `(dots=${dots})`);
  await page.close();
}

console.log("[3] pre-armed chord cannot hijack `a` in the draft surface");
{
  const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(200);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  await page.keyboard.press("d"); // right drawer opens (md–xl)
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // generated card
  await page.waitForTimeout(200);
  // Arm a chord OUTSIDE... it can only be pre-armed: press g (swallowed? no —
  // g pressed while surface open is swallowed and now clears any pending).
  // Recreate the pre-armed window: close surface, press g, reopen via the
  // panel Draft affordance is guarded — so simulate the pure handler path:
  // press g THEN a rapidly with the surface open; g is swallowed, and the
  // R21 clear means `a` must ADD, never switch view to All.
  await page.keyboard.press("g");
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  const added = (await composer.inputValue()).length > 0;
  const view = await page.locator("h2").first().innerText().catch(() => "");
  ok("a added to chat (no view hijack)", added && !view.startsWith("All"),
    `(added=${added}, view="${view}")`);
  await page.close();
}

console.log(`\nR21 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
