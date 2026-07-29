"""Step 4 - point a question at a new image. DRAFT ONLY; nothing goes live.

    usage: python 04_replace_image.py <QID> <new IM_ id> [old IM_ id]

    GET  /survey-definitions/{SV}/questions/{QID}   fetch + snapshot
    PUT  /survey-definitions/{SV}/questions/{QID}   same payload, new image ref

For a graphic (GR) question the Graphics field is updated. Otherwise the
src of the <img> tag in QuestionText is rewritten (width/height/style
attributes are preserved). If the question has several <img> tags, pass
the old IM_ id as a third argument to say which one to replace.

The live survey is untouched until you publish (05_publish.py or the
Publish button). To roll back before publishing: PUT the snapshot back,
or simply rerun this script with old and new ids swapped.
"""

import re
import sys

import qualtrics as q

if len(sys.argv) not in (3, 4):
    raise SystemExit(__doc__)
qid, new_im = sys.argv[1], sys.argv[2]
old_im = sys.argv[3] if len(sys.argv) == 4 else None
if not new_im.startswith("IM_"):
    raise SystemExit("Second argument must be an IM_ id (from 03_upload_image.py).")

sv = q.survey_id()
q.require_todays_snapshot("%s_full" % sv)

question = q.get("/survey-definitions/%s/questions/%s" % (sv, qid))
snap = q.snapshot(qid, question)
print("Question snapshot: %s" % snap)

new_src = q.graphic_url(new_im)

if question.get("Graphics"):
    print("Graphic question: Graphics %s -> %s" % (question["Graphics"], new_im))
    question["Graphics"] = new_im
else:
    text = question.get("QuestionText", "") or ""
    tags = re.findall(r"<img\b[^>]*>", text, re.IGNORECASE)
    if not tags:
        raise SystemExit("%s has no Graphics field and no <img> in its QuestionText." % qid)
    if old_im:
        tags = [t for t in tags if old_im in t]
        if not tags:
            raise SystemExit("No <img> tag in %s references %s." % (qid, old_im))
    if len(tags) > 1:
        print("Multiple <img> tags found - rerun with the old IM_ id as a third argument:")
        for t in tags:
            print("  %s" % t)
        raise SystemExit(1)
    tag = tags[0]
    new_tag, n = re.subn(r"""src\s*=\s*["'][^"']*["']""", 'src="%s"' % new_src, tag,
                         count=1, flags=re.IGNORECASE)
    if n == 0:
        raise SystemExit("Could not find a src attribute in: %s" % tag)
    print("Rewriting inline <img>:\n  old: %s\n  new: %s" % (tag, new_tag))
    question["QuestionText"] = text.replace(tag, new_tag, 1)

q.put("/survey-definitions/%s/questions/%s" % (sv, qid), question)

confirmed = q.get("/survey-definitions/%s/questions/%s" % (sv, qid))
blob = (confirmed.get("QuestionText", "") or "") + str(confirmed.get("Graphics", ""))
if new_im in blob:
    print("\nConfirmed: %s now references %s in the DRAFT." % (qid, new_im))
    print("Check it in the survey builder / Preview, then publish when happy.")
else:
    print("\nWARNING: PUT succeeded but re-GET does not show %s - inspect %s" % (new_im, snap))
