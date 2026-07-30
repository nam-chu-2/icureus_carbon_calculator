"""Shared Qualtrics REST API client for the api-test scripts.

Credentials come from api-test/.env (gitignored; see .env.example):
    QUALTRICS_API_TOKEN=...
    QUALTRICS_DATACENTER=...     e.g. ca1, iad1, eu
    QUALTRICS_SURVEY_ID=SV_...

All requests hit https://{datacenter}.qualtrics.com/API/v3 with the
X-API-TOKEN header. Every response is checked: anything other than a
2xx meta.httpStatus aborts the script with the API's error message.
"""

import datetime
import json
import os
import sys

try:
    import requests
except ImportError:
    sys.exit("The 'requests' package is required:  pip install requests")

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(HERE, ".env")
SNAP_DIR = os.path.join(HERE, "snapshots")
IMAGES_DIR = os.path.join(HERE, "images")
LIB_ID_PATH = os.path.join(HERE, "library_id.txt")

CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
}


def _load_env():
    if not os.path.exists(ENV_PATH):
        sys.exit("Missing api-test/.env - copy .env.example to .env and fill it in.")
    env = {}
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    for key in ("QUALTRICS_API_TOKEN", "QUALTRICS_DATACENTER"):
        if not env.get(key):
            sys.exit("%s is empty in api-test/.env" % key)
    return env


ENV = _load_env()
DATACENTER = ENV["QUALTRICS_DATACENTER"]
BASE = "https://%s.qualtrics.com/API/v3" % DATACENTER

_session = requests.Session()
_session.headers["X-API-TOKEN"] = ENV["QUALTRICS_API_TOKEN"]


def _check(resp):
    try:
        body = resp.json()
    except ValueError:
        sys.exit("Non-JSON response (HTTP %s) from %s:\n%s"
                 % (resp.status_code, resp.url, resp.text[:500]))
    status = str(body.get("meta", {}).get("httpStatus", ""))
    if not status.startswith("200"):
        sys.exit("API error at %s:\n%s"
                 % (resp.url, json.dumps(body.get("meta", body), indent=2)))
    return body.get("result")


def get(path):
    return _check(_session.get(BASE + path))


def post(path, body):
    return _check(_session.post(BASE + path, json=body))


def put(path, body):
    return _check(_session.put(BASE + path, json=body))


def get_paginated(path):
    """Follow result.nextPage links; return the combined result.elements."""
    elements = []
    url = BASE + path
    while url:
        result = _check(_session.get(url))
        elements.extend(result.get("elements", []))
        url = result.get("nextPage")
    return elements


def survey_id():
    sv = ENV.get("QUALTRICS_SURVEY_ID", "")
    if not sv.startswith("SV_"):
        sys.exit("Set QUALTRICS_SURVEY_ID=SV_... in api-test/.env "
                 "(run 01_whoami.py to list your surveys).")
    return sv


def library_id():
    lib = ENV.get("QUALTRICS_LIBRARY_ID", "")
    if lib:
        return lib
    if os.path.exists(LIB_ID_PATH):
        with open(LIB_ID_PATH, encoding="utf-8") as f:
            lib = f.read().strip()
        if lib:
            return lib
    sys.exit("No library id known. Run 01_whoami.py first (it auto-discovers "
             "your library), or set QUALTRICS_LIBRARY_ID in .env.")


def upload_graphic(lib_id, filepath):
    """POST /libraries/{id}/graphics (multipart). Returns the new IM_ id."""
    name = os.path.basename(filepath)
    ext = os.path.splitext(name)[1].lower()
    if ext not in CONTENT_TYPES:
        sys.exit("Unsupported image type %r (allowed: %s)"
                 % (name, ", ".join(sorted(CONTENT_TYPES))))
    with open(filepath, "rb") as f:
        resp = _session.post(
            "%s/libraries/%s/graphics" % (BASE, lib_id),
            files={"file": (name, f, CONTENT_TYPES[ext])},
        )
    result = _check(resp)
    return result.get("id", result)


def graphic_url(im_id):
    """The src URL a survey <img> tag uses for a library graphic."""
    return "https://%s.qualtrics.com/ControlPanel/Graphic.php?IM=%s" % (DATACENTER, im_id)


def snapshot(name, obj):
    """Write a timestamped JSON backup into api-test/snapshots/."""
    if not os.path.isdir(SNAP_DIR):
        os.makedirs(SNAP_DIR)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = os.path.join(SNAP_DIR, "%s_%s.json" % (name, stamp))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    return path


def require_todays_snapshot(prefix):
    """Write scripts call this so no PUT happens without a fresh backup."""
    today = datetime.date.today().strftime("%Y%m%d")
    if os.path.isdir(SNAP_DIR):
        for fname in os.listdir(SNAP_DIR):
            if fname.startswith(prefix) and "_%s-" % today in fname:
                return
    sys.exit("No snapshot from today matching %r in api-test/snapshots/. "
             "Run 02_inventory_images.py first." % prefix)
