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
assert((await page.getByRole("button", { name: /Athens demo/ }).count()) === 0 && (await page.locator(".featured").count()) === 0, "no demo button or featured demo card");

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
await page.fill("#arr-fn", "flight 9"); await page.getByRole("button", { name: "Next" }).click();
assert(await page.getByText("Use a flight number like A3 601").isVisible(), "validation: flight number format");
await page.fill("#arr-fn", "a3601"); await page.fill("#arr-ft", "11:20");
await page.fill("#dep-fn", "A3 602"); await page.fill("#dep-ft", "18:30");
await page.locator("fieldset.flight-fields").screenshot({ path: out("03b-wizard-flights") });
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
assert((await page.locator(".flight-card").count()) === 2, "arrival + departure flight cards shown");
assert(await page.locator(".flight-arrival").getByText("A3 601").isVisible(), "flight number normalised");
const d1times = await page.locator(".day").nth(0).locator(".activity-time span").allInnerTexts();
assert(d1times.every((t) => t >= "13:50"), "day 1 starts after arrival + buffer (" + d1times.join(",") + ")");
await page.locator(".flight-arrival").scrollIntoViewIfNeeded();
await page.locator(".day").nth(0).locator(".activity").first().scrollIntoViewIfNeeded();
await page.locator(".minimap .leaflet-tile-loaded").first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);
assert(await page.locator(".minimap-dist").first().isVisible(), "mini map shows crow-flies distance from geocoded base");
await page.locator(".day").nth(0).screenshot({ path: out("05b-day1-flight-minimap") });
await page.locator(".day").nth(0).locator(".activity").first().screenshot({ path: out("05c-activity-minimap") });
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
await day1.getByRole("button", { name: "Add an item" }).click();
await day1.locator("[id^=new-title]").fill("Pick up ferry tickets");
await day1.locator("[id^=new-time]").fill("17:00");
await day1.getByRole("button", { name: "Add", exact: true }).click();
assert((await titles(day1)).includes("Pick up ferry tickets"), "add custom activity");
// Remove + undo
const n = (await titles(day1)).length;
await day1.getByRole("button", { name: "Remove Pick up ferry tickets" }).click();
assert((await titles(day1)).length === n - 1, "remove activity");
await page.locator(".toast").getByRole("button", { name: "Undo" }).click();
assert((await titles(day1)).includes("Pick up ferry tickets"), "undo restores removed activity");
// Add lunch: OSM lookup with candidate picker
await day2.getByRole("button", { name: "Add an item" }).click();
await day2.getByRole("radio", { name: "Lunch" }).click();
assert((await day2.locator("[id^=new-time]").inputValue()) === "13:00", "lunch defaults to 13:00");
await day2.locator("[id^=rest]").fill("Mikel");
await day2.locator(".add-item").scrollIntoViewIfNeeded();
await page.screenshot({ path: out("21-add-lunch-form") });
await day2.getByRole("button", { name: "Look up" }).click();
await day2.locator(".venue-preview, .candidates").first().waitFor({ timeout: 20000 });
assert(await day2.locator(".candidates").count(), "candidate picker for multiple matches");
await day2.locator(".add-item").scrollIntoViewIfNeeded(); await page.screenshot({ path: out("21a-add-lunch-candidates") });
await day2.locator(".candidate").first().click();
await day2.locator(".venue-preview").waitFor(); await page.waitForTimeout(1500);
await day2.locator(".add-item").scrollIntoViewIfNeeded();
await page.screenshot({ path: out("21b-add-lunch-picked") });
await day2.getByRole("button", { name: "Add lunch" }).click();
const lunchCard = day2.locator(".activity", { hasText: "Lunch at" }).first();
await lunchCard.waitFor(); assert((await lunchCard.innerText()).includes("13:00"), "lunch added at default time");
await lunchCard.locator(".minimap, .leaflet-container").first().waitFor({ timeout: 15000 }).then(() => log("lunch has mini map")).catch(() => log("WARN lunch mini map not visible"));
await lunchCard.scrollIntoViewIfNeeded(); await page.waitForTimeout(2000);
await lunchCard.screenshot({ path: out("21c-lunch-item") });
// Manual fallback when not found
await day2.getByRole("button", { name: "Add an item" }).click();
await day2.getByRole("radio", { name: "Dinner" }).click();
await day2.locator("[id^=rest]").fill("Zzqx Nonexistent Taverna");
await day2.getByRole("button", { name: "Look up" }).click();
await day2.getByText("No match found").waitFor({ timeout: 20000 });
await day2.getByRole("button", { name: /manually/ }).click();
await day2.locator("[id^=addr]").fill("Our friend's flat");
await day2.getByRole("button", { name: "Add dinner" }).click();
assert((await titles(day2)).includes("Dinner at Zzqx Nonexistent Taverna"), "manual dinner entry when not found");

