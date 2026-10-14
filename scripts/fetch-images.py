"""Download freely licensed lead images from Wikipedia/Wikimedia Commons into public/images/places
and write src/services/itinerary/imageCredits.json (author, license, source URL). Re-run to refresh."""
import json, os, re, sys, time, urllib.parse, urllib.request
UA = {"User-Agent": "PlanetTravelMVP/0.1 (local demo; ralph@ralphlavelle.net)"}
OUT = "public/images/places"; os.makedirs(OUT, exist_ok=True)
ARTICLES = {
 "athens:hero": "Acropolis of Athens", "athens:acropolis": "Parthenon", "athens:acropolis-museum": "Acropolis Museum",
 "athens:ancient-agora": "Temple of Hephaestus", "athens:plaka": "Anafiotika", "athens:national-archaeological": "National Archaeological Museum, Athens",
 "athens:lycabettus": "Mount Lycabettus", "athens:philopappos": "Philopappos Monument", "athens:temple-zeus": "Temple of Olympian Zeus, Athens",
 "athens:panathenaic": "Panathenaic Stadium", "athens:national-garden": "National Garden, Athens", "athens:benaki": "Benaki Museum",
 "athens:cycladic": "Cycladic art", "athens:monastiraki": "Monastiraki", "athens:varvakios": "Athens Central Market",
 "athens:psyrri": "Meze", "athens:souvlaki": "Souvlaki", "athens:koukaki": "Moussaka", "athens:rooftop": "Plaka",
 "athens:gazi": "Gazi, Athens", "athens:cape-sounion": "Temple of Poseidon, Sounion",
 "rome:hero": "Colosseum", "rome:colosseum": "Colosseum", "rome:vatican": "Sistine Chapel ceiling", "rome:pantheon": "Pantheon, Rome",
 "rome:trastevere": "Trastevere", "rome:campo": "Campo de' Fiori", "rome:borghese": "Galleria Borghese", "rome:trevi": "Trevi Fountain", "rome:aperitivo": "Monti (rione of Rome)",
 "paris:hero": "Eiffel Tower", "paris:louvre": "Louvre", "paris:orsay": "Orsay Museum", "paris:marais": "Le Marais", "paris:eiffel": "Eiffel Tower",
 "paris:bistro": "Bistro", "paris:marche": "Marché des Enfants Rouges", "paris:montmartre": "Sacré-Cœur, Paris", "paris:luxembourg": "Jardin du Luxembourg",
 "istanbul:hero": "Hagia Sophia", "istanbul:hagia-sophia": "Hagia Sophia", "istanbul:topkapi": "Topkapı Palace", "istanbul:blue-mosque": "Sultan Ahmed Mosque",
 "istanbul:bazaar": "Grand Bazaar, Istanbul", "istanbul:ferry": "Bosphorus", "istanbul:kadikoy": "Kadıköy", "istanbul:karakoy": "Meyhane", "istanbul:galata": "Galata Tower",
 "tokyo:hero": "Tokyo Skytree", "tokyo:sensoji": "Sensō-ji", "tokyo:meiji": "Meiji Shrine", "tokyo:teamlab": "TeamLab", "tokyo:tsukiji": "Tsukiji fish market",
 "tokyo:izakaya": "Izakaya", "tokyo:shibuya": "Shibuya Crossing", "tokyo:nakameguro": "Nakameguro", "tokyo:golden-gai": "Golden Gai",
}
FREE = re.compile(r"^(CC BY|CC0|Public domain|PD|CC-BY|Attribution)", re.I)
def get(url): return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
strip = lambda h: re.sub(r"<[^>]+>", "", h or "").strip()
GALLERY = {
 "athens": ["Erechtheion", "Odeon of Herodes Atticus", "Evzones", "Kerameikos"],
 "istanbul": ["Simit", "Turkish tea", "İznik pottery", "Maiden's Tower", "Basilica Cistern", "Süleymaniye Mosque", "Ortaköy Mosque"],
 "rome": ["Roman Forum", "Piazza Navona", "St. Peter's Basilica", "Castel Sant'Angelo", "Spanish Steps"],
 "paris": ["Notre-Dame de Paris", "Arc de Triomphe", "Pont Alexandre III", "Croissant", "Palais Garnier"],
 "tokyo": ["Tokyo Tower", "Mount Fuji", "Kaminarimon", "Ramen", "Shinjuku"],
}
for dest, titles in GALLERY.items():
    for t in titles: ARTICLES[f"{dest}:gallery-{re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')}"] = t
# Incremental: keep existing entries (including hand-picked replacements) and only fetch new keys.
try: credits = json.load(open("src/services/itinerary/imageCredits.json"))
except Exception: credits = {}
for key, title in ARTICLES.items():
    if key in credits: continue
    try:
        q = get("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": title, "prop": "pageimages", "piprop": "name", "format": "json", "redirects": 1}))
        page = next(iter(q["query"]["pages"].values())); fname = page.get("pageimage")
        if not fname: print("no image", key); continue
        ii = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": "File:" + fname, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 800, "format": "json"}))
        p2 = next(iter(ii["query"]["pages"].values()))
        if "imageinfo" not in p2: print("not on commons", key, fname); continue
        info = p2["imageinfo"][0]; md = info["extmetadata"]
        lic = strip(md.get("LicenseShortName", {}).get("value"))
        if not FREE.match(lic): print("skip license", key, lic); continue
        ext = os.path.splitext(info["thumburl"].split("?")[0])[1].lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"): ext = ".jpg"
        path = f"{OUT}/{key.replace(':', '-')}{ext}"
        open(path, "wb").write(urllib.request.urlopen(urllib.request.Request(info["thumburl"], headers=UA), timeout=60).read())
        credits[key] = {"src": "/" + path.removeprefix("public/"), "title": fname, "author": strip(md.get("Artist", {}).get("value"))[:120] or "Unknown",
                        "license": lic, "licenseUrl": md.get("LicenseUrl", {}).get("value", ""), "sourceUrl": info["descriptionurl"]}
        print("ok", key, lic); time.sleep(0.3)
    except Exception as e: print("err", key, e)
json.dump(credits, open("src/services/itinerary/imageCredits.json", "w"), indent=1, ensure_ascii=False)
print(len(credits), "images")

# Optimise: re-encode everything as ~720px JPEG to keep the bundle small.
from PIL import Image
for k, c in credits.items():
    src = "public" + c["src"]
    if src.endswith(".jpg") and os.path.getsize(src) < 400_000 and Image.open(src).width <= 720: continue
    dst = os.path.splitext(src)[0] + ".jpg"
    im = Image.open(src).convert("RGB"); im.thumbnail((720, 720)); im.save(dst + ".tmp", "JPEG", quality=72, optimize=True, progressive=True)
    if src != dst: os.remove(src)
    os.replace(dst + ".tmp", dst); c["src"] = dst.removeprefix("public")
json.dump(credits, open("src/services/itinerary/imageCredits.json", "w"), indent=1, ensure_ascii=False)
