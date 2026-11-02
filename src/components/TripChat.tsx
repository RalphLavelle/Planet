"use client";
import { useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import type { Trip } from "@/domain/schemas";
import { applyChange, DEMO_LABEL, demoReply, PROMPTS, type ChatScope, type Proposal } from "@/services/chat/demoChat";
import { restoreTrip } from "@/services/editing";
import { Collapsible } from "./Collapsible";

/** pending: preview shown, trip untouched. accepted: trip changed. undone: dismissed, or reverted after accepting. */
type Status = "pending" | "accepted" | "undone";
interface Msg { id: number; from: "you" | "demo"; text: string; proposal?: Proposal; status?: Status; before?: Trip; acceptedAt?: string; note?: string }

/**
 * DEMO chat for tweaking a trip. Replies are scripted (see services/chat/demoChat) and labelled "Demo reply".
 * A proposed change is only a preview until Accept; Undo dismisses it, or reverts it after Accept.
 */
export function TripChat({ trip, scope, onChange }: { trip: Trip; scope: ChatScope; onChange: (next: Trip, label: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const seq = useRef(0);
  const isDay = scope.kind === "day";
  const patch = (id: number, p: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));

  function send(message: string) {
    const q = message.trim();
    if (!q) return;
    const r = demoReply(trip, scope, q);
    setMsgs((m) => [...m, { id: ++seq.current, from: "you", text: q }, { id: ++seq.current, from: "demo", text: r.text, proposal: r.proposal, status: r.proposal ? "pending" : undefined }]);
    setText("");
  }

  function accept(m: Msg) {
    try {
      const next = applyChange(trip, m.proposal!.change);
      onChange(next, "Chat change applied");
      patch(m.id, { status: "accepted", before: trip, acceptedAt: next.updatedAt, note: undefined });
    } catch (e) { patch(m.id, { note: e instanceof Error ? e.message : "Could not apply that." }); }
  }

  function undo(m: Msg) {
    if (m.status === "pending") return patch(m.id, { status: "undone", note: undefined });
    if (trip.updatedAt !== m.acceptedAt) return patch(m.id, { note: "The trip has changed since. Undo it by editing the item." });
    onChange(restoreTrip(m.before!, trip), "Chat change undone");
    patch(m.id, { status: "undone", note: undefined });
  }

  const title = isDay ? "Ask about this day" : "Ask about this trip";
  return (
    <Collapsible id={isDay ? `chat-${scope.dayId}` : "chat"} level={isDay ? 4 : 3} variant={isDay ? "inline" : "panel"} className="chat-panel"
      icon={<MessageCircle size={18} />} title={title} summary="Demo · scripted replies">
      <div className="chat">
        <p className="chat-note">Demo only. No real AI yet. Replies are scripted.</p>
        {msgs.length > 0 && (
          <ol className="chat-log" aria-live="polite" aria-label="Chat">
            {msgs.map((m) => (
              <li key={m.id} className={`chat-msg chat-${m.from}`}>
                {m.from === "demo" && <span className="chat-tag">{DEMO_LABEL}</span>}
                <p>{m.text}</p>
                {m.proposal && (
                  <div className="chat-preview" role="group" aria-label="Proposed change">
                    <p className="chat-preview-title">Preview</p>
                    <p>{m.proposal.summary}</p>
                    <p className="chat-state" role="status">
                      {m.status === "pending" ? "Nothing has changed yet." : m.status === "accepted" ? "Accepted. Your trip is updated." : "Undone. Your trip is as it was."}
                    </p>
                    {m.note && <p className="err" role="alert">{m.note}</p>}
                    {m.status !== "undone" && (
                      <div className="row">
                        <button type="button" className="btn btn-small" onClick={() => accept(m)} disabled={m.status === "accepted"}>Accept</button>
                        <button type="button" className="btn btn-small btn-ghost" onClick={() => undo(m)}>Undo</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="chat-chips">
          {PROMPTS[scope.kind].map((p) => <button key={p} type="button" className="chip" onClick={() => send(p)}>{p}</button>)}
        </div>
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask for a change" aria-label={`${title}: message`} maxLength={200} />
          <button className="btn btn-small" aria-label="Send"><Send size={14} aria-hidden="true" /> Send</button>
        </form>
      </div>
    </Collapsible>
  );
}