// Edit departure flight
await page.getByRole("button", { name: "Edit departure flight" }).click();
await page.fill("#ft-departure", "16:00"); await page.getByRole("button", { name: "Save flight" }).click();
assert(await page.locator(".flight-departure").getByText("departs 16:00").isVisible(), "edit flight later");
assert(await page.getByRole("button", { name: "Refit itinerary to flights" }).isVisible(), "offers refit, does not silently move plans");
await page.locator(".day").last().screenshot({ path: out("05d-last-day-departure") });
// Regenerate keeps edits
await page.getByRole("button", { name: "Regenerate itinerary" }).click();
await page.waitForTimeout(800);
const all = await page.locator(".activity h4").allInnerTexts();
assert(all.includes("Edited: morning at the museum") && all.includes("Pick up ferry tickets"), "regenerate preserves user edits");

// Reload persistence
await page.goto(tripUrl); await page.getByRole("heading", { name: "Athens", level: 1 }).waitFor();
const all2 = await page.locator(".activity h4").allInnerTexts();
assert(all2.includes("Pick up ferry tickets") && all2.includes("Edited: morning at the museum"), "edits persist across reload");
await page.getByRole("button", { name: "Collapse all" }).click();
await page.locator(".day-controls").scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
await page.screenshot({ path: out("06b-athens-collapsed") });
await page.getByRole("button", { name: "Expand all" }).click();
await page.locator(".day-banner").nth(1).scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
await page.locator(".day").nth(1).screenshot({ path: out("06c-athens-day-expanded") });
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
// Day-title bug: moving the lead activity must recompute the old day's auto title
const iday2 = page.locator(".day").nth(1);
const t2before = await iday2.locator(".day-title").innerText();
const lead = t2before.replace(/^Day 2:\s*/, "").split("\n")[0].trim();
const leadFull = (await iday2.locator(".activity h4").allInnerTexts()).find((t) => t.startsWith(lead));
await iday2.getByRole("combobox", { name: `Move ${leadFull} to another day` }).selectOption({ index: 1 });
const t2after = await iday2.locator(".day-title").innerText();
assert(!t2after.includes(lead) && /^Day 2: /.test(t2after), `auto title recomputed after move ("${t2before.split("\n")[0]}" → "${t2after.split("\n")[0]}")`);
// Inline rename + reset
await iday2.getByRole("button", { name: "Rename day 2" }).click();
await page.fill(`#${await iday2.locator("input[id^=title-]").getAttribute("id")}`, "Bazaars & Bosphorus");
await page.keyboard.press("Enter");
assert((await iday2.locator(".day-title").innerText()).startsWith("Bazaars & Bosphorus"), "inline day title edit");
await page.reload(); await page.locator(".day").first().waitFor();
assert((await page.locator(".day").nth(1).locator(".day-title").innerText()).startsWith("Bazaars & Bosphorus"), "custom title persists");
await page.waitForTimeout(1500);
await page.locator(".day").nth(1).scrollIntoViewIfNeeded();
await page.screenshot({ path: out("13b-istanbul-day-expanded") });
await page.locator(".day").nth(1).getByRole("button", { name: "Auto title" }).click();
// Dinner item with OSM lookup (Istanbul)
const dday = page.locator(".day").nth(1);
await dday.getByRole("button", { name: "Add an item" }).click();
await dday.getByRole("radio", { name: "Dinner" }).click();
await dday.locator("[id^=rest]").fill("Hamdi");
await dday.getByRole("button", { name: "Look up" }).click();
await dday.locator(".venue-preview, .candidates").first().waitFor({ timeout: 20000 });
if (await dday.locator(".candidates").count()) {
  await dday.locator(".add-item").scrollIntoViewIfNeeded(); await page.screenshot({ path: out("22-dinner-candidates") });
  await dday.locator(".candidate").first().click();
}
await dday.locator(".venue-preview").waitFor(); await page.waitForTimeout(2500);
await dday.getByRole("button", { name: "Add dinner" }).click();
const dinnerCard = dday.locator(".activity", { hasText: "Dinner at" }).first();
await dinnerCard.waitFor(); assert((await dinnerCard.innerText()).includes("20:00"), "dinner added at 20:00");
await dinnerCard.scrollIntoViewIfNeeded(); await page.waitForTimeout(2500);
await dinnerCard.screenshot({ path: out("22b-dinner-item") });
assert(/^Day 2: /.test(await page.locator(".day").nth(1).locator(".day-title").innerText()), "reset to auto title");
// Collapse all (keyboard) + persistence
await page.getByRole("button", { name: "Collapse all" }).focus(); await page.keyboard.press("Enter");
assert((await page.locator(".day-body:visible").count()) === 0, "collapse all");
await page.locator(".day-controls").scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
await page.screenshot({ path: out("13c-istanbul-collapsed") });
await page.reload(); await page.locator(".day").first().waitFor();
assert((await page.locator(".day-body:visible").count()) === 0, "collapsed state remembered per trip");
await page.getByRole("button", { name: "Expand day 1" }).click();
assert((await page.locator(".day-body:visible").count()) === 1, "expand single day");
await page.getByRole("button", { name: "Expand all" }).click();

