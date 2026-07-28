"""Step 5 - publish the draft so respondents see the changes. Prompts first.

    POST /survey-definitions/{SV}/versions   {"Description": ..., "Published": true}

Everything scripts 03/04 did lives only in the survey DRAFT (what you see
in the builder and Preview). Respondents keep getting the last published
version until this runs - or until you click Publish in the builder,
which does the same thing.
"""

import sys

import qualtrics as q

sv = q.survey_id()
description = " ".join(sys.argv[1:]) or "api-test image update"

defn = q.get("/survey-definitions/%s" % sv)
print("Survey : %s  (%s)" % (defn.get("SurveyName", "?"), sv))
print("Version description: %r" % description)

answer = input("Publish the current draft to the LIVE survey? [y/N] ").strip().lower()
if answer != "y":
    raise SystemExit("Not published.")

result = q.post("/survey-definitions/%s/versions" % sv,
                {"Description": description, "Published": True})
print("Published. Version: %s" % result.get("metadata", result))
