"""Step 1 - verify the token, list your surveys, find your graphics library.

    GET /whoami        proves the token + datacenter are right
    GET /surveys       lists surveys so you can pick the SV_ id for .env
    GET /libraries     finds your personal library (UR_...) for image uploads
                       and saves it to api-test/library_id.txt
"""

import qualtrics as q

me = q.get("/whoami")
print("Token OK - logged in as %s %s (%s)" % (
    me.get("firstName", ""), me.get("lastName", ""), me.get("userId", "?")))
print("Brand: %s   Datacenter: %s\n" % (me.get("brandId", "?"), q.DATACENTER))

print("Your surveys (put the one to modify in .env as QUALTRICS_SURVEY_ID):")
surveys = q.get_paginated("/surveys")
if not surveys:
    print("  (none visible to this account)")
for s in surveys:
    marker = "  <-- current .env target" if s["id"] == q.ENV.get("QUALTRICS_SURVEY_ID") else ""
    print("  %s  %s%s" % (s["id"], s.get("name", ""), marker))

print("\nYour libraries:")
libraries = q.get_paginated("/libraries")
chosen = None
for lib in libraries:
    lib_id = lib.get("libraryId", "")
    print("  %s  %s" % (lib_id, lib.get("libraryName", "")))
    # Prefer the personal user library (UR_) for uploads.
    if chosen is None and lib_id.startswith("UR_"):
        chosen = lib_id
if chosen is None and libraries:
    chosen = libraries[0].get("libraryId")

if chosen:
    with open(q.LIB_ID_PATH, "w", encoding="utf-8") as f:
        f.write(chosen + "\n")
    print("\nSaved upload library %s to library_id.txt" % chosen)
else:
    print("\nNo library found - set QUALTRICS_LIBRARY_ID in .env manually.")
