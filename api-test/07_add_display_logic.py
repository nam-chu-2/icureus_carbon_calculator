"""Step 7 - add display logic to every image in the short/medium haul blocks.

    usage: python 07_add_display_logic.py            # dry run, writes nothing
           python 07_add_display_logic.py --apply    # writes to the DRAFT

    GET  /survey-definitions/{SV}                  full definition (to plan)
    GET  /survey-definitions/{SV}/questions/{QID}  fetch + snapshot
    PUT  /survey-definitions/{SV}/questions/{QID}  same payload, + DisplayLogic

Each image is a per-region graphic (e.g. short-haul_Alabama_Huntsville).
It should be shown only to a respondent who lives in that region AND flies
this year, which is the pattern already set on the alabama-short question:

    If  <state OR province question> = <that region>  Is Selected
    And <"have you traveled / expect to travel by airplane"> = "I have flown
        or plan to fly in 2026."  Is Selected

The region for each image comes from its own filename (via uploads.json,
falling back to QuestionDescription), and is matched to a choice of either
the "4-state" or the "4-province" question by name. Choice ids are read
live from those questions, so the logic can never point at a stale id.

The live survey is untouched until you publish (05_publish.py or the
Publish button). To roll back before publishing, PUT the per-question
snapshots in snapshots/ back.
"""

import json
import os
import re
import sys

import qualtrics as q

APPLY = "--apply" in sys.argv[1:]

BLOCK_NAMES = ("short haul", "medium haul")
STATE_TAG = "4-state"
PROV_TAG = "4-province"
GATE_TAG = "17"
GATE_CHOICE_TEXT = "I have flown or plan to fly in 2026."

STATE_DESC = "In which state / U.S. territory do you currently live? "
PROV_DESC = "In which province / territory do you currently live? "
GATE_DESC = ("During 2026, have you traveled or do you expect to travel by "
             "airplane for personal reasons (not f...")

HERE = os.path.dirname(os.path.abspath(__file__))


def norm(name):
    """'U.S. Virgin Islands' -> 'us_virgin_islands' (for filename matching)."""
    name = name.replace(".", "").replace("'", "").strip()
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").lower()


def condition(src_qid, choice_id, question_desc, choice_desc, conjunction=None):
    """One row of a Qualtrics display-logic expression."""
    locator = "q://%s/SelectableChoice/%s" % (src_qid, choice_id)
    conj_word = conjunction or "If"
    row = {
        "LogicType": "Question",
        "QuestionID": src_qid,
        "QuestionIsInLoop": "no",
        "ChoiceLocator": locator,
        "Operator": "Selected",
        "QuestionIDFromLocator": src_qid,
        "LeftOperand": locator,
        "Type": "Expression",
        "Description": ('<span class="ConjDesc">%s</span> '
                        '<span class="QuestionDesc">%s</span> '
                        '<span class="LeftOpDesc">%s</span> '
                        '<span class="OpDesc">Is Selected</span> '
                        % (conj_word, question_desc, choice_desc)),
    }
    if conjunction:
        row["Conjuction"] = conjunction  # Qualtrics' own spelling
    return row


sv = q.survey_id()
defn = q.get("/survey-definitions/%s" % sv)
q.snapshot("%s_full" % sv, defn)
questions = defn["Questions"]
blocks = defn["Blocks"]


def by_tag(tag):
    hits = [qid for qid, item in questions.items()
            if item.get("DataExportTag") == tag]
    if len(hits) != 1:
        sys.exit("Expected exactly one question tagged %r, found %s" % (tag, hits))
    return hits[0]


state_q, prov_q, gate_q = by_tag(STATE_TAG), by_tag(PROV_TAG), by_tag(GATE_TAG)

gate_choices = [cid for cid, c in questions[gate_q]["Choices"].items()
                if c["Display"].strip() == GATE_CHOICE_TEXT]
if len(gate_choices) != 1:
    sys.exit("Could not find the choice %r on %s (tag %r)."
             % (GATE_CHOICE_TEXT, gate_q, GATE_TAG))
