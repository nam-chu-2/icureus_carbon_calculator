# Learning Plan: Reproducing `June 10 2026/all-graphs.js`

**Goal:** Rebuild the carbon-calculator chart script from scratch in `reproduction/reproducing-code.js`, understanding every component well enough to explain it — line by line if needed — to your supervisor or a journal reviewer.

**Method:** For each phase, (1) read the relevant section of the original, (2) close the file and rewrite that section yourself from understanding, (3) compare against the original, (4) pass the "explain it" checkpoint by writing 2–3 sentences in your own words (keep these notes — they become your answers to reviewer questions).

---

## Phase 0 — Orientation: what is this file? (~1 hour)

The script runs inside a **Qualtrics survey page**. When the page loads, it:
1. Reads the respondent's earlier survey answers (via Qualtrics "piped text"),
2. Converts them into four emission estimates (flight, home heating, vehicle, diet),
3. Draws a stacked bar chart (Chart.js) comparing the respondent's footprint to a global average and a 2030 target,
4. Wires up radio buttons that let the respondent explore "what if I changed X?" scenarios, updating the chart live.

**Tasks:**
- Skim the whole file top to bottom once. Note the section banners (`Survey answers`, `Init Global Variables`, `Parser Functions`, `Weights`, `Calculation Functions`, `Populate Survey Results`, `Chart`, `JQuery Set Radio Button`, `JQuery Event Listeners`). The file is a pipeline: **raw strings → parsed settings → weighted math → chart → interactivity**.
- Diff against `archived_code/all-graphs.js` (`diff "archived_code/all-graphs.js" "June 10 2026/all-graphs.js"`). The only changes: Montana → Colorado as a study state, and `G_GlobalAverage` 6.5 → 3.8. Knowing what changed between versions tells you what the team considered tunable.

**Checkpoint:** Explain the pipeline in one paragraph without looking at the code.

---

## Phase 1 — Qualtrics input layer (lines 1–93) (~2 hours)

**Concepts to learn:**
- `Qualtrics.SurveyEngine.addOnReady(fn)` — Qualtrics' page-load hook; everything lives inside this closure.
- **Piped text**: strings like `"${q://QID123/SelectedChoicesRecode}"` are replaced *by the Qualtrics server* with the respondent's answer **before** the JavaScript ever runs in the browser. By the time this script executes, `qData.q1` is already a plain string like `"1"` or `"1, 2"`. This is why the file can't run locally as-is — there's no Qualtrics server to substitute the values.
- The three piped-text forms used: `SelectedChoicesRecode` (recode of chosen option(s)), `ChoiceTextEntryValue` (free-text), `ChoiceNumericEntryValue/1` (numeric entry).
- Why there are nine "short-haul flights" questions (q8, q21–q27): Qualtrics shows a *different* question per province/state (the question text names the region), so the script must pick the right QID based on region.
- The `G_` globals: chart handle, benchmarks (`G_GlobalAverage = 3.8`, `G_SustainableTarget = 2.5` — be ready to cite where these numbers come from for the paper), the `G_SurveySettings` object that everything funnels into, and region/unit state (`G_CountryName`, `G_GetProvince`, `G_MileageType`).

**Tasks:**
- Make a table mapping each `qN` → QID → survey question → which parser consumes it → which calculation uses it. (This table is gold for a methods section.)
- Reproduce: write the `qData` object and globals in `reproducing-code.js`. For local testing, replace piped text with a hard-coded mock object (see Phase 6).

**Checkpoint:** Explain why the answers arrive as strings, and why short-haul flights need region-specific QIDs.

---

## Phase 2 — Parser functions (lines 100–221) (~2 hours)

**Concepts to learn:**
- `parseIntOrZero` — defensive parsing; blank/garbage → 0.
- `extractSelectedChoices` — the workhorse. Walks a string like `"1, 3"` by reading `charAt(0)` and chopping 3 chars (`"N, "`). Understand its limits: **only single-digit recodes**, assumes `", "` separators, returns `0` for blank.
- The lookup-table pattern: every categorical parser (`getBuildingStandard`, `getHeatingType`, `getFuelType`, `getCarSize`, `getDiet`, `getCanadaProvince`, `getUSAProvince`, `getHouseHoldSize`) uses a **1-based array** with a dummy `""` (or duplicate) at index 0, so recode `1` maps to element 1. Blank answer → index 0 → the fallback value.
- Floor-at-1 guards: `getHouseSize` and `getCarPassenger` clamp to minimum 1 (avoids divide-by-zero later — household size and passengers are divisors).

**Tasks:**
- Trace `extractSelectedChoices("2, 4")` by hand on paper.
- Reproduce all parsers from memory; unit-test them in Node (`node -e ...` or a small test file) with inputs `""`, `"1"`, `"3"`, `"1, 2"`.

**Checkpoint:** Explain the 1-based array trick and what happens to an unanswered question at every parser.

---

## Phase 3 — Emission weights: the science core (lines 230–413) (~3 hours, the most important phase for a journal)

This is the section a reviewer will probe hardest. For **every constant, find and document its source** (ask your supervisor / check the project's references — the code doesn't cite them).

