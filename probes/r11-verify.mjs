// R11 behavioral verification — Codex round-9 fix.
// Under the Unread filter, reading a row (Enter or click) records the orphan
// slot so the next j/k continues from where you were, not row 0.
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

// Turn the Unread filter on via the palette.
await page.keyboard.press("Meta+k");
await page.waitForTimeout(250);
await page.keyboard.type("unread");
await page.waitForTimeout(150);
await page.keyboard.press("Enter");
await page.waitForTimeout(300);

console.log("[1] Enter-then-j under the Unread filter");
{
  const before = await listTitles();
  ok("unread filter shows enough rows", before.length > 4, `(n=${before.length})`);
  for (const k of ["j", "j"]) await page.keyboard.press(k); // idx 2 (j from row 0)
  const readTitle = await selectedTitle();
  await page.keyboard.press("Enter"); // read: row leaves the filtered list
  await page.waitForTimeout(250);
  const after = await listTitles();
  ok("read row left the filtered list", !after.includes(readTitle),
    `(read="${readTitle}")`);
  await page.keyboard.press("u"); // back to list scope
  await page.keyboard.press("j"); // pre-fix: yank to row 0
  await page.waitForTimeout(150);
  const now = await selectedTitle();
  const slotIdx = before.indexOf(readTitle); // idx 2 in the pre-read list
  ok("j continues from the read slot, not row 0",
    now === after[Math.min(slotIdx, after.length - 1)] && now !== after[0],
    `(now="${now}", slot="${after[Math.min(slotIdx, after.length - 1)]}", row0="${after[0]}")`);
}

console.log("[2] click-then-j (selectId path)");
{
  const before = await listTitles();
  const target = before[2];
  await page.locator("button.h-10.w-full").nth(2).click(); // selectId reads
  await page.waitForTimeout(250);
  const after = await listTitles();
  ok("clicked row left the filtered list", !after.includes(target), `(read="${target}")`);
  await page.keyboard.press("j");
  await page.waitForTimeout(150);
  const now = await selectedTitle();
  ok("j continues from the click slot, not row 0",
    now === after[Math.min(2, after.length - 1)] && now !== after[0],
    `(now="${now}", slot="${after[Math.min(2, after.length - 1)]}", row0="${after[0]}")`);
}

console.log(`\nR11 verify: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
