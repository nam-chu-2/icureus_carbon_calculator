"""Step 2 - snapshot the survey and list every image it contains.

    GET /survey-definitions/{SV}   full draft definition -> snapshots/ (backup)

Then scans each question for images in the two places Qualtrics puts them:
  - <img> tags inside QuestionText (rich text / descriptive text)
  - the Graphics field of graphic-type (GR) questions
"""

import re

import qualtrics as q

IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
SRC_ATTR = re.compile(r"""src\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
IM_ID = re.compile(r"(IM_[A-Za-z0-9]+)")

sv = q.survey_id()
defn = q.get("/survey-definitions/%s" % sv)
path = q.snapshot("%s_full" % sv, defn)
print("Survey: %s  (%s)" % (defn.get("SurveyName", "?"), sv))
print("Backup written: %s\n" % path)

questions = defn.get("Questions", {})
found = 0
for qid in sorted(questions):
    question = questions[qid]
    label = re.sub(r"<[^>]+>", " ", question.get("QuestionText", "") or "")
    label = " ".join(label.split())[:60]

    graphics_field = question.get("Graphics")
    if graphics_field:
        found += 1
        print("%s  [graphic question]  Graphics = %s" % (qid, graphics_field))
        print("      text: %s" % label)

    for tag in IMG_TAG.findall(question.get("QuestionText", "") or ""):
        found += 1
        src = SRC_ATTR.search(tag)
        src = src.group(1) if src else "(no src)"
        im = IM_ID.search(src)
        print("%s  [inline <img>]  %s" % (qid, im.group(1) if im else src))
        print("      src : %s" % src)
        print("      text: %s" % label)

if not found:
    print("No images found in any question of this survey.")
else:
    print("\n%d image reference(s) found. To replace one:" % found)
    print("  1. drop the new file in api-test/images/ and run 03_upload_image.py")
    print("  2. run:  python 04_replace_image.py <QID> <new IM_ id>")