**Weight tables and their units:**

| Table | Unit | Structure |
|---|---|---|
| `flightTypeWeights` | t CO₂e **per flight** (short 0.18, medium 0.75, long 2.99) | flat |
| `heatingTypeWeights` | g CO₂e per kWh-equivalent factor; oil/gas/wood flat, **hydro & heatpump vary by province** (grid intensity: QC 0.472 vs CO 142.0) | nested by region |
| `heatingEfficiencyWeight` | dimensionless efficiency (heat pump 2.74 = COP; gas 0.87) | flat |
| `buildingStandardWeight` | energy intensity multiplier by region × building age | nested |
| `vehicleTypeWeights` | **kg CO₂e per km** by region × fuel × size (battery varies by grid: QC 0.040 vs CO 0.081… check) | nested ×3 |
| `dietTypeWeights` | t CO₂e **per year** (omnivore 1.63 → vegan 0.50) | flat |

**Things to understand and be ready to defend:**
- Why "hydro" and "heatpump" weights vary by province: they draw grid electricity, and grid carbon intensity differs (Québec hydro ≈ clean; Alberta/Colorado fossil-heavy). Note the in-code comment: *"hydro (should be labeled electric)"* — terminology matters for the paper.
- Why EV (`battery`) car weights differ by region but `petrol`/`diesel` don't.
- The `VH:` comments are your supervisor's revision notes embedded in the code (building-standard table update, blank-diet default = omnivore) — they document modelling decisions.
- Defaults for non-response: blank heating → gas's weight (50.149), blank diet → omnivore. Be ready to justify "blank = most common category" to a reviewer.

**⚠ Inconsistencies to investigate (a reviewer might catch these — find them yourself first):**
1. `buildingStandardWeight`: QC's blank key is `""` but every other region uses `"blank"`. `getBuildingStandard("")` returns `""` — so a blank answer outside Québec looks up `undefined` → heating becomes `NaN`. Verify this and decide if it's a real bug.
2. `getFuelType` returns `"PHEV"` (uppercase) but `vehicleTypeWeights` keys are `"phev"` (lowercase) → PHEV drivers fall through to the `{car:0, truck:0, suv:0}` fallback, i.e. **zero vehicle emissions**. Verify.
3. `getCarSize` maps recodes to `["", "car", "suv", "truck"]` — confirm this matches the current survey's answer order.

**Tasks:** Build a one-page "emission factors & sources" sheet. Reproduce the tables (copy-paste is fine here — the learning is in the sourcing, not the typing).

**Checkpoint:** For each table: state its unit, why it's (or isn't) region-dependent, and where the numbers come from.

---

## Phase 4 — Calculation functions (lines 420–567) (~3 hours)

Work through each formula with **units** until the dimensional analysis closes:

