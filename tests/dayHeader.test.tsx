// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Collapsible } from "@/components/Collapsible";
import { DayHeader } from "@/components/DayHeader";
import type { Trip } from "@/domain/schemas";
import { nextOpenId, toggleDay } from "@/lib/accordion";
import { makeTrip } from "./helpers";

afterEach(cleanup);
const noop = () => {};

describe("DayHeader: the whole header is one disclosure button", () => {
  it("renders a button with aria-expanded/aria-controls whose label is the day title; tapping calls onToggle", async () => {
    const trip = await makeTrip(); const day = trip.days[0]; const onToggle = vi.fn();
    const { rerender } = render(<DayHeader day={day} index={0} title="Arrival & first look" collapsed={false} onToggle={onToggle} onRename={noop} onReset={noop} />);
    const btn = screen.getByRole("button", { name: /Day 1: Arrival & first look/ });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("aria-controls")).toBe(`day-body-${day.id}`);
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<DayHeader day={day} index={0} title="Arrival & first look" collapsed onToggle={onToggle} onRename={noop} onReset={noop} />);
    expect(screen.getByRole("button", { name: /Day 1:/ }).getAttribute("aria-expanded")).toBe("false");
  });

  it("the rename control is a separate button and does not toggle the day", async () => {
    const trip = await makeTrip(); const onToggle = vi.fn();
    render(<DayHeader day={trip.days[0]} index={0} title="T" collapsed={false} onToggle={onToggle} onRename={noop} onReset={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename day 1" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Day 1 title")).toBeTruthy(); // the title editor replaced the toggle
  });

  it("read-only headers still toggle but offer no rename", async () => {
    const trip = await makeTrip(); const onToggle = vi.fn();
    render(<DayHeader day={trip.days[0]} index={0} title="T" collapsed readOnly onToggle={onToggle} onRename={noop} onReset={noop} />);
    expect(screen.queryByRole("button", { name: /Rename/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Day 1:/ }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("is a collapsed summary (stops + thumbnails) only while collapsed", async () => {
    const trip = await makeTrip(); const day = trip.days[0];
    const { container, rerender } = render(<DayHeader day={day} index={0} title="T" collapsed onToggle={noop} onRename={noop} onReset={noop} />);
    expect(container.querySelector(".day-summary")?.textContent).toMatch(new RegExp(`${day.activities.length} stops?`));
    rerender(<DayHeader day={day} index={0} title="T" collapsed={false} onToggle={noop} onRename={noop} onReset={noop} />);
    expect(container.querySelector(".day-summary")).toBeNull();
  });
});

/** The same wiring TripGuide uses: collapsed-id list + toggleDay. */
function GuideHarness({ trip }: { trip: Trip }) {
  const all = trip.days.map((d) => d.id);
  const [collapsed, setCollapsed] = useState(all.slice(1));
  return <>{trip.days.map((d, i) => <DayHeader key={d.id} day={d} index={i} title={`Day ${i + 1} title`} collapsed={collapsed.includes(d.id)} onToggle={() => setCollapsed(toggleDay(all, collapsed, d.id))} onRename={noop} onReset={noop} />)}</>;
}
const expandedCount = () => screen.getAllByRole("button", { name: /^Day \d+:/ }).filter((b) => b.getAttribute("aria-expanded") === "true").length;

describe("accordion behaviour through the day headers", () => {
  it("opening one day collapses the others; tapping the open day closes it", async () => {
    const trip = await makeTrip();
    render(<GuideHarness trip={trip} />);
    const btn = (n: number) => screen.getByRole("button", { name: new RegExp(`^Day ${n}:`) });
    expect(expandedCount()).toBe(1);
    expect(btn(1).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn(3));
    expect(btn(3).getAttribute("aria-expanded")).toBe("true");
    expect(btn(1).getAttribute("aria-expanded")).toBe("false");
    expect(expandedCount()).toBe(1);
    fireEvent.click(btn(2));
    expect(btn(2).getAttribute("aria-expanded")).toBe("true");
    expect(btn(3).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn(2));
    expect(expandedCount()).toBe(0);
  });
});

function DraftHarness({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(ids[0]);
  return <>{ids.map((id) => <Collapsible key={id} id={id} level={3} open={open === id} onOpenChange={(o) => setOpen((cur) => nextOpenId(cur, id, o))} title={`Day ${id}`}><p>{`body ${id}`}</p></Collapsible>)}</>;
}

describe("accordion behaviour in the wizard's draft days (controlled Collapsible)", () => {
  it("opening one day collapses the others", () => {
    render(<DraftHarness ids={["a", "b", "c"]} />);
    const trig = (id: string) => screen.getByRole("button", { name: `Day ${id}` });
    expect(trig("a").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(trig("b"));
    expect(trig("b").getAttribute("aria-expanded")).toBe("true");
    expect(trig("a").getAttribute("aria-expanded")).toBe("false");
    expect(trig("c").getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trig("b"));
    expect(["a", "b", "c"].every((id) => trig(id).getAttribute("aria-expanded") === "false")).toBe(true);
  });
});
