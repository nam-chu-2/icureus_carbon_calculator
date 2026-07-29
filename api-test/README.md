# Qualtrics API toolkit — replace survey images from the command line

Small Python scripts for modifying a survey via the Qualtrics REST API.
The concrete workflow implemented here: **replace the images a survey shows
with new image files from your computer.**

## One-time setup

1. **Install the one dependency**

   ```
   pip install requests
   ```

2. **Get your credentials** — in Qualtrics click your avatar (top right) →
   **Account Settings → Qualtrics IDs**:
   - **API token**: in the *API* box (click *Generate Token* if empty).
     If there is no API box at all, your brand admin has to enable API
     access for your account.
   - **Datacenter ID**: in the *User* box (e.g. `ca1`, `iad1`, `eu`).
   - **Survey ID**: the `SV_...` id of the survey you want to modify
     (also visible in the survey's URL, or listed by `01_whoami.py`).

3. **Create `.env`** — copy `.env.example` to `.env` in this folder and fill
   it in. `.env` is gitignored; the token never leaves your machine.

4. **Recommended backup**: in the survey, Tools → Import/Export →
   *Export Survey* and keep the `.qsf` file. That is the guaranteed
   full-restore path no matter what.

## The workflow

Run the scripts in order from this folder (`python 01_whoami.py` etc.):

| Script | What it does | Writes to Qualtrics? |
|---|---|---|
| `01_whoami.py` | Verifies the token, lists your surveys and libraries, saves your library id | No |
| `02_inventory_images.py` | Snapshots the full survey to `snapshots/`, lists every image (QID + IM_ id) | No |
| `03_upload_image.py` | Uploads each file in `images/` to your library, prints the new `IM_` ids | Library only (additive) |
| `04_replace_image.py QID IM_new [IM_old]` | Points that question at the new image — **draft only** | Draft |
| `05_publish.py [description]` | Makes the draft live, after a y/N prompt | **Live** |

A typical replacement session:

```
python 01_whoami.py                 # once; confirm token + pick SV_ id for .env
python 02_inventory_images.py       # see which QID shows which image; backup made
copy new-logo.png images\
python 03_upload_image.py           # -> prints e.g. IM_abc123
python 04_replace_image.py QID3 IM_abc123
# look at the survey builder / Preview — the draft now shows the new image
python 05_publish.py "swapped logo"
```

## How it works (the API mechanics)

- Base URL: `https://{datacenter}.qualtrics.com/API/v3`, auth via the
  `X-API-TOKEN` header on every request.
- Images live in a **library** (`UR_...`), each with an `IM_...` id.
  A survey shows one either as an inline
  `<img src="https://{dc}.qualtrics.com/ControlPanel/Graphic.php?IM=IM_...">`
  in a question's `QuestionText`, or via the `Graphics` field of a
  graphic-type question.
- Replacing an image is therefore: upload file →
  `POST /libraries/{UR_id}/graphics` (multipart) → take the returned
  `IM_` id → `GET /survey-definitions/{SV}/questions/{QID}` → edit the
  image reference in the payload → `PUT` the same payload back.
- **Draft vs live**: all `survey-definitions` edits change only the draft
  (what the builder and Preview show). Respondents see changes only after
  `POST /survey-definitions/{SV}/versions` with `"Published": true`
  (script `05`) — identical to clicking *Publish* in the builder.

## Safety / rollback

- `02` must be run (same day) before `04` will write anything — every write
  is preceded by a timestamped JSON snapshot in `snapshots/`.
- Nothing here ever deletes a library image, so reverting is always possible:
  rerun `04` with the old and new `IM_` ids swapped, or `PUT` a snapshot back.
- Only `05` publishes, and it always asks first.

## Useful references

- API docs: https://api.qualtrics.com/
- Finding IDs: https://www.qualtrics.com/support/integrations/api-integration/finding-qualtrics-ids/
