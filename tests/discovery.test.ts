import { describe, expect, it } from "vitest";
import { classify, placesFromOsm, type OsmElement } from "@/services/discovery/osm";
import { OsmPlaceDiscovery, applyWikidataType, commonsFile, type PlaceDiscovery, type DiscoveryResult } from "@/services/discovery/PlaceDiscovery";
import { DemoItineraryGenerator } from "@/services/itinerary/DemoItineraryGenerator";
import { MemoryStore } from "@/repositories/TripRepository";
import { generateTrip, generationNotice } from "@/services/trips";
import { haversineKm } from "@/services/geocoding";
import { TripSchema } from "@/domain/schemas";

const C = { lat: -28.0, lng: 153.43 };
const el = (id: number, tags: Record<string, string>, d = 0): OsmElement => ({ type: "node", id, lat: C.lat + d, lon: C.lng + d, tags });
const res = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const noWait = () => Promise.resolve();

describe("OSM mapping", () => {
  it("maps tags to categories, interests, indoor flags and durations", () => {
    expect(classify({ tourism: "museum" })).toMatchObject({ category: "museum", indoor: true });
    expect(classify({ natural: "beach" })).toMatchObject({ category: "beach", indoor: false, interests: ["nature"] });
    expect(classify({ amenity: "restaurant" })).toMatchObject({ category: "food", meal: "any" });
    expect(classify({ historic: "castle" })?.interests).toContain("architecture");
    expect(classify({ amenity: "parking" })).toBeNull();
  });
  it("dedupes by name, drops noise, never invents prices, keeps real opening_hours only", () => {
    const ps = placesFromOsm([
      el(1, { name: "Burleigh Beach", natural: "beach" }), el(2, { name: "Burleigh Beach", natural: "beach", wikidata: "Q5", wikipedia: "en:Burleigh Beach" }),
      el(3, { name: "Car park 3", tourism: "attraction" }), el(4, { name: "HOTA Gallery", tourism: "gallery", opening_hours: "Mo-Su 10:00-16:00" }), { type: "way", id: 9, tags: { name: "No coords", tourism: "museum" } },
    ]);
    expect(ps.map((p) => p.name).sort()).toEqual(["Burleigh Beach", "HOTA Gallery"]);
    expect(ps.find((p) => p.name === "Burleigh Beach")!.wikidata).toBe("Q5");
    expect(ps.every((p) => p.cost[0] === -1)).toBe(true);
    expect(ps.find((p) => p.name === "HOTA Gallery")!.openingHoursNote).toContain("Mo-Su 10:00-16:00");
    expect(ps.find((p) => p.name === "Burleigh Beach")!.openingHoursNote).toBeUndefined();
  });
  it("classifies Wikipedia-only places by Wikidata type and drops settlements/events", () => {
    const p = { key: "w", name: "X", category: "sight" as const, interests: [], description: "", durationMinutes: 45, cost: [-1, -1] as [number, number], indoor: false, location: C, osmUrl: "", notability: -5 };
    applyWikidataType(p, ["Q40080"]); expect(p).toMatchObject({ category: "beach", notability: 2 });
    const q = { ...p, notability: 2 }; applyWikidataType(q, ["Q486972"]); expect(q.notability).toBeLessThan(0);
    expect(commonsFile("https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/A_b.jpg/320px-A_b.jpg")).toBe("A b.jpg");
  });
});

