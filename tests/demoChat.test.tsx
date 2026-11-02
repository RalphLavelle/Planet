// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TripChat } from "@/components/TripChat";
import type { Trip } from "@/domain/schemas";
import { isInTimeOrder } from "@/domain/order";
import { applyChange, DEMO_LABEL, demoReply, unusedPlaces } from "@/services/chat/demoChat";
import { makeTrip } from "./helpers";

afterEach(cleanup);
const allTitles = (t: Trip) => t.days.flatMap((d) => d.activities.map((a) => a.title));
const known = (t: Trip) => new Set([...t.places.map((p) => p.name), ...allTitles(t)]);
const MESSAGES = ["start later", "start earlier", "move something", "too much on this day", "add a place", "hello?"];

describe("demo chat replies (scripted, no AI)", () => {
  it("every proposal only refers to items and places the trip already has", async () => {
    const t = await makeTrip();
    const names = known(t);
    for (const scope of [{ kind: "trip" } as const, ...t.days.map((d) => ({ kind: "day", dayId: d.id }) as const)]) {
      for (const m of MESSAGES) {
        const r = demoReply(t, scope, m);
        expect(r.text.length).toBeGreaterThan(0);
        if (!r.proposal) continue;
        const quoted = [...r.proposal.summary.matchAll(/“([^”]+)”/g), ...r.text.matchAll(/“([^”]+)”/g)].map((x) => x[1]);
        expect(quoted.length).toBeGreaterThan(0);
        for (const q of quoted) expect(names.has(q)).toBe(true);
      }
    }
  });
  it("an 'add' proposal uses an unused place from trip.places, never a new one", async () => {
    const t = await makeTrip();
    const r = demoReply(t, { kind: "trip" }, "add a place");
    expect(r.proposal?.change.kind).toBe("add");
    const c = r.proposal!.change as { placeId: string };
    expect(unusedPlaces(t).map((p) => p.id)).toContain(c.placeId);
    const next = applyChange(t, r.proposal!.change);
    const added = next.days.flatMap((d) => d.activities).find((a) => a.placeId === c.placeId)!;
    expect(added.title).toBe(t.places.find((p) => p.id === c.placeId)!.name);
    expect(next.days.every((d) => isInTimeOrder(d.activities))).toBe(true);
  });
  it("says so (and proposes nothing) when no known place is left", async () => {
    const t = await makeTrip();
    const none: Trip = { ...t, places: [] };
    expect(demoReply(none, { kind: "trip" }, "add a place").proposal).toBeUndefined();
  });
  it("day scope only touches that day's items", async () => {
    const t = await makeTrip();
    const d = t.days[1];
    const r = demoReply(t, { kind: "day", dayId: d.id }, "start later");
    expect(r.proposal?.change).toMatchObject({ kind: "retime", dayId: d.id });
    const m = demoReply(t, { kind: "day", dayId: d.id }, "move something");
    expect(m.proposal?.change).toMatchObject({ kind: "move", fromDayId: d.id });
  });
  it("proposals alone never change the trip; applying one does, in time order", async () => {
    const t = await makeTrip();
    const before = JSON.stringify(t);
    const r = demoReply(t, { kind: "trip" }, "start later");
    expect(JSON.stringify(t)).toBe(before);
    const next = applyChange(t, r.proposal!.change);
    expect(next).not.toBe(t);
    expect(next.days.every((d) => isInTimeOrder(d.activities))).toBe(true);
  });
  it("applying a change that refers to a vanished item throws", async () => {
    const t = await makeTrip();
    const r = demoReply(t, { kind: "trip" }, "move something");
    const c = r.proposal!.change as { activityId: string; fromDayId: string };
    const gone = { ...t, days: t.days.map((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== c.activityId) })) };
    expect(() => applyChange(gone, r.proposal!.change)).toThrow(/changed/);
  });
});

function Harness({ initial, scope, spy }: { initial: Trip; scope: Parameters<typeof TripChat>[0]["scope"]; spy?: (t: Trip) => void }) {
  const [trip, setTrip] = useState(initial);
  return <><TripChat trip={trip} scope={scope} onChange={(n) => { setTrip(n); spy?.(n); }} /><output data-testid="state">{JSON.stringify(trip.days.map((d) => d.activities.map((a) => a.id + "@" + a.startTime)))}</output></>;
}
const state = () => screen.getByTestId("state").textContent;

describe("TripChat panel", () => {
  it("is collapsed by default, labels demo replies, and the trip is untouched until Accept", async () => {
    const t = await makeTrip(); const spy = vi.fn();
    render(<Harness initial={t} scope={{ kind: "trip" }} spy={spy} />);
    const toggle = screen.getByRole("button", { name: /Ask about this trip/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByText(/Demo only/)).toBeTruthy();
    const start = state();
    fireEvent.click(screen.getByRole("button", { name: "Make day 2 start later" }));
    expect(screen.getAllByText(DEMO_LABEL).length).toBe(1);
    const preview = screen.getByRole("group", { name: "Proposed change" });
    expect(within(preview).getByText(/Nothing has changed yet/)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
    expect(state()).toBe(start);
    fireEvent.click(within(preview).getByRole("button", { name: "Accept" }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(state()).not.toBe(start);
    expect(within(preview).getByText(/Accepted/)).toBeTruthy();
    expect((within(preview).getByRole("button", { name: "Accept" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("Undo before Accept dismisses the preview and changes nothing", async () => {
    const t = await makeTrip(); const spy = vi.fn();
    render(<Harness initial={t} scope={{ kind: "trip" }} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: /Ask about this trip/ }));
    const start = state();
    fireEvent.click(screen.getByRole("button", { name: "Add one more place" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Proposed change" })).getByRole("button", { name: "Undo" }));
    expect(spy).not.toHaveBeenCalled();
    expect(state()).toBe(start);
    expect(screen.getByText(/Undone/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });
  it("Undo after Accept reverts the trip", async () => {
    const t = await makeTrip();
    render(<Harness initial={t} scope={{ kind: "trip" }} />);
    fireEvent.click(screen.getByRole("button", { name: /Ask about this trip/ }));
    const start = state();
    fireEvent.click(screen.getByRole("button", { name: "Move something to a quieter day" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(state()).not.toBe(start);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(state()).toBe(start);
    expect(screen.getByText(/Your trip is as it was/)).toBeTruthy();
  });
  it("free text works, and unknown text gets a plain demo reply with no preview", async () => {
    const t = await makeTrip();
    render(<Harness initial={t} scope={{ kind: "day", dayId: t.days[1].id }} />);
    fireEvent.click(screen.getByRole("button", { name: /Ask about this day/ }));
    fireEvent.change(screen.getByLabelText(/message/), { target: { value: "what is the meaning of life" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("what is the meaning of life")).toBeTruthy();
    expect(screen.getByText(DEMO_LABEL)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Proposed change" })).toBeNull();
  });
});
