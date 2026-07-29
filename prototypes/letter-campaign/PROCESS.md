# How this prototype was built — research, decisions, and verification

Documentation of the exploration requested in the PI's email ("explore how to build this" — replacing the petition with a letter-to-representative measure) and of what was actually done, July 28–29, 2026.

## 1. The request

The PI's requirements for a stronger measure of carbon-tax support:

1. Lives **outside** the Qualtrics survey (linked from it).
2. Respondent **signs** a pre-written letter — they don't write it.
3. The respondent's **name is never visible to the researchers**.
4. **One button click** sends the letter to their own congressperson/MP.

The PI's proposed mechanism: "grab the emails of these representatives from the internet and provide a pre-written letter."

## 2. Research findings that shaped the design

- **Survey population is Canada + US only.** The country question (q24 / QID262, `current_code/2026.07.27-all-code.js:28`) has exactly two recodes: 1 = Canada, 2 = USA. So "MP" means Canadian MP.
- **The PI's email assumption holds for Canada, fails for the US.**
  - *Canada:* every MP has a public `@parl.gc.ca` email, retrievable by postal code from the free, no-auth, CORS-enabled **Represent API** (Open North): `GET https://represent.opennorth.ca/postcodes/{CODE}/`. Verified live.
  - *US:* members of Congress have **no public email addresses** — they accept messages only through per-member contact webforms. Google's Civic Information *representatives* API (the standard "who represents this address" service) was **shut down April 30, 2025**. Rep lookup is still possible via the free **5 Calls API** (`GET https://api.5calls.org/v1/representatives?location={ZIP}`, `X-5Calls-Token` header), but a true one-click email send is impossible without a paid Communicating-with-Congress vendor.
- **API gotcha found during live testing:** the Represent endpoint `/representatives/house-of-commons/?postal_code=…` silently ignores the `postal_code` parameter and returns *all 343 MPs*. The correct endpoint is `/postcodes/{code}/`, whose `representatives_concordance` (precise) / `representatives_centroid` (fallback) arrays are filtered to `elected_office === "MP"`.
- **No existing external-page pattern in this repo.** The calculator is JS pasted into Qualtrics questions; there is no server-side code anywhere. This page establishes the project's first external-page pattern.

## 3. Decisions made (confirmed with the team)

| Decision | Choice | Rationale |
|---|---|---|
| Countries | Canada + US | Matches the survey population |
| US send mechanism | Clipboard-copy + open the member's official contact webform | Only honest option given no public emails; uses the official channel; name still never touches researcher infrastructure |
| Measurement | **Aggregate anonymous counts only** — no ResponseID, no per-respondent linkage | Chosen over ResponseID-linked event logging for stronger anonymity |
| Scope | **Prototype first, scale later** | Validate the risky mechanics (client-side lookup, mailto send, anonymity) before investing in hosting/logging/Qualtrics wiring |

## 4. What was built

`index.html` — a single static page, vanilla JS, no build step, no third-party assets. Four-step flow:

1. **Country** — picker, or skipped via `?country=1|2|ca|us` (matching the QID262 recodes so Qualtrics can pipe the answer into the link later).
2. **Lookup** — postal/ZIP input with validation → Represent API (CA) or 5 Calls API (US, key pending) → representative card (name, party, riding/district, photo). Multi-district results get a radio chooser; any failure gets an error panel with official manual-lookup links and a "continue with a general greeting" path so the measure survives API outages.
3. **Sign** — read-only letter with `{{SALUTATION}}`/`{{SIGNER_NAME}}` template substitution, live-updated as the respondent types their name; send button disabled until a name is entered; on-page privacy note.
4. **Send + confirm** —
   - *Canada:* `mailto:` with the MP's address, subject, and signed body pre-filled → the respondent's own mail client sends it. Confirmation screen includes copy-email / copy-letter fallbacks for devices without a mail client.
   - *US:* opens a tab synchronously (popup-blocker-safe pattern: `window.open("about:blank")` inside the click gesture, then navigate it), copies the signed letter to the clipboard (with a `document.execCommand` fallback), and shows 1-2-3 paste instructions.

The anonymity guarantee is structural: the typed name is used only to build the letter string in browser memory; the only network requests the page makes are the two lookup APIs (which receive postal/ZIP + IP, never the name). A `logEvent()` console stub marks where the future aggregate counter ping goes.

## 5. How it was verified

Served locally (`python -m http.server`) and driven end-to-end in Chrome:

- **CA happy path:** `M5V 3L9` → Chi Nguyen (Liberal, Spadina—Harbourfront), correct `@parl.gc.ca` email; salutation and live signature substitution correct; send button gating works; the generated mailto URL is 1,055 characters — safely under the ~2,000-char limit where mail clients truncate.
- **Normalization:** lowercase/spaced postal codes accepted; `K1A 0A6` resolves to a single MP via the correct endpoint.
- **Failure paths:** invalid format → inline validation; unknown code (`Z9Z9Z9`) → friendly error panel with manual links + generic-letter path (one fix applied: the API's CORS-less 404 surfaced as a raw "Failed to fetch", now mapped to a readable message); US with blank API key → graceful fallback panel (house.gov / senate.gov links) with the generic-letter path.
- **Prefill:** `?country=1` skips the picker into the Canadian flow.

## 6. Not done yet (scale-up phase — see README.md)

Anonymous count logging (Apps Script → Google Sheet), hosting (GitHub Pages; note it publishes the whole repo), the actual Qualtrics link, the free 5 Calls API key, PI-finalized letter text, a French letter for Quebec ridings, and — a **launch blocker** — IRB/ethics sign-off for facilitated political advocacy. Also note for any write-up: the future `send_clicked` count measures *attempted* sends, not confirmed delivery, and identical form letters may be discounted by offices.
