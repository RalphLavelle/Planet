import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityRow } from "@/components/ActivityRow";
import * as edit from "@/services/editing";
import { BrowserStorageDraftRepository } from "@/repositories/BrowserStorageTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

async function row(props: { readOnly?: boolean; editing?: boolean } = {}) {
  const trip = await makeTrip();
  const a = trip.days[0].activities[0];
  const html = renderToStaticMarkup(h(ActivityRow, { trip, dayId: trip.days[0].id, activity: a, editing: false, onEditing: () => {}, onChange: () => {}, ...props }));
  return { trip, a, html };
}

describe("ActivityRow (shared by saved guide and draft preview)", () => {
  it("is tappable: row class, title button, visible edit cue", async () => {
    const { a, html } = await row();
    expect(html).toContain("activity-card is-editable");
    expect(html).toContain('class="activity-open"');
    expect(html).toContain(`aria-label="Edit ${a.title.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("row-cue");
    expect(html).toContain("activity-time"); // fixed grid columns: time | thumb | body
    expect(html).toContain("thumb");
  });
  it("read-only (shared) view has no cue, no edit button and no editable class", async () => {
    const { html } = await row({ readOnly: true });
    expect(html).not.toContain("row-cue");
    expect(html).not.toContain("activity-open");
    expect(html).not.toContain("is-editable");
    expect(html).not.toContain('aria-label="Edit ');
  });
  it("shows the editor when editing, and never when read-only", async () => {
    expect((await row({ editing: true })).html).toContain("item-editor");
    const ro = (await row({ editing: true, readOnly: true })).html;
    expect(ro).not.toContain("item-editor");
  });
});

describe("draft edits carry through to Save", () => {
  it("an edited draft round-trips via the session draft store and keeps edits", async () => {
    const trip = await makeTrip();
    const store = new MemoryStore(); const drafts = new BrowserStorageDraftRepository(() => store);
    const a = trip.days[0].activities[0];
    let draft = edit.applyItemEdit(trip, trip.days[0].id, a.id, { title: "My tweak", startTime: "09:15" }, { dayId: trip.days[1].id, position: 0 });
    draft = edit.addActivity(draft, trip.days[0].id, { title: "Coffee with Sam", startTime: "08:00" });
    draft = edit.removeActivity(draft, trip.days[2].id, trip.days[2].activities[0].id);
    await drafts.saveDraft(draft);
    const restored = (await drafts.getDraft())!;
    expect(restored.days[1].activities[0]).toMatchObject({ id: a.id, title: "My tweak", startTime: "09:15" });
    expect(restored.days[0].activities.some((x) => x.title === "Coffee with Sam")).toBe(true);
    expect(restored.days[2].activities).toHaveLength(trip.days[2].activities.length - 1);
    expect(Date.parse(restored.updatedAt)).toBeGreaterThanOrEqual(Date.parse(restored.createdAt)); // same-millisecond edits are possible, so no strict inequality
  });
});