/** Fake network: Nominatim, Overpass (optionally failing), Wikipedia, Wikidata, Commons. */
function fakeNet(opts: { overpassFails?: number; allOverpassFail?: boolean } = {}) {
  const calls: string[] = [];
  let op = 0;
  const f = ((u: string | URL | Request) => {
    const url = String(u); calls.push(url);
    if (url.includes("nominatim")) return res([{ lat: String(C.lat), lon: String(C.lng), boundingbox: ["-28.05", "-27.95", "153.38", "153.48"], address: { country: "Australia", country_code: "au" }, extratags: { wikidata: "Q140075" } }]);
    if (url.includes("interpreter")) { op++; if (opts.allOverpassFail || op <= (opts.overpassFails ?? 0)) return res({}, 504);
      return res({ elements: [el(1, { name: "Burleigh Beach", natural: "beach", wikidata: "Q1" }, 0.01), el(2, { name: "HOTA Gallery", tourism: "gallery", wikidata: "Q2" }, 0.02), el(3, { name: "Sea World", tourism: "theme_park", wikidata: "Q3" }, 0.2),
        el(4, { name: "Botanic Gardens", leisure: "garden", wikidata: "Q4" }, 0.03), el(5, { name: "Skypoint", tourism: "viewpoint" }, 0.015), el(6, { name: "Kiosk Café", amenity: "cafe" }, 0.012), el(7, { name: "Rick Shores", amenity: "restaurant", cuisine: "asian" }, 0.02),
        el(8, { name: "Ocean Museum", tourism: "museum" }, 0.21), el(9, { name: "Far Lookout", tourism: "viewpoint" }, 0.19)] }); }
    if (url.includes("generator=geosearch")) return res(opts.allOverpassFail ? { query: { pages: { 1: { title: "Currumbin Wildlife Sanctuary", coordinates: [{ lat: C.lat + 0.01, lon: C.lng }], pageprops: { wikibase_item: "Q9" } }, 2: { title: "Southport, Queensland", coordinates: [{ lat: C.lat, lon: C.lng }], pageprops: { wikibase_item: "Q8" } }, 3: { title: "Gold Coast Art Museum", coordinates: [{ lat: C.lat + 0.02, lon: C.lng }] }, 4: { title: "Kirra Beach", coordinates: [{ lat: C.lat - 0.02, lon: C.lng }], pageprops: { wikibase_item: "Q7" } }, 5: { title: "Burleigh Head National Park", coordinates: [{ lat: C.lat - 0.03, lon: C.lng }], pageprops: { wikibase_item: "Q6" } } } } } : { query: { pages: {} } });
    if (url.includes("wikidata")) return res({ entities: { Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: "Burleigh.jpg" } } }] }, sitelinks: { enwiki: { title: "Burleigh Beach" }, dewiki: { title: "x" } }, descriptions: { en: { value: "surf beach in Queensland" } } },
      Q140075: { claims: { P18: [{ mainsnak: { datavalue: { value: "GC skyline.jpg" } } }] } }, Q9: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q43501" } } } }] } }, Q8: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q486972" } } } }] } },
      Q7: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q40080" } } } }] } }, Q6: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q46169" } } } }] } } } });
    if (url.includes("prop=extracts")) return res({ query: { pages: { 1: { title: "Burleigh Beach", extract: "Burleigh Beach is a popular surf beach on the southern Gold Coast." } } } });
    if (url.includes("commons")) return res({ query: { pages: { 1: { title: "File:Burleigh.jpg", imageinfo: [{ thumburl: "https://thumb.wikimedia.org/b/720px-Burleigh.jpg?utm_source=x", descriptionurl: "https://commons.wikimedia.org/wiki/File:Burleigh.jpg", extmetadata: { Artist: { value: "<b>Sam</b>" }, LicenseShortName: { value: "CC BY-SA 4.0" } } }] },
      2: { title: "File:GC skyline.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/s.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:GC_skyline.jpg", extmetadata: { Artist: { value: "Kim" }, LicenseShortName: { value: "Fair use" } } }] } } } });
    return res({});
  }) as typeof fetch;
  return { f, calls };
}
const mk = (net: ReturnType<typeof fakeNet>, store = new MemoryStore()) => new OsmPlaceDiscovery(() => store, net.f, noWait, ["https://a/interpreter", "https://b/interpreter"]);

