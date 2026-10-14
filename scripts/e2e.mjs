// Primary-flow browser check + screenshots. Usage: node scripts/e2e.mjs (dev server on :3000)
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = (n) => `screenshots/${n}.png`;
const log = (...a) => console.log("✓", ...a);
const assert = (c, m) => { if (!c) throw new Error("FAIL: " + m); log(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE + "/");
await page.getByRole("heading", { name: /Your trip, as a travel magazine/ }).waitFor();
await page.screenshot({ path: out("01-home-empty"), fullPage: true });

// Wizard + validation
await page.getByRole("link", { name: "Plan a new trip" }).click();
await page.getByRole("button", { name: "Next" }).click();
assert(await page.getByText("Enter a destination").isVisible(), "validation: destination required");
await page.fill("#dest", "Athens");
await page.fill("#arr", "2026-11-10"); await page.fill("#dep", "2026-11-05");
await page.getByRole("button", { name: "Next" }).click();
assert(await page.getByText("Departure must be on or after arrival").isVisible(), "validation: date order");
await page.screenshot({ path: out("02-wizard-validation"), fullPage: true });
await page.fill("#dep", "2026-11-13");
await page.selectOption("#cur", "GBP");
await page.fill("#acc", "Koukaki");
await page.getByRole("button", { name: "Next" }).click();
for (const i of ["history", "food", "nightlife"]) await page.locator("label.chip", { hasText: i }).click();
await page.screenshot({ path: out("03-wizard-preferences"), fullPage: true });
await page.getByRole("button", { name: "Generate itinerary" }).click();
await page.getByRole("button", { name: "Save my guide" }).waitFor();
await page.screenshot({ path: out("04-wizard-preview"), fullPage: true });
await page.getByRole("button", { name: "Save my guide" }).click();
await page.waitForURL(/\/trip\/?\?id=/);
await page.getByRole("heading", { name: "Athens", level: 1 }).waitFor();
await page.waitForTimeout(2500); // weather fetch
const tripUrl = page.url().replace("&created=1", "");
assert((await page.locator(".day").count()) === 4, "4 days generated for 10–13 Nov");
await page.screenshot({ path: out("05-guide-athens-desktop"), fullPage: false });
await page.screenshot({ path: out("06-guide-athens-full"), fullPage: true });

const day1 = page.locator(".day").nth(0), day2 = page.locator(".day").nth(1);
const titles = async (d) => d.locator(".activity h4").allInnerTexts();
// Reorder within day 2
const before = await titles(day2);
await day2.getByRole("button", { name: `Move ${before[1]} earlier` }).click();
const after = await titles(day2);
assert(after[0] === before[1] && after[1] === before[0], "reorder within a day");
// Edit
await day2.getByRole("button", { name: `Edit ${after[0]}` }).click();
await day2.locator("input[id^=t-]").fill("Edited: morning at the museum");
await day2.locator("textarea[id^=n-]").fill("Buy tickets online");
await day2.getByRole("button", { name: "Save", exact: true }).click();
assert((await titles(day2))[0] === "Edited: morning at the museum", "edit title + notes");
await page.screenshot({ path: out("07-guide-after-edit"), fullPage: false });
// Move to day 1
const moving = (await titles(day2))[2];
await day2.getByRole("combobox", { name: `Move ${moving} to another day` }).selectOption({ index: 1 });
assert((await titles(day1)).includes(moving) && !(await titles(day2)).includes(moving), "move activity to another day");
// Add custom
await day1.getByRole("button", { name: "Add your own activity" }).click();
await day1.locator("#new-title").fill("Pick up ferry tickets");
await day1.locator("#new-time").fill("17:00");
await day1.getByRole("button", { name: "Add", exact: true }).click();
assert((await titles(day1)).includes("Pick up ferry tickets"), "add custom activity");
// Remove + undo
const n = (await titles(day1)).length;
await day1.getByRole("button", { name: "Remove Pick up ferry tickets" }).click();
assert((await titles(day1)).length === n - 1, "remove activity");
await page.locator(".toast").getByRole("button", { name: "Undo" }).click();
assert((await titles(day1)).includes("Pick up ferry tickets"), "undo restores removed activity");

// Regenerate keeps edits
await page.getByRole("button", { name: "Regenerate itinerary" }).click();
await page.waitForTimeout(800);
const all = await page.locator(".activity h4").allInnerTexts();
assert(all.includes("Edited: morning at the museum") && all.includes("Pick up ferry tickets"), "regenerate preserves user edits");

// Reload persistence
await page.goto(tripUrl); await page.getByRole("heading", { name: "Athens", level: 1 }).waitFor();
const all2 = await page.locator(".activity h4").allInnerTexts();
assert(all2.includes("Pick up ferry tickets") && all2.includes("Edited: morning at the museum"), "edits persist across reload");
await page.locator("text=Map & directions").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await page.locator(".divider", { hasText: "Map & directions" }).screenshot({ path: out("tmp") }).catch(() => {});
await page.locator("section[aria-label=Map]").screenshot({ path: out("08-map-directions") });
await page.locator("section[aria-label=Sharing]").screenshot({ path: out("09-share-panel") });

// Portable link -> shared view in a fresh context (simulates another device)
await page.getByRole("button", { name: "Copy portable link" }).click();
const link = await page.evaluate(() => navigator.clipboard.readText());
assert(link.includes("/shared#"), "portable link copied");
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(link); await p2.getByText("read-only snapshot").waitFor();
assert(!(await p2.getByText("Staying in").count()), "snapshot excludes accommodation by default");
assert((await p2.getByRole("button", { name: /^Edit / }).count()) === 0, "shared view is read-only");
await p2.waitForTimeout(1500);
await p2.screenshot({ path: out("10-shared-snapshot"), fullPage: false });
await p2.goto(tripUrl); await p2.getByText("Guide not found in this browser").waitFor();
log("local link on another browser explains limitation");
await p2.screenshot({ path: out("11-local-link-other-device") });
await p2.goto(link); await p2.getByRole("button", { name: "Save a copy to this browser" }).click();
await p2.waitForURL(/\/trip\/?\?id=/); log("import snapshot into another browser");
await p2.goto(BASE + "/shared#garbage!!"); await p2.getByText("Can't open this shared guide").waitFor(); log("invalid snapshot rejected");

// Neutral fallback destination
await page.goto(BASE + "/new");
await page.fill("#dest", "Ljubljana"); await page.fill("#arr", "2026-12-01"); await page.fill("#dep", "2026-12-03");
await page.selectOption("#cur", "EUR");
await page.getByRole("button", { name: "Next" }).click();
await page.getByRole("button", { name: "Generate itinerary" }).click();
await page.getByRole("button", { name: "Save my guide" }).click();
await page.waitForURL(/\/trip\/?\?id=/); await page.waitForTimeout(1500);
assert((await page.locator(".themed").getAttribute("data-theme")) === "neutral", "unknown destination gets neutral theme");
await page.screenshot({ path: out("12-guide-neutral-fallback"), fullPage: false });

// Istanbul theme
await page.goto(BASE + "/new");
await page.fill("#dest", "Istanbul"); await page.fill("#arr", "2026-10-20"); await page.fill("#dep", "2026-10-22");
await page.getByRole("button", { name: "Next" }).click();
await page.getByRole("button", { name: "Generate itinerary" }).click();
await page.getByRole("button", { name: "Save my guide" }).click();
await page.waitForURL(/\/trip\/?\?id=/); await page.waitForTimeout(2500);
assert((await page.locator(".themed").getAttribute("data-theme")) === "istanbul", "Istanbul theme");
await page.screenshot({ path: out("13-guide-istanbul"), fullPage: false });

await page.goto(BASE + "/"); await page.locator(".trip-card").first().waitFor();
await page.screenshot({ path: out("14-home-with-trips"), fullPage: true });

// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.addInitScript(() => {});
const mp = await m.newPage();
await mp.goto(link); await mp.getByText("read-only snapshot").waitFor(); await mp.getByRole("button", { name: "Save a copy to this browser" }).click();
await mp.waitForURL(/\/trip\/?\?id=/); await mp.waitForTimeout(2000);
await mp.screenshot({ path: out("15-mobile-guide-hero") });
await mp.locator(".day").nth(1).scrollIntoViewIfNeeded(); await mp.waitForTimeout(300);
await mp.screenshot({ path: out("16-mobile-day") });
await mp.goto(BASE + "/new"); await mp.screenshot({ path: out("17-mobile-wizard"), fullPage: true });

assert(errors.length === 0, "no uncaught page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close();
console.log("ALL E2E CHECKS PASSED");
