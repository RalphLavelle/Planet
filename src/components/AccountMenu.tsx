"use client";
import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { getServices } from "@/services/container";
import type { AuthUser } from "@/auth/types";
import { MIN_PASSWORD_LENGTH } from "@/auth/validation";

type Mode = "signin" | "signup" | "reset" | "newpassword";

/** Small account control for the top bar. Renders nothing when Supabase isn't configured (localStorage-only build). */
export function AccountMenu() {
  const [account, setAccount] = useState<ReturnType<typeof getServices>["account"]>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [needsForce, setNeedsForce] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = getServices().account;
    setAccount(a);
    if (!a) return;
    // Arriving from a password-reset email: show the "new password" form.
    if (typeof window !== "undefined" && /type=recovery/.test(window.location.hash)) { setMode("newpassword"); setOpen(true); }
    let alive = true;
    a.getUser().then((u) => { if (alive) setUser(u); }).catch(() => { if (alive) setUser(null); });
    const off = a.onChange((u, ev) => {
      if (!alive) return;
      setUser(u);
      if (ev === "password_recovery") { setMode("newpassword"); setOpen(true); }
    });
    return () => { alive = false; off(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  if (!account) return null;

  const signedIn = !!user && !user.isAnonymous && !!user.email;
  const reset = (m: Mode) => { setMode(m); setError(""); setInfo(""); setPassword(""); setNeedsForce(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || busy) return;
    setBusy(true); setError(""); setInfo("");
    try {
      if (mode === "signin") {
        const r = await account.signIn(email, password);
        if (!r.ok) setError(r.error);
        else {
          setPassword(""); setOpen(false);
          if (r.syncError) setInfo("Signed in, but your trips couldn't be synced yet. They'll sync when you're back online.");
        }
      } else if (mode === "signup") {
        const r = await account.signUp(email, password);
        if (!r.ok) setError(r.error);
        else { setPassword(""); setInfo(r.needsConfirmation ? `We emailed a confirmation link to ${email.trim()}. Open it to finish creating your account. Your trips stay as they are, and will be saved to it.` : "Account created."); }
      } else if (mode === "reset") {
        const r = await account.sendPasswordReset(email);
        if (!r.ok) setError(r.error); else setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
      } else {
        const r = await account.setPassword(password);
        if (!r.ok) setError(r.error); else { setPassword(""); setInfo("Password updated."); setMode("signin"); if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search); }
      }
    } finally { setBusy(false); }
  }

  async function signOut(force = false) {
    if (!account) return;
    setBusy(true); setError("");
    const r = await account.signOut(force);
    setBusy(false);
    if (!r.ok) { setError(r.error); setNeedsForce(!!r.needsForce); } else { setOpen(false); setNeedsForce(false); }
  }

  const title = mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Choose a new password";
  const needEmail = mode !== "newpassword";
  const needPassword = mode !== "reset";

  return (
    <div className="account" ref={root}>
      <button type="button" className="btn btn-ghost btn-small account-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <UserIcon size={16} aria-hidden="true" />
        <span className="account-btn-label">{signedIn ? user!.email : "Sign in"}</span>
      </button>
      {open && (
        <div className="account-panel" role="dialog" aria-label="Account">
          {signedIn && mode !== "newpassword" ? (
            <div className="account-body">
              <p className="account-who">Signed in as <strong>{user!.email}</strong></p>
              <p className="muted account-note">Your trips sync across every device where you sign in.</p>
              {error && <p className="err" role="alert">{error}</p>}
              <div className="row">
                <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => signOut(false)}><LogOut size={16} aria-hidden="true" /> {busy ? "Signing out…" : "Sign out"}</button>
                {needsForce && <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => signOut(true)}>Sign out anyway</button>}
              </div>
            </div>
          ) : (
            <form className="account-body" onSubmit={submit} noValidate>
              <h2 className="account-title">{title}</h2>
              {mode === "signin" && <p className="muted account-note">Sign in on this device to bring your saved trips here. Trips you have on this device are added to your account.</p>}
              {mode === "signup" && <p className="muted account-note">Saves the trips on this device to your account so you can open them on your phone and laptop.</p>}
              {user?.isAnonymous && user.pendingEmail && mode !== "newpassword" && <p className="notice account-pending" role="status">Waiting for you to confirm {user.pendingEmail}. Check your inbox.</p>}
              {needEmail && (
                <div className="field"><label htmlFor="acc-email">Email</label>
                  <input id="acc-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              )}
              {needPassword && (
                <div className="field"><label htmlFor="acc-pw">{mode === "newpassword" ? "New password" : "Password"}</label>
                  <input id="acc-pw" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "signin" ? undefined : MIN_PASSWORD_LENGTH} required />
                  {mode !== "signin" && <p className="muted account-note">At least {MIN_PASSWORD_LENGTH} characters.</p>}</div>
              )}
              {error && <p className="err" role="alert">{error}</p>}
              {info && <p className="notice" role="status">{info}</p>}
              <div className="row">
                <button type="submit" className="btn btn-small" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "reset" ? "Email me a link" : "Save password"}</button>
              </div>
              <p className="account-switch">
                {mode === "signin" && <><button type="button" className="linklike" onClick={() => reset("signup")}>Create an account</button> · <button type="button" className="linklike" onClick={() => reset("reset")}>Forgot password?</button></>}
                {mode === "signup" && <>Already have an account? <button type="button" className="linklike" onClick={() => reset("signin")}>Sign in</button></>}
                {mode === "reset" && <button type="button" className="linklike" onClick={() => reset("signin")}>Back to sign in</button>}
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