describe("place discovery", () => {
  it("geocodes, falls back to the next Overpass endpoint, enriches with Wikipedia/Wikidata/Commons", async () => {
    const net = fakeNet({ overpassFails: 1 });
    const r = (await mk(net).discover("Gold Coast"))!;
    expect(net.calls.filter((c) => c.includes("interpreter"))).toEqual(["https://a/interpreter", "https://b/interpreter"]);
    expect(r.destination).toMatchObject({ name: "Gold Coast", country: "Australia", countryCode: "AU", localCurrency: "AUD" });
    expect(r.destination.photo?.license).toBe("CC BY-SA 4.0"); // city photo was "Fair use" → rejected; uses a free place photo instead
    const beach = r.places.find((p) => p.name === "Burleigh Beach")!;
    expect(beach.description).toMatch(/popular surf beach/);
    expect(beach.photo).toMatchObject({ author: "Sam", license: "CC BY-SA 4.0", src: "https://thumb.wikimedia.org/b/720px-Burleigh.jpg" });
    expect(r.places[0].name).toBe("Burleigh Beach"); // most notable first
    expect(r.warnings).toEqual([]);
  });
  it("caches per destination", async () => {
    const net = fakeNet(), store = new MemoryStore();
    await mk(net, store).discover("Gold Coast"); const n = net.calls.length;
    await mk(net, store).discover("gold coast");
    expect(net.calls.length).toBe(n);
  });
  it("uses Wikipedia geosearch + Wikidata types when every Overpass endpoint fails", async () => {
    const r = (await mk(fakeNet({ allOverpassFail: true })).discover("Gold Coast"))!;
    expect(r.warnings.join(" ")).toMatch(/Overpass/);
    const names = r.places.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["Currumbin Wildlife Sanctuary", "Kirra Beach", "Burleigh Head National Park"]));
    expect(names).not.toContain("Southport, Queensland");
    expect(r.places.find((p) => p.name === "Kirra Beach")!.category).toBe("beach");
  });
  it("returns null when the city can't be geocoded", async () => {
    const f = ((u: string) => res(String(u).includes("photon") ? { features: [] } : [])) as unknown as typeof fetch;
    expect(await new OsmPlaceDiscovery(() => new MemoryStore(), f, noWait).discover("Nowhereville")).toBeNull();
  });
});

describe("generator with discovery", () => {
  const input = { destination: "Gold Coast", arrivalDate: "2026-11-10", departureDate: "2026-11-13", nativeCurrency: "GBP", accommodation: "", preferences: { interests: ["nature" as const] } };
  it("builds days from real places: live status, photos, no invented prices, valid trip", async () => {
    const g = new DemoItineraryGenerator(mk(fakeNet()));
    const t = await generateTrip(input, g);
    expect(TripSchema.safeParse(t).success).toBe(true);
    expect(t.generator).toBe("osm-discovery-v1");
    expect(t.destination.localCurrency).toBe("AUD");
    const acts = t.days.flatMap((d) => d.activities);
    const real = acts.filter((a) => a.meta.status === "live");
    expect(real.length).toBeGreaterThan(4);
    expect(real.every((a) => !a.cost)).toBe(true);
    expect(acts.some((a) => a.title === "Burleigh Beach" && a.photo?.license === "CC BY-SA 4.0")).toBe(true);
    expect(acts.some((a) => a.title === "Rick Shores" || a.title === "Kiosk Café")).toBe(true);
  });
  it("clusters each day geographically", async () => {
    const t = await generateTrip({ ...input, preferences: { interests: [], pace: "packed" } }, new DemoItineraryGenerator(mk(fakeNet())));
    for (const d of t.days) {
      const locs = d.activities.filter((a) => a.location && a.category !== "food" && a.category !== "cafe").map((a) => a.location!);
      for (let i = 1; i < locs.length; i++) expect(haversineKm(locs[i - 1], locs[i])).toBeLessThan(15);
    }
  });
  it("falls back to the general template with a notice when discovery finds nothing", async () => {
    const none: PlaceDiscovery = { discover: async () => null };
    const t = await generateTrip(input, new DemoItineraryGenerator(none));
    expect(t.generator).toBe("demo-local-v1");
    expect(generationNotice(t)).toMatch(/Couldn't find/);
  });
  it("keeps the hand-written catalogue for showcase cities (no discovery call)", async () => {
    let called = false;
    const spy: PlaceDiscovery = { discover: async () => { called = true; return null as DiscoveryResult | null; } };
    const t = await generateTrip({ ...input, destination: "Athens" }, new DemoItineraryGenerator(spy));
    expect(called).toBe(false);
    expect(t.destination.catalogKey).toBe("athens");
  });
});

import { shortExtract } from "@/services/discovery/PlaceDiscovery";
describe("shortExtract", () => {
  it("drops parentheticals and keeps it short", () => {
    expect(shortExtract("Estrela Basilica (Portuguese: Basílica da Estrela [iʃˈtrelɐ]) is a basilica in Lisbon. It was built by Queen Maria I. More text here that is long.")).toBe("Estrela Basilica is a basilica in Lisbon. It was built by Queen Maria I.");
    expect(shortExtract("x ".repeat(400)).length).toBeLessThanOrEqual(281);
  });
});