- **Flight** = Σ (count × per-flight tonnes) + flat **+3 t** if "additional flight" toggled; forced to 0 if "no flight" toggled. (The 3 t ≈ one long-haul flight — that's the what-if counterfactual.)
- **Heating** = `(houseSize[ft²] / 10.7639)[→ m²] × buildingStandard[kWh/m²-ish factor] × (heatingFactor / efficiency)[g/kWh] / 1000 [→ t] / householdSize [per person]`. Note the survey collects **square feet** and the code converts to m² (the `VH:` comment).
- **Vehicle** = `weight[kg/km] / 1000 [→ t/km] × mileage[km] / passengers`. Two unit traps:
  - US respondents answer in **miles** (q20); `mileage * 1.60934` converts miles → km (the inline comment says "convert mileage to miles" — it's actually converting *to kilometres*; be ready to explain the comment is wrong, not the math).
  - ⚠ Line 535: `(factor * mileage)/passengerSize.toFixed(1)` — `.toFixed(1)` binds to `passengerSize` (rounding the *divisor* to a string), not to the result. JS coerces the string back to a number so the math still works, but the result is **not** rounded to 1 decimal like the other three functions. Know this precedence quirk; a code-savvy reviewer may ask.
- **Diet** = straight lookup, per person per year.
- **Total** = sum, also refreshes the four `G_*ChartValue` globals (a side effect — calling it recomputes everything).
- **`calculateYAxisMaxCounterfactual`** = current total + 3 t (the hypothetical extra long-haul flight) + headroom, ceiling'd. This fixes the y-axis high enough that toggling "additional flight" never clips the chart — important for visual comparability across scenarios (an experimental-design point worth explaining in the paper).

**Tasks:**
- Hand-calculate one full persona on paper (e.g., Ontario, gas-heated 1500 ft² newer house, 2-person household, petrol car 15,000 km solo, 2 short + 1 long flight, omnivore). Then verify against the code in Node.
- Reproduce all five functions from memory.

**Checkpoint:** Write each formula in mathematical notation with units — this is essentially the methods-section paragraph.

---

## Phase 5 — Populating settings: the branching logic (lines 577–680) (~1.5 hours)

- Country (q17) sets `G_MileageType` (KM vs MILES) and which province question to read (q18 vs q19).
- Flight block: only if "have you flown" = yes; picks the province-specific short-haul QID; medium/long are per-country QIDs; `business` legs are hard-coded 0 (a leftover from an earlier design — worth knowing why it's still here).
- House block: note `heatingEfficiency` is set to the **same answer** as `heatingType` (q16). Consequence: the radio-button toggles later change `heatingType` but *not* `heatingEfficiency` — so a what-if switch to a heat pump uses the heat-pump grid factor but the *original* system's efficiency. Decide whether that's intended; be ready to explain either way.
- Car block: no car access → `fuelType: "novehicle"` → falls to the zero-weight fallback in Phase 4.

**Checkpoint:** Draw the decision tree from (country, province, flown?) to which qN fields actually get used.

---

## Phase 6 — Chart.js rendering (lines 686–766) (~2 hours)

- The syntax (`scales.xAxes: [...]`, `options.title`, `ticks.max`) is **Chart.js v2** — v3/v4 changed all of these. For reproduction you must load Chart.js 2.x (e.g. 2.9.4 from CDN), or the chart silently won't render.
- Structure: a **stacked bar** faked across 3 categories. Each of the 6 datasets has data `[x, 0, 0]` / `[0, x, 0]` / `[0, 0, x]` so the four emission components stack only in column 1, the global average only in column 2, the target only in column 3.
- **Dataset order matters**: indices 0–3 (Diet, Ground Transport, Flight, Home Heating) are hard-coded in the event listeners (`datasets[2]` = flight, etc.). Reorder them and the toggles update the wrong bars.
- `legend.onClick: function(){}` — deliberately disables Chart.js's default "click legend to hide dataset" so respondents can't hide bars (experimental control).
- y-axis: fixed `max: G_ChartYMax` (Phase 4), tick callback appends `" t"`, axis label `t CO₂e`.

**Task — build the local harness (this is where reproduction becomes real):**
Create `reproduction/index.html`:
```html
<canvas id="myChart"></canvas>
<!-- jQuery 3.x + Chart.js 2.9.4 from CDN -->
<!-- radio groups: flightToggle, heatingToggle, vehicleToggle, dietToggle
     with the value strings used in the listeners -->
<script src="reproducing-code.js"></script>
```
In `reproducing-code.js`, replace the Qualtrics wrapper with a plain DOMContentLoaded (or keep the wrapper and stub `Qualtrics.SurveyEngine.addOnReady = fn => fn()`), and replace `qData` piped-text with a mock persona. Now you can open it in a browser and see the actual chart.

**Checkpoint:** Explain how a "stacked bar with three separate columns" is constructed from six datasets, and why the y-axis max is frozen.

---

## Phase 7 — Interactivity: jQuery toggles (lines 776–925) (~1.5 hours)

- **Initial state**: `$("input:radio[name=X]").val([...])` *checks* the radio matching the respondent's real answer (jQuery's set-by-array form). Note the collapsing: petrol & diesel both display as "petrol"; unknown heating defaults the toggle to "oil".
- **Listeners**: all four follow the same template — switch on the new value → mutate `G_SurveySettings` → recompute that component + total → poke `datasets[i].data[0]` → update title → `G_ChartObj.update()`.
- Flight is the special one: three states (current / **additional** (+3 t) / none) — this is the behavioural-intervention lever of the study.

**Tasks:** Reproduce the listeners; in your harness, click through every toggle and watch the chart respond. Confirm the heating-efficiency quirk from Phase 5 in the console.

**Checkpoint:** Trace, step by step, what happens in the code when a respondent clicks "vegan".

---

## Phase 8 — Validation & explanation prep (~2 hours)

1. **Golden tests**: pick 3 personas (e.g., QC heat-pump vegan cyclist; AB truck-driving omnivore frequent flyer; NY apartment mid-everything). Compute expected values by hand, then verify both the original and your reproduction print identical numbers (`calculateTotalEmissions` logs everything to console).
2. **Edge cases**: all-blank answers; US respondent; PHEV driver; non-QC blank building standard (the suspected NaN). Document actual behaviour.
3. **Write the explainer**: one page, audience = journal reviewer: data flow, formulas with units, factor sources, the fixed-axis/disabled-legend design choices, and known limitations (single-digit recode parser, the inconsistencies found in Phases 3–5).
4. Walk your supervisor through it; every question you can't answer goes back into the relevant phase.

---

## Suggested order & rough budget (~16 hours total)

| Session | Phases |
|---|---|
| 1 | 0 + 1 (orientation, Qualtrics layer) |
| 2 | 2 + start 3 (parsers, weights) |
| 3 | finish 3 (factor sourcing — involve supervisor) |
| 4 | 4 (calculations + hand-calc) |
| 5 | 5 + 6 (branching, chart, local harness) |
| 6 | 7 + 8 (interactivity, validation, explainer) |

## Open questions to resolve with your supervisor
- Citation/source for every weight table, and for the 3.8 t global average & 2.5 t 2030 target.
- Are the PHEV-case (zero emissions) and non-QC blank building standard (NaN) bugs or accepted behaviour?
- Should the heating *efficiency* follow the heating-type toggle in what-if scenarios?
- Why are `business` flight fields kept but always 0?
