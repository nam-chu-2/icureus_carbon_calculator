"""Step 6 - bulk-swap every graphic question to its compressed image. DRAFT ONLY.

    usage: python 06_bulk_swap.py [--dry-run]

Matches each graphic question in the survey to a file in
flight-images/compressed/{short,medium}-haul-pics/ and PUTs the question's
Graphics field to the compressed upload's IM_ id.

Matching:
  - questions whose text names their file (e.g. short-haul_Alabama_Huntsville.png)
    are matched by that name;
  - untitled questions are identified by downloading their current graphic and
    matching its exact byte size against the original PNGs in flight-images/
    (every original has a unique size);
  - blocks whose description contains "Trash" are skipped.

Uploads are cached in uploads.json (filename -> IM_ id) so reruns and
previously uploaded files never upload twice. Questions already pointing
at the right IM_ id are skipped, so the script is safe to rerun.
"""

import json
import os
import re
import sys

import qualtrics as q

DRY_RUN = "--dry-run" in sys.argv
CACHE_PATH = os.path.join(q.HERE, "uploads.json")
FLIGHT_ROOT = os.path.normpath(os.path.join(q.HERE, "..", "flight-images"))
ORIGINAL_DIRS = {
    "short-haul": os.path.join(FLIGHT_ROOT, "short-haul-pics"),
    "medium-haul": os.path.join(FLIGHT_ROOT, "medium-haul-pics"),
}
COMPRESSED_DIRS = {
    "short-haul": os.path.join(FLIGHT_ROOT, "compressed", "short-haul-pics"),
    "medium-haul": os.path.join(FLIGHT_ROOT, "compressed", "medium-haul-pics"),
}
FILENAME_RE = re.compile(r"((?:short|medium)-haul_[A-Za-z_]+)\.(?:png|jpg)")

# Byte size of each original PNG -> its basename. Sizes are verified unique.
size_to_name = {}
for haul, d in ORIGINAL_DIRS.items():
    for f in os.listdir(d):
        if f.endswith(".png"):
            s = os.path.getsize(os.path.join(d, f))
            if s in size_to_name:
                raise SystemExit("Original PNG sizes are not unique (%s vs %s); "
                                 "size matching is unsafe." % (size_to_name[s], f))
            size_to_name[s] = os.path.splitext(f)[0]

sv = q.survey_id()
q.require_todays_snapshot("%s_full" % sv)
defn = q.get("/survey-definitions/%s" % sv)
questions = defn.get("Questions", {})

cache = {}
if os.path.exists(CACHE_PATH):
    with open(CACHE_PATH, encoding="utf-8") as f:
        cache = json.load(f)
known_new_ims = set(cache.values())


def identify_by_download(im_id):
    """Fetch the graphic and identify the original PNG by exact byte size."""
    resp = q._session.get(q.graphic_url(im_id))
    return size_to_name.get(len(resp.content))


# ---- 1. Resolve QID -> compressed basename ----------------------------------
mapping = {}
unresolved = []
for block in defn.get("Blocks", {}).values():
    if "trash" in (block.get("Description", "") or "").lower():
        continue
    for el in block.get("BlockElements", []):
        qid = el.get("QuestionID", "")
        question = questions.get(qid, {})
        if el.get("Type") != "Question" or not question.get("Graphics"):
            continue
        if question["Graphics"] in known_new_ims:
            mapping[qid] = None  # already on a compressed upload
            continue
        m = FILENAME_RE.search(question.get("QuestionText", "") or "")
        name = m.group(1) if m else identify_by_download(question["Graphics"])
        if name:
            mapping[qid] = name
        else:
            unresolved.append(qid)

todo = {k: v for k, v in mapping.items() if v}
print("Resolved %d question(s) to swap; %d already swapped; %d unresolved%s\n"
      % (len(todo), len(mapping) - len(todo), len(unresolved),
         " -> " + ", ".join(unresolved) if unresolved else ""))

# ---- 2. Upload every needed file not already in the cache -------------------
needed = sorted(set(todo.values()))
to_upload = [n for n in needed if (n + ".jpg") not in cache]
print("Uploading %d file(s) (%d already in library)..."
      % (len(to_upload), len(needed) - len(to_upload)))
if not DRY_RUN:
    lib = q.library_id()
    for n in to_upload:
        path = os.path.join(COMPRESSED_DIRS[n.split("_")[0]], n + ".jpg")
        cache[n + ".jpg"] = q.upload_graphic(lib, path)
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        print("  uploaded %s -> %s" % (n, cache[n + ".jpg"]))

# ---- 3. Swap each question in the draft -------------------------------------
swapped = skipped = failed = 0
for qid in sorted(todo, key=lambda x: int(x[3:])):
    target = cache.get(todo[qid] + ".jpg")
    if not target:
        continue  # dry run without upload
    if questions[qid].get("Graphics") == target:
        skipped += 1
        continue
    if DRY_RUN:
        print("would swap %s -> %s (%s)" % (qid, target, todo[qid]))
        swapped += 1
        continue
    payload = q.get("/survey-definitions/%s/questions/%s" % (sv, qid))
    payload["Graphics"] = target
    q.put("/survey-definitions/%s/questions/%s" % (sv, qid), payload)
    check = q.get("/survey-definitions/%s/questions/%s" % (sv, qid))
    if check.get("Graphics") == target:
        swapped += 1
        print("swapped %s -> %s (%s)" % (qid, target, todo[qid]))
    else:
        failed += 1
        print("FAILED  %s (Graphics is %s)" % (qid, check.get("Graphics")))

print("\nSummary: %d swapped, %d already correct, %d failed, %d unresolved%s"
      % (swapped, skipped, failed, len(unresolved), " (DRY RUN)" if DRY_RUN else ""))
print("All changes are in the DRAFT - verify in Preview, then publish (05_publish.py).")