gate_choice = gate_choices[0]

# region name -> (source question, choice id, display text)
regions = {}
for src_qid, src_desc in ((state_q, STATE_DESC), (prov_q, PROV_DESC)):
    for cid, choice in questions[src_qid]["Choices"].items():
        regions[norm(choice["Display"])] = (src_qid, cid, choice["Display"], src_desc)

uploads_path = os.path.join(HERE, "uploads.json")
by_im = {}
if os.path.exists(uploads_path):
    with open(uploads_path, encoding="utf-8") as f:
        by_im = {im: name for name, im in json.load(f).items()}


def resolve(filename):
    """'short-haul_New_York_New_York_City.jpg' -> the New York choice."""
    stem = re.sub(r"\.(jpg|jpeg|png|gif)$", "", filename, flags=re.IGNORECASE)
    stem = re.sub(r"^(short|medium|long)-haul[_-]", "", stem, flags=re.IGNORECASE)
    stem = norm(stem)
    best = None
    for key, value in regions.items():
        # longest region name that the filename starts with wins, so that
        # e.g. "New York" beats nothing and "Virginia" never eats "West Virginia"
        if stem == key or stem.startswith(key + "_"):
            if best is None or len(key) > len(best[0]):
                best = (key, value)
    return best[1] if best else None


plan, unresolved = [], []
for name in BLOCK_NAMES:
    hits = [bid for bid, b in blocks.items() if b.get("Description") == name]
    if len(hits) != 1:
        sys.exit("Expected exactly one block named %r, found %s" % (name, hits))
    bid = hits[0]
    for element in blocks[bid]["BlockElements"]:
        if element.get("Type") != "Question":
            continue
        qid = element["QuestionID"]
        item = questions[qid]
        if not item.get("Graphics"):
            continue  # only the images; leave text/MC questions in the block alone
        filename = by_im.get(item["Graphics"]) or item.get("QuestionDescription") or ""
        region = resolve(filename)
        if not region:
            unresolved.append((name, qid, filename))
            continue
        src_qid, choice_id, display, src_desc = region
        plan.append({
            "block": name, "qid": qid, "tag": item.get("DataExportTag"),
            "file": filename, "display": display,
            "logic": {
                "0": {
                    "0": condition(src_qid, choice_id, src_desc, display),
                    "1": condition(gate_q, gate_choice, GATE_DESC,
                                   GATE_CHOICE_TEXT, conjunction="And"),
                    "Type": "If",
                },
                "Type": "BooleanExpression",
                "inPage": False,
            },
        })

if unresolved:
    print("Could not match a region for these images - nothing will be written:")
    for block, qid, filename in unresolved:
        print("  [%s] %s  %s" % (block, qid, filename or "(no filename)"))
    sys.exit(1)

print("Survey: %s  (%s)" % (defn.get("SurveyName", "?"), sv))
print("Source questions: state=%s  province=%s  gate=%s (choice %s)\n"
      % (state_q, prov_q, gate_q, gate_choice))
for row in plan:
    print("  [%-11s] %-18s %-25s -> %s"
          % (row["block"], row["qid"], row["tag"], row["display"]))
print("\n%d question(s) to update." % len(plan))

if not APPLY:
    print("\nDry run - nothing written. Rerun with --apply to write to the DRAFT.")
    sys.exit(0)

q.require_todays_snapshot("%s_full" % sv)
print("\nWriting to the draft...")
written = 0
for row in plan:
    path = "/survey-definitions/%s/questions/%s" % (sv, row["qid"])
    question = q.get(path)
    q.snapshot(row["qid"], question)
    question["DisplayLogic"] = row["logic"]
    q.put(path, question)
    written += 1
    print("  %3d/%d  %s  %s" % (written, len(plan), row["qid"], row["display"]))

print("\nDone - %d question(s) updated in the DRAFT." % written)
print("Check the survey builder / Preview, then publish with 05_publish.py.")
