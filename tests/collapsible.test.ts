import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Collapsible } from "@/components/Collapsible";
import { loadPanels, resolveOpen, savePanel } from "@/lib/panelState";
import { MemoryStore } from "@/repositories/TripRepository";

const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(h(Collapsible, { id: "weather", title: "Weather", summary: "4-day forecast", ...props } as never, h("p", null, "BODY")));

describe("Collapsible markup", () => {
  it("renders a heading with a real button wired to its region (closed by default)", () => {
    const html = render();
    expect(html).toMatch(/<h2[^>]*><button[^>]*type="button"/);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/aria-controls="([^"]+)"/);
    const controls = /aria-controls="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain('role="region"');
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
    expect(html).toContain("hidden");
    expect(html).toContain("4-day forecast");
  });
  it("is open when defaultOpen and then mounts its body", () => {
    const html = render({ defaultOpen: true });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("BODY");
    expect(html).not.toMatch(/class="collapsible-body"[^>]*hidden/);
  });
  it("lazy bodies are not mounted while closed, but lazy={false} keeps them (form fields)", () => {
    expect(render()).not.toContain("BODY");
    expect(render({ lazy: false })).toContain("BODY");
  });
  it("honours controlled open, heading level and variant", () => {
    const html = render({ open: true, onOpenChange: () => {}, level: 4, variant: "inline" });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("<h4");
    expect(html).toContain("collapsible-inline");
  });
});

describe("panel state persistence", () => {
  it("remembers open/closed per scope and falls back to defaults", () => {
    const store = new MemoryStore();
    expect(loadPanels(store, "t1")).toEqual({});
    expect(resolveOpen(loadPanels(store, "t1"), "map", false)).toBe(false);
    savePanel(store, "t1", "map", true);
    savePanel(store, "t1", "weather", false);
    savePanel(store, "t2", "map", false);
    expect(loadPanels(store, "t1")).toEqual({ map: true, weather: false });
    expect(resolveOpen(loadPanels(store, "t1"), "map", false)).toBe(true);
    expect(resolveOpen(loadPanels(store, "t1"), "weather", true)).toBe(false);
    expect(resolveOpen(loadPanels(store, "t2"), "map", true)).toBe(false);
  });
  it("ignores corrupt or hostile stored data", () => {
    const store = new MemoryStore();
    store.setItem("planet:ui:panels:x", "[1,2]");
    expect(loadPanels(store, "x")).toEqual({});
    store.setItem("planet:ui:panels:x", "{not json");
    expect(loadPanels(store, "x")).toEqual({});
    store.setItem("planet:ui:panels:x", JSON.stringify({ a: "yes", b: true }));
    expect(loadPanels(store, "x")).toEqual({ b: true });
    expect(() => savePanel(null, "x", "a", true)).not.toThrow();
  });
  it("tracks whether a collapsed-days choice was stored", async () => {
    const { UiPrefs } = await import("@/services/uiPrefs");
    const store = new MemoryStore();
    const p = new UiPrefs(() => store);
    expect(await p.hasCollapsedDays("t")).toBe(false);
    await p.setCollapsedDays("t", []);
    expect(await p.hasCollapsedDays("t")).toBe(true);
  });
});
