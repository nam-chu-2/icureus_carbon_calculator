# Letter-to-Representative Prototype

A prototype of the stronger behavioral measure of carbon-tax support: instead of a petition, respondents **sign a pre-drafted letter and send it to their own congressperson (US) or MP (Canada)**. Lives outside the Qualtrics survey; the respondent's name never touches researcher infrastructure.

## What this prototype proves

1. **Client-side representative lookup**
   - **Canada** — postal code → `GET https://represent.opennorth.ca/postcodes/{CODE}/` (Represent API by Open North; free, no auth, CORS-enabled). Returns the MP's name, party, riding and real `@parl.gc.ca` email. Verified live 2026-07-28 (e.g. `M5V 3L9` → Chi Nguyen, Spadina–Harbourfront). Multi-riding postal codes (e.g. `K1A 0A6`) trigger a chooser.
   - **US** — ZIP → `GET https://api.5calls.org/v1/representatives?location={ZIP}` with an `X-5Calls-Token` header (free key: https://5calls.org/representatives-api/). Returns House rep + senators. **Key not yet requested** — with a blank key the page shows the manual-fallback panel (house.gov finder), so the US path degrades gracefully.
2. **One-click send with researcher-invisible name**
   - **Canada:** `mailto:` link with the MP's address and the signed letter pre-filled → the respondent's *own* mail client sends it. The name exists only in the browser and in the respondent's own outgoing email.
   - **US:** members of Congress have **no public email addresses** (contact webforms only; Google's Civic representatives API shut down April 2025). The button copies the signed letter to the clipboard and opens the member's official site in a new tab with 1-2-3 paste instructions. True one-click is impossible without a paid Communicating-with-Congress vendor — flag this to the PI.
3. **Sign-don't-write UX** — read-only letter, live name substitution, send disabled until a name is typed, explicit on-page privacy note.

## Run it locally

```
cd letter-campaign
python -m http.server 8000
# open http://localhost:8000/  (localhost counts as a secure context, so clipboard works)
```

Optional country prefill (mirrors the future Qualtrics piped-text link): `?country=1` or `?country=ca` → Canada, `?country=2` / `?country=us` → US.

Quick test matrix:

| Case | Input | Expect |
|---|---|---|
| CA happy path | `M5V 3L9` | One MP card; Sign & send opens mail client, recipient/subject/signed body correct |
| CA multi-riding | `K1A 0A6` | Radio chooser |
| CA invalid | `12345` | Inline validation message |
| CA unknown | `Z9Z9Z9` | Error panel with manual links + generic-letter path |
| US, no key | any ZIP | Error panel with house.gov link + generic-letter path |
| Privacy proof | DevTools → Network | Only opennorth.ca (and 5calls.org when keyed) requests; typed name appears in **no** network request |

## Deliberately deferred (scale-up phase)

- **Anonymous aggregate measurement** — decision made: counts only, no per-respondent linkage. Plan: tiny Google Apps Script web app appending `{timestamp, country, event}` rows (`page_opened` / `rep_found` / `send_clicked`) to a Google Sheet; the client stub is `logEvent()` in `index.html` (currently `console.log`). Never add ResponseID, name, or postal/ZIP to it.
- **Hosting** — GitHub Pages. Note: enabling Pages on this repo publishes the *whole* repo; consider a separate public repo for just this page.
- **Qualtrics wiring** — link on a post-calculator page: `https://<pages-url>/letter-campaign/?country=${q://QID262/SelectedChoicesRecode}` (QID262 recode: 1=Canada, 2=USA).
- **5 Calls API key** (free) + confirming the exact response field values (`area`, `url`) against a live call.
- **Letter text** — placeholders written by the engineer; PI finalizes. Keep the CA subject+body under ~1800 URL-encoded characters (mailto ~2000-char limit).
- Edge-case hardening (mobile mail handlers, senators as secondary US targets, French letter for Quebec ridings).
- **IRB/ethics sign-off — launch blocker.** Facilitated political advocacy with a pre-drafted letter; consent language must disclose it. Also note: `send_clicked` measures *attempted* sends, not confirmed delivery, and identical form letters may be discounted by offices.

## Privacy model (who sees what)

| Party | Sees |
|---|---|
| Researchers | Nothing per-respondent from this page (future: anonymous event counts only) |
| Represent / 5 Calls APIs | Postal/ZIP + IP (never the name) |
| The politician's office | The letter with the respondent's name, from the respondent's own email/webform — identifiable to the office by design; disclosed on-page |
