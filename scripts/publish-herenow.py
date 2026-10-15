"""Anonymous publish of the static export (.next-export) to here.now (anonymous sites expire after 24h).

Target selection:
  HERENOW_NEW=1                         -> always create a NEW site
  HERENOW_SLUG + HERENOW_CLAIM_TOKEN    -> update that site
  otherwise                             -> update the site recorded in STATE_FILE (outside the repo; holds the
                                           claim token, which must never be committed), else create a new one.
After a successful publish the state file and the human-readable claim file are updated.
"""
import datetime, json, mimetypes, os, random, sys, time, urllib.error, urllib.request

ROOT = sys.argv[1] if len(sys.argv) > 1 else ".next-export"
DEFAULT_SLUG = "nutmeg-mortar-y6rc"  # current Planet site (updated by publish runs); token lives in STATE_FILE
STATE_FILE = os.environ.get("HERENOW_STATE", "/workspace/planet-herenow.json")
CLAIM_FILE = os.environ.get("HERENOW_CLAIM_FILE", "/workspace/planet-herenow-claim.txt")
H = {"X-HereNow-Client": "grokbot/planet", "content-type": "application/json"}
mimetypes.add_type("text/plain", ".txt"); mimetypes.add_type("application/javascript", ".js")

def with_retries(fn, what, attempts=6):
    """Retry transient network failures (SSL EOF, resets, timeouts, 429/5xx) with exponential backoff + jitter."""
    for i in range(attempts):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            if e.code not in (408, 425, 429, 500, 502, 503, 504) or i == attempts - 1: raise
            err = f"HTTP {e.code}"
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
            if i == attempts - 1: raise
            err = repr(getattr(e, "reason", e))
        delay = min(30, 1.5 * 2 ** i) + random.uniform(0, 0.5)
        print(f"  retry {i + 1}/{attempts - 1} for {what} in {delay:.1f}s ({err})", file=sys.stderr)
        time.sleep(delay)

def call(url, body, method="POST"):
    def go():
        r = urllib.request.Request(url, data=json.dumps(body).encode(), headers=H, method=method)
        with urllib.request.urlopen(r, timeout=60) as resp: return json.load(resp)
    return with_retries(go, f"{method} {url}")

def load_state():
    try: return json.load(open(STATE_FILE))
    except (OSError, ValueError): return {}

files = []
for d, _, fs in os.walk(ROOT):
    for f in fs:
        p = os.path.join(d, f); rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        ct = mimetypes.guess_type(p)[0] or "application/octet-stream"
        if ct.startswith("text/") or ct in ("application/javascript", "application/json"): ct += "; charset=utf-8"
        files.append({"path": rel, "size": os.path.getsize(p), "contentType": ct})
ctype = {f["path"]: f["contentType"] for f in files}

state = load_state()
if os.environ.get("HERENOW_NEW") == "1": slug, tok = None, None
else:
    slug = os.environ.get("HERENOW_SLUG") or state.get("slug") or DEFAULT_SLUG
    tok = os.environ.get("HERENOW_CLAIM_TOKEN") or (state.get("claimToken") if slug == state.get("slug") else None)
creating = not (slug and tok)
res = call("https://here.now/api/v1/publish", {"files": files}) if creating else call(f"https://here.now/api/v1/publish/{slug}", {"files": files, "claimToken": tok}, "PUT")
res.setdefault("slug", slug)
up = res["upload"]
uploads = up["uploads"]
for n, u in enumerate(uploads, 1):
    data = open(os.path.join(ROOT, u["path"]), "rb").read()
    hdrs = u.get("headers") or {"Content-Type": ctype[u["path"]]}
    def put(u=u, data=data, hdrs=hdrs):
        with urllib.request.urlopen(urllib.request.Request(u["url"], data=data, headers=hdrs, method=u.get("method", "PUT")), timeout=120) as r: r.read()
    with_retries(put, u["path"])
    if n % 25 == 0 or n == len(uploads): print(f"  uploaded {n}/{len(uploads)}", file=sys.stderr)
fin = call(f"https://here.now/api/v1/publish/{res['slug']}/finalize", {"versionId": up["versionId"]})
out = {k: v for k, v in {**res, **fin}.items() if k != "upload"}
print(json.dumps(out, indent=1))

if creating and out.get("claimToken"):
    new = {"slug": out["slug"], "siteUrl": out.get("siteUrl"), "claimToken": out["claimToken"], "claimUrl": out.get("claimUrl"),
           "expiresAt": out.get("expiresAt"), "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}
    if state.get("slug"): new["previous"] = ([{k: v for k, v in state.items() if k != "previous"}] + state.get("previous", []))[:10]
    json.dump(new, open(STATE_FILE, "w"), indent=1); os.chmod(STATE_FILE, 0o600)
    old = open(CLAIM_FILE).read() if os.path.exists(CLAIM_FILE) else ""
    stamp = datetime.datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z")
    body = (f"# CURRENT (published {stamp})\nslug={new['slug']}\nsiteUrl={new['siteUrl']}\nclaimToken={new['claimToken']}\n"
            f"claimUrl={new['claimUrl']}\nexpires={new['expiresAt']}\n")
    if old.strip():
        prev = old.replace("# CURRENT", "# PREVIOUS", 1) if old.startswith("# CURRENT") else f"# PREVIOUS (superseded {stamp})\n{old.strip()}\n"
        body += "\n" + prev
    open(CLAIM_FILE, "w").write(body)
