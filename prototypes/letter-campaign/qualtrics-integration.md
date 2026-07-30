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

Prolific must be configured to append `?PROLIFIC_PID={{%PROLIFIC_PID%}}` to the study URL (standard Prolific↔Qualtrics setup); Qualtrics auto-captures a URL parameter into an embedded-data field of the same name.

## 2. The link question (Text/Graphic question)

**HTML view** — replace `<HOST>` with the deployed page URL (hosting decision pending):

```html
<p>We'd like to give you the chance to share your views with the person who represents you.</p>
<p><a id="letter-link"
      href="https://<HOST>/letter-campaign/?country=${q://QID262/SelectedChoicesRecode}&pid=${e://Field/PROLIFIC_PID}"
      target="_blank" rel="noopener">
   Click here to contact your representative
</a></p>
```

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

## 3. Analysis quick reference

| Measure | Where | Field/rows |
|---|---|---|
| CA link clicks (per pid) | Google Sheet | rows with `country=ca, event=page_opened` |
| CA send clicks (per pid) | Google Sheet | rows with `country=ca, event=send_clicked` |
| US link clicks (per pid) | Qualtrics export | `letter_link_clicked=1` where country answer = USA |

Caveats: `send_clicked` measures *attempted* sends (the mail client still has to be used); `page_opened` can exceed true link clicks if a respondent reloads the page (dedupe by pid, or treat as "opened at least once").
