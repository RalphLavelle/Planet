import { describe, expect, it } from "vitest";
import { OsmRestaurantFinder, commonsFileFromTag, parseCandidates } from "@/services/restaurants";
import { addMeal } from "@/services/editing";
import { TripSchema } from "@/domain/schemas";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

const centre = { lat: 37.9715, lng: 23.7267 };
const hit = (o: Record<string, unknown>) => ({ lat: "37.97", lon: "23.72", category: "amenity", type: "restaurant", osm_type: "node", osm_id: 1, name: "Kuzina", address: { road: "Adrianou", house_number: "9", neighbourhood: "Thiseio" }, ...o });
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
const noWait = () => Promise.resolve();

describe("restaurant lookup", () => {
  it("keeps only food POIs, builds a short address, sorts by distance to base", () => {
    const r = parseCandidates([hit({ osm_id: 1, lat: "37.99" }), hit({ osm_id: 2, lat: "37.972", name: "Near" }), hit({ osm_id: 3, category: "tourism", type: "hotel", name: "Hotel" })] as never, centre);
    expect(r.map((c) => c.venue.name)).toEqual(["Near", "Kuzina"]);
    expect(r[0].venue.address).toBe("Adrianou 9, Thiseio");
    expect(r[0].venue.osmUrl).toBe("https://www.openstreetmap.org/node/2");
  });
  it("only accepts Wikimedia image tags (unknown-licence URLs are ignored)", () => {
    expect(commonsFileFromTag("File:Kuzina_front.jpg")).toBe("Kuzina front.jpg");
    expect(commonsFileFromTag("https://commons.wikimedia.org/wiki/File:A%20b.jpg")).toBe("A b.jpg");
    expect(commonsFileFromTag("https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg")).toBe("X.jpg");
    expect(commonsFileFromTag("https://example.com/photo.jpg")).toBeNull();
    expect(commonsFileFromTag(undefined)).toBeNull();
  });
  it("searches around the base, caches results, and falls back to a city-text search", async () => {
    const urls: string[] = [];
    const f = new OsmRestaurantFinder(() => store, (u) => { urls.push(String(u)); return json(urls.length === 1 ? [] : [hit({})]); }, noWait);
    const store = new MemoryStore();
    const r = await f.search("Kuzina", { center: centre, base: { lat: 37.968, lng: 23.72 }, cityName: "Athens" });
    expect(r).toHaveLength(1);
    expect(urls[0]).toContain("bounded=1"); expect(urls[0]).toContain("viewbox=");
    expect(decodeURIComponent(urls[1])).toContain("Kuzina, Athens");
    await f.search("kuzina", { center: centre, base: { lat: 37.968, lng: 23.72 }, cityName: "Athens" });
    expect(urls).toHaveLength(2);
  });
  it("gets a licensed photo via the wikidata tag, and none without tags", async () => {
    const store = new MemoryStore();
    const fetchImpl = (u: string | URL | Request) => String(u).includes("wikidata") ? json({ claims: { P18: [{ mainsnak: { datavalue: { value: "Kuzina.jpg" } } }] } })
      : json({ query: { pages: { "1": { imageinfo: [{ thumburl: "https://upload.wikimedia.org/x/320px-Kuzina.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Kuzina.jpg", extmetadata: { Artist: { value: "<a>Jane</a>" }, LicenseShortName: { value: "CC BY-SA 4.0" } } }] } } } });
    const f = new OsmRestaurantFinder(() => store, fetchImpl as typeof fetch, noWait);
    const [c] = parseCandidates([hit({ extratags: { wikidata: "Q42" } })] as never, centre);
    expect(await f.photo(c)).toMatchObject({ author: "Jane", license: "CC BY-SA 4.0", src: "https://upload.wikimedia.org/x/320px-Kuzina.jpg" });
    const [bare] = parseCandidates([hit({ osm_id: 9 })] as never, centre);
    expect(await f.photo(bare)).toBeNull();
  });
});

describe("addMeal", () => {
  it("adds lunch at 13:00 in time order with venue + location; dinner time editable", async () => {
    const t = await makeTrip();
    const day = t.days[1];
    const t2 = addMeal(t, day.id, { meal: "lunch", venue: { name: "Kuzina", address: "Adrianou 9", source: "osm" }, location: centre });
    const acts = t2.days[1].activities;
    const lunch = acts.find((a) => a.meal === "lunch")!;
    expect(lunch).toMatchObject({ title: "Lunch at Kuzina", startTime: "13:00", durationMinutes: 75, category: "food", location: centre });
    const i = acts.indexOf(lunch);
    if (i > 0 && acts[i - 1].startTime) expect(acts[i - 1].startTime! <= "13:00").toBe(true);
    if (acts[i + 1]?.startTime) expect(acts[i + 1].startTime! > "13:00").toBe(true);
    const t3 = addMeal(t2, day.id, { meal: "dinner", venue: { name: "Home cooking", address: "", source: "manual" }, startTime: "21:15" });
    expect(t3.days[1].activities.at(-1)).toMatchObject({ meal: "dinner", startTime: "21:15", durationMinutes: 105 });
    expect(TripSchema.safeParse(t3).success).toBe(true);
  });
  it("rejects non-Wikimedia venue photos (e.g. in a tampered snapshot)", async () => {
    const t = await makeTrip();
    expect(() => addMeal(t, t.days[0].id, { meal: "lunch", venue: { name: "X", address: "", source: "osm", photo: { src: "https://evil.example/a.jpg", title: "", author: "", license: "", licenseUrl: "", sourceUrl: "" } } })).toThrow();
  });
});
