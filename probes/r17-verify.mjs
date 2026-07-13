// R17 behavioral verification — Codex round-15 fix (last of the no-op class).
// An orphaned selection (post-send routing strip in Important) survives:
// (1) the palette Sent-show-done toggle  (2) a same-view g-chord.
// Control: the toggle still re-anchors a vanishing selection IN Sent.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:5173/";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL);
await page.getByText("Synced", { exact: true }).waitFor();
await page.waitForTimeout(150);

const selectedTitle = async () =>
  (await page.locator('[aria-current="true"]').last().innerText()).split("\n")[0];
const listTitles = async () =>
  (await page.locator("button.h-10.w-full").allInnerTexts()).map((t) => t.split("\n")[0]);
const strip = () => page.getByText(/open until they respond/i).isVisible().catch(() => false);

console.log("[1] orphan strip survives the global show-done toggle");
for (const k of ["j", "j", "j"]) await page.keyboard.press(k); // mid-list
await page.keyboard.press("c");
await page.waitForTimeout(300);
await page.keyboard.type("Can you confirm the schedule?");
await page.keyboard.press("Meta+Enter");
await page.waitForTimeout(600); // row exits Important; orphanIdx = 3; strip up
ok("routing strip up (orphaned selection)", await strip());
const titles = await listTitles();
await page.keyboard.press("Meta+k");
await page.waitForTimeout(250);
await page.keyboard.type("sent view");
await page.waitForTimeout(150);
await page.keyboard.press("Enter"); // preference flip — a no-op on Important
await page.waitForTimeout(300);
ok("the toggle ran (no stray modal stole the Enter)",
  !(await page.locator('[aria-label="Keyboard shortcuts"]').isVisible().catch(() => false)));
ok("strip still up after the toggle (selection not dropped)", await strip());
console.log("[2] orphan strip survives a same-view chord");
await page.keyboard.press("g"); await page.keyboard.press("i"); // same view
await page.waitForTimeout(200);
ok("strip still up after g i (same-view no-op)", await strip());
await page.keyboard.press("j"); // orphan context intact → falls to the slot
await page.waitForTimeout(150);
const now = await selectedTitle();
ok("j continues from the orphan slot, not row 0",
  now === titles[3] && now !== titles[0],
  `(now="${now}", slot="${titles[3]}", row0="${titles[0]}")`);

console.log("[3] control: the toggle still re-anchors IN Sent");
// Build a sent-done row: g s → e the first sent row → reveal done → select it
// → hide done → selection must re-anchor (row vanished in the CURRENT view).
await page.keyboard.press("g"); await page.keyboard.press("s");
await page.waitForTimeout(200);
const sentFirst = await selectedTitle();
await page.getByRole("button", { name: "Mark done · e" }).click(); // sent → done
await page.waitForTimeout(400);
// [1]'s global toggle already turned Show-done ON — reveal only if needed.
const showBtn = page.getByRole("button", { name: /^show done/i });
if (await showBtn.isVisible().catch(() => false)) {
  await showBtn.click();
  await page.waitForTimeout(200);
}
for (let i = 0; i < 60; i++) await page.keyboard.press("j"); // walk onto done row
await page.waitForTimeout(100);
const onDone = await selectedTitle();
await page.keyboard.press("Meta+k");
await page.waitForTimeout(250);
await page.keyboard.type("sent view");
await page.waitForTimeout(150);
await page.keyboard.press("Enter"); // row vanishes → reanchor must run
await page.waitForTimeout(300);
const after = await selectedTitle();
ok("selection re-anchored off the vanished done row", after !== onDone,
  `(was "${onDone}" [done row from "${sentFirst}"], now "${after}")`);

console.log(`\nR17 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
