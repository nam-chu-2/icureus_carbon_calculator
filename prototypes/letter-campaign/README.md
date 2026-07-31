# Letter-to-Representative Prototype

A prototype of the stronger behavioral measure of carbon-tax support. **Canada:** respondents sign a pre-drafted letter and email it to their own MP — their name never touches researcher infrastructure. **US:** respondents are looked up by ZIP and sent to their House representative's official website (no letter — per PI direction, July 2026). Lives outside the Qualtrics survey.

## Files

| File | What |
|---|---|
| `index.html` | The whole page (vanilla JS, no build step) |
| `logger.gs` | Google Apps Script event logger → Google Sheet (deployment steps inside the file) |
| `qualtrics-integration.md` | Survey wiring: link HTML, click-tracking JS, embedded-data setup, analysis reference |
| `PROCESS.md` | How this was researched, decided, built, and verified |

## Measurement design (PI requirements, July 2026)

| Country | Measure | How |
|---|---|---|
| Canada | Link clicks, **per Prolific ID** | `page_opened` event → Apps Script → Google Sheet (arrival at the page = the click) |
| Canada | Sign & send clicks, **per Prolific ID** | `send_clicked` event → same Sheet |
| US | Link clicks, per Prolific ID | **Inside Qualtrics**: embedded data `letter_link_clicked` set by the link question's JS |

> **Decision note (2026-07-30):** this *supersedes* the earlier "aggregate counts only" decision — Canadian events are now linked to the pseudonymous Prolific ID, at the PI's request. The respondent's **name** still never reaches researcher infrastructure: the log payload is exactly `{event, country, pid, ts}` — no name, no postal/ZIP, no ResponseID. The pid linkage must be disclosed in the consent language (IRB).

The Prolific ID reaches the page via the Qualtrics link (`?pid=${e://Field/PROLIFIC_PID}`). With `LOG_ENDPOINT` blank (as committed), events are only `console.log`ged — deploy `logger.gs` and paste its URL to go live.

## Representative lookup (client-side)

- **Canada** — respondent types only their **FSA** (first 3 characters of the postal code, e.g. `M5V` — less identifying than a full code, parallel to the US ZIP3). Chain: `GET https://www.geolocator.api.geo.ca/geolocation/en/locate?q={FSA}` (NRCan geolocator; free, no auth, CORS-enabled) → centroid → `GET https://represent.opennorth.ca/representatives/house-of-commons/?point={lat},{lon}` (Represent API) → MP name, party, riding and real `@parl.gc.ca` email. Verified live 2026-07-30 (`M5V` → Chi Nguyen, Spadina–Harbourfront). **Limitation:** an FSA can straddle riding boundaries and the centroid picks one — the "Not your district?" manual link and generic-letter path cover boundary cases.
- **US** — ZIP → `GET https://api.5calls.org/v1/representatives?location={ZIP}` with an `X-5Calls-Token` header (free key: https://5calls.org/representatives-api/). **Key not yet requested** — with a blank key the page shows the manual-fallback panel (house.gov finder), so the US path degrades gracefully.

**Send mechanics.** Canada: `mailto:` with the MP's address and the signed letter pre-filled → the respondent's *own* mail client sends it (name exists only in the browser and their own outgoing email). US: one click opens the rep's official website in a new tab — members of Congress have no public email addresses, so the site (with its contact form) is the official channel.

## Run it locally

```
cd prototypes/letter-campaign
python -m http.server 8000
# open http://localhost:8000/?country=1&pid=TEST123
```

Country prefill mirrors the Qualtrics link: `?country=1` / `ca` → Canada, `?country=2` / `us` → US; `pid` is the Prolific ID; `fsa` (e.g. `&fsa=M5V`) auto-runs the Canadian MP lookup so the respondent skips straight to their MP (falls back to manual entry if missing or failing).

Quick test matrix:

| Case | Input | Expect |
|---|---|---|
| CA happy path | `M5V` (full codes also accepted — extra chars ignored) | MP card; Sign & send opens mail client; console shows `page_opened` + `send_clicked` with the pid |
| CA invalid | `123` | Inline validation message |
| CA unknown | `Z9Z` | Error panel with manual links + generic-letter path |
| US, no key | any ZIP | Fallback panel with house.gov link; **no** letter/sign step anywhere in the US flow |
| Privacy proof | DevTools → Network | Only opennorth.ca / 5calls.org (+ `LOG_ENDPOINT` if set) requests; the typed name appears in **no** network request |

## Remaining before launch

- **Deploy `logger.gs`** (5 min, instructions in the file) and set `LOG_ENDPOINT` in `index.html`.
- **Hosting** — decided 2026-07-30: **Cloudflare Pages direct upload under a neutral name** (e.g. `write-your-rep.pages.dev`) so the URL doesn't reveal the study — full steps + masking checklist in `qualtrics-integration.md` §2. Not GitHub Pages on this repo (URL would leak the project name).
- **Qualtrics wiring** — everything needed is in `qualtrics-integration.md`.
- **5 Calls API key** (free) for automatic US rep lookup + confirming response field values against a live call. (Until then, US respondents get the house.gov finder link.)
- **Letter text** — placeholder written by the engineer; PI finalizes. Keep subject+body under ~1800 URL-encoded characters (mailto ~2000-char limit).
- Edge-case hardening (mobile mail handlers, French letter for Quebec ridings).
- **IRB/ethics sign-off — launch blocker.** Facilitated political advocacy with a pre-drafted letter; consent must disclose it **and the Prolific-ID-linked click/send logging**. Note: `send_clicked` measures *attempted* sends, not confirmed delivery, and identical form letters may be discounted by offices.

## Privacy model (who sees what)

| Party | Sees |
|---|---|
| Researchers | Prolific ID + event type (`page_opened` / `send_clicked`) + timestamp — never the name, postal/ZIP, or letter |
| NRCan geolocator / Represent / 5 Calls APIs | FSA (3 chars) or ZIP + IP (never the name, never the pid) |
| The politician's office | CA only: the letter with the respondent's name, from the respondent's own email — identifiable to the office by design; disclosed on-page |
