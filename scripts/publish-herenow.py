"""Anonymous publish of the static export (.next-export) to here.now (expires after 24h)."""
import json, mimetypes, os, sys, urllib.request
ROOT = sys.argv[1] if len(sys.argv) > 1 else ".next-export"
H = {"X-HereNow-Client": "grokbot/planet", "content-type": "application/json"}
mimetypes.add_type("text/plain", ".txt"); mimetypes.add_type("application/javascript", ".js")
files = []
for d, _, fs in os.walk(ROOT):
    for f in fs:
        p = os.path.join(d, f); rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        ct = mimetypes.guess_type(p)[0] or "application/octet-stream"
        if ct.startswith("text/") or ct in ("application/javascript", "application/json"): ct += "; charset=utf-8"
        files.append({"path": rel, "size": os.path.getsize(p), "contentType": ct})
def call(url, body, method="POST"):
    r = urllib.request.Request(url, data=json.dumps(body).encode(), headers=H, method=method)
    return json.load(urllib.request.urlopen(r))
# Update an existing anonymous site if HERENOW_SLUG + HERENOW_CLAIM_TOKEN are set; otherwise create a new one.
slug, tok = os.environ.get("HERENOW_SLUG"), os.environ.get("HERENOW_CLAIM_TOKEN")
res = call(f"https://here.now/api/v1/publish/{slug}", {"files": files, "claimToken": tok}, "PUT") if slug and tok else call("https://here.now/api/v1/publish", {"files": files})
res.setdefault("slug", slug)
up = res["upload"]
for u in up["uploads"]:
    data = open(os.path.join(ROOT, u["path"]), "rb").read()
    hdrs = u.get("headers") or {"Content-Type": next(f["contentType"] for f in files if f["path"] == u["path"])}
    urllib.request.urlopen(urllib.request.Request(u["url"], data=data, headers=hdrs, method=u.get("method", "PUT")))
fin = call(f"https://here.now/api/v1/publish/{res['slug']}/finalize", {"versionId": up["versionId"]})
print(json.dumps({k: v for k, v in {**res, **fin}.items() if k not in ("upload",)}, indent=1))
