// R20 behavioral verification — design revision (Elijah).
// (A) draft surface anchor: bottom sheet <md; RIGHT drawer md–xl; panel xl+
// (B) e/a split: e = mark done everywhere (M3 no-op preserved); a = add-to-chat
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();

const openDraftSurface = async (page) => {
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  await page.locator("button.h-10.w-full").nth(1).click();
  await page.locator('textarea[aria-label="Message composer"]').waitFor();
  await page.keyboard.press("d");
  await page.locator('[role="dialog"][aria-label="Hermes draft"]').waitFor({ timeout: 2000 });
  await page.waitForTimeout(300); // let the entrance animation settle
  return page.locator('[role="dialog"][aria-label="Hermes draft"]');
};

console.log("[A] anchor geometry per breakpoint");
for (const [w, h, expect] of [[390, 844, "bottom"], [768, 900, "right"], [1024, 800, "right"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const dialog = await openDraftSurface(page);
  const box = await dialog.boundingBox();
  if (expect === "bottom") {
    ok(`${w}px: bottom sheet (full width, bottom-anchored)`,
      box.width >= w - 2 && Math.abs(box.y + box.height - h) < 2,
      `(box=${JSON.stringify(box)})`);
  } else {
    // rem-based width scales with the fluid root font — measure against it.
    const remW = await page.evaluate(() => 21.25 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    ok(`${w}px: right drawer (full height, right-anchored, 21.25rem)`,
      Math.abs(box.height - h) < 2 && Math.abs(box.x + box.width - w) < 2 &&
      Math.abs(box.width - remW) < 3,
      `(box=${JSON.stringify(box)}, remW=${remW})`);
  }
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  ok("1280px: persistent panel, no overlay dialog",
    (await page.locator('[aria-label="Hermes draft panel"]').isVisible().catch(() => false)) &&
    !(await page.locator('[role="dialog"][aria-label="Hermes draft"]').isVisible().catch(() => false)));
  await page.close();
}

console.log("[B] the e/a split");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);
  await page.getByText("Synced", { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const composer = page.locator('textarea[aria-label="Message composer"]');
  const selectedTitle = async () =>
    (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
  const cta = () => page.getByRole("button", { name: /draft (reply|follow-up)/i }).first().isVisible().catch(() => false);
  let hops = 0;
  while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  const who = await selectedTitle();
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1"); // generated card picked
  await page.waitForTimeout(200);
  // e on a picked draft must NOT add to chat anymore — it ARCHIVES (standing
  // card is durable; versions survive markDone).
  await page.keyboard.press("e");
  await page.waitForTimeout(400);
  ok("e did not add to chat (composer empty)", (await composer.inputValue()) === "");
  ok("e archived the thread (selection advanced off it)", (await selectedTitle()) !== who,
    `(was "${who}", now "${await selectedTitle()}")`);
  // a adds to chat on a fresh picked draft.
  hops = 0;
  while (!(await cta()) && hops < 15) { await page.keyboard.press("j"); hops++; await page.waitForTimeout(60); }
  await page.keyboard.press("d");
  await page.waitForTimeout(750);
  await page.keyboard.press("1");
  await page.waitForTimeout(200);
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  const handed = await composer.inputValue();
  ok("a adds the picked draft to the composer", handed.length > 0);
  // M3 preserved: e during the handoff (added_to_chat) stays a no-op.
  // Blur first — `a` focused the composer, and a typed "e" is not the test.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const before = await selectedTitle();
  await page.keyboard.press("e");
  await page.waitForTimeout(300);
  ok("e no-ops during the handoff (M3 kept — composer intact, thread not archived)",
    (await composer.inputValue()) === handed && (await selectedTitle()) === before);
  await page.close();
}

console.log(`\nR20 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