for (const [city, n] of [["Rome", "18"], ["Paris", "19"], ["Tokyo", "20"]]) {
  await page.goto(BASE + "/new/?dest=" + city);
  await page.fill("#arr", "2026-11-02"); await page.fill("#dep", "2026-11-04");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Generate itinerary" }).click();
  await page.getByRole("button", { name: "Save my guide" }).click();
  await page.waitForURL(/\/trip\/?\?id=/); await page.waitForTimeout(1500);
  assert((await page.locator(".themed").getAttribute("data-theme")) === city.toLowerCase(), `${city} theme`);
  await page.screenshot({ path: out(`${n}-guide-${city.toLowerCase()}`) });
  await page.locator(".day").nth(1).scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await page.screenshot({ path: out(`${n}b-${city.toLowerCase()}-day`) });
}
await page.goto(BASE + "/"); await page.locator(".trip-card").first().waitFor();
await page.screenshot({ path: out("14-home-with-trips"), fullPage: true });

// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.addInitScript(() => {});
const mp = await m.newPage();
await mp.goto(link); await mp.getByText("read-only snapshot").waitFor(); await mp.waitForTimeout(2000);
assert((await mp.getByRole("button", { name: /Save a copy/ }).count()) === 0, "shared view has no import/save-copy");
assert((await mp.request.get(BASE + "/import")).status() === 404, "/import route removed");
assert((await page.getByRole("link", { name: "Import" }).count()) === 0, "no Import link in nav");
await mp.screenshot({ path: out("15-mobile-guide-hero") });
await mp.locator(".day").nth(1).scrollIntoViewIfNeeded(); await mp.waitForTimeout(300);
await mp.screenshot({ path: out("16-mobile-day") });
await mp.goto(BASE + "/new"); await mp.screenshot({ path: out("17-mobile-wizard"), fullPage: true });

assert(errors.length === 0, "no uncaught page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close();
console.log("ALL E2E CHECKS PASSED");
