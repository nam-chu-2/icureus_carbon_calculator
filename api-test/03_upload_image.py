"""Step 3 - upload new image files to your Qualtrics graphics library.

    POST /libraries/{UR_id}/graphics   (multipart file upload)

Uploads every png/jpg/jpeg/gif found in api-test/images/ and prints the
new IM_ id for each. Uploads are additive: nothing in any survey changes
until you point a question at the new id with 04_replace_image.py.
"""

import os

import qualtrics as q

lib = q.library_id()

if not os.path.isdir(q.IMAGES_DIR):
    os.makedirs(q.IMAGES_DIR)
files = sorted(
    f for f in os.listdir(q.IMAGES_DIR)
    if os.path.splitext(f)[1].lower() in q.CONTENT_TYPES
)
if not files:
    raise SystemExit("No images found. Drop .png/.jpg/.gif files into api-test/images/ first.")

print("Uploading %d file(s) to library %s:\n" % (len(files), lib))
for fname in files:
    im_id = q.upload_graphic(lib, os.path.join(q.IMAGES_DIR, fname))
    print("  %-30s ->  %s" % (fname, im_id))
    print("      url: %s" % q.graphic_url(im_id))

print("\nNext:  python 04_replace_image.py <QID> <new IM_ id>")
