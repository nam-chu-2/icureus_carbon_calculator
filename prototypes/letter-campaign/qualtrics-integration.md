# Qualtrics integration — the letter-campaign link question

Copy-paste material for wiring the letter page into the survey, implementing the PI's measurement design:

- **Canada** — link clicks *and* Sign & send clicks, each linked to the Prolific ID. Authoritative source: the Google Sheet fed by `logger.gs` (`page_opened` and `send_clicked` rows carry the pid). The Qualtrics embedded-data click flag below is a redundant cross-check.
- **US** — link clicks only, measured **inside Qualtrics** (the embedded-data flag below). The page then looks up the respondent's House rep by ZIP and sends them to the rep's official website — nothing is logged to the Sheet for analysis.

## 1. Survey Flow — embedded data (must come *before* the letter question's block)

Add an Embedded Data element declaring:

| Field | Value |
|---|---|
| `PROLIFIC_PID` | *(leave blank — set from the URL)* |
| `letter_link_clicked` | `0` |
| `letter_link_clicked_ts` | *(blank)* |
| `fsa` | *(Canadians: first 3 characters of the postal code — set from wherever the survey captures it; rename the pipe below if your field is called something else)* |

Prolific must be configured to append `?PROLIFIC_PID={{%PROLIFIC_PID%}}` to the study URL (standard Prolific↔Qualtrics setup); Qualtrics auto-captures a URL parameter into an embedded-data field of the same name.

## 2. Hosting — lightweight and study-masking (decision 2026-07-30)

The page is hosted under a **neutral identity** so the URL respondents see reveals nothing about the study, the university, or this repository (avoids demand effects and lets the letter read as a genuine civic action, not a survey task).

**Chosen approach: Cloudflare Pages "Direct Upload"** (free, no git connection, ~5 minutes):

1. Create a Cloudflare account with a **non-identifying email/handle** (or use an existing personal one — the account name is not visible to visitors).
2. Dashboard → *Workers & Pages* → *Create* → *Pages* → **Upload assets** (do *not* "connect to git" — a git-connected deploy would tie the public deployment to this identifiable repo).
3. Project name: something neutral like `write-your-rep` → the live URL becomes **`https://write-your-rep.pages.dev`**.
4. Drag in **only** `index.html` (after setting `LOG_ENDPOINT`). Don't upload the README/PROCESS/logger files — they name the study.
5. Re-upload the same way for any update; the URL stays stable.

(Netlify's "Drop" works identically — `https://<neutral-name>.netlify.app` — if Cloudflare is unavailable.)

Masking checklist — what keeps the study unidentifiable from the respondent's side:

- **URL**: `write-your-rep.pages.dev` — no researcher/university/project name. Do **not** use GitHub Pages on this repo (`nam-chu-2.github.io/icureus_carbon_calculator/...` leaks both the username and the project).
- **Page content**: `index.html` never names the survey, university, or PI — it only says "the researchers"/"the study" in the privacy note (required disclosure, kept generic).
- **Search engines**: `index.html` carries `<meta name="robots" content="noindex, nofollow">`, so the deployed page won't be indexed and can't be found by googling the letter text.
- **Known residual risk**: this repo is public, and the page source (including the letter text) lives in it — someone who googles an exact letter sentence could find the *repo* via GitHub code search. If the PI wants that closed, either make this repo private or keep the final letter text only in the deployed copy (out of git). Flag for the PI/IRB.

## 3. The link question (Text/Graphic question)

**HTML view** — using the neutral host from §2 (adjust if the project name differs):

```html
<p>We'd like to give you the chance to share your views with the person who represents you.</p>
<p><a id="letter-link"
      href="https://write-your-rep.pages.dev/?country=${q://QID262/SelectedChoicesRecode}&pid=${e://Field/PROLIFIC_PID}&fsa=${e://Field/fsa}"
      target="_blank" rel="noopener">
   Click here to contact your representative
</a></p>
```

The `fsa` parameter makes the page **auto-run the MP lookup**, so Canadian respondents land directly on "Your MP: …" with the letter ready — no typing. If the field is empty (e.g. US respondents) or the lookup fails, the page falls back to the normal manual-entry step, so the pipe is safe to include unconditionally.

`${q://QID262/SelectedChoicesRecode}` is the country question (q24): recode **1 = Canada, 2 = USA** — the page maps these in `initFromQuery()`. Piped text resolves per-respondent at render time.

> ⚠️ Inserting questions renumbers/reshuffles q-references (this bit the survey before): if the survey is edited, re-verify that QID262 is still the country question before launch.

**JavaScript** (question's "Add JavaScript"):

```js
Qualtrics.SurveyEngine.addOnReady(function () {
  var link = this.getQuestionContainer().querySelector("#letter-link");
  if (!link) return;
  link.addEventListener("click", function () {
    Qualtrics.SurveyEngine.setEmbeddedData("letter_link_clicked", "1");
    Qualtrics.SurveyEngine.setEmbeddedData("letter_link_clicked_ts", new Date().toISOString());
  });
});
```

`letter_link_clicked` / `letter_link_clicked_ts` then export with the response row, which already contains `PROLIFIC_PID` — so the US link-click measure (and the CA cross-check) is pid-linked with no extra infrastructure.

Embedded data is written when the respondent advances the page, so keep at least one more page (e.g. the Prolific completion redirect) after this question.

## 4. Analysis quick reference

| Measure | Where | Field/rows |
|---|---|---|
| CA link clicks (per pid) | Google Sheet | rows with `country=ca, event=page_opened` |
| CA send clicks (per pid) | Google Sheet | rows with `country=ca, event=send_clicked` |
| US link clicks (per pid) | Qualtrics export | `letter_link_clicked=1` where country answer = USA |

Caveats: `send_clicked` measures *attempted* sends (the mail client still has to be used); `page_opened` can exceed true link clicks if a respondent reloads the page (dedupe by pid, or treat as "opened at least once").
