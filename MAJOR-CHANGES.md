# Major changes since the creation of this repository

Repository created **2026-04-30**; this document covers everything through **2026-07-29**
(29 commits plus current uncommitted work). Compiled from the git history, the README
change log, and the files themselves.

---

## Phase 1 — Repository creation and import of the old calculator (Apr 30 – May 5, 2026)

- **2026-04-30** — Repo created with a two-line README and an empty `all-graphs.js`
  placeholder.
- **2026-05-01** — Imported the code from the previous iteration of the calculator
  (the **March 3, 2026** version) into `all-graphs.js` (~926 lines).

## Phase 2 — June snapshot, archiving, and the "reproduction" learning phase (Jun 10 – 18, 2026)

- **2026-06-10** — Added a `June 10 2026/` snapshot of the live Qualtrics code
  (`all-graphs.js` + `intro-text.js`), moved the old code into `archived_code/`, and
  created a `reproduction/` folder.
- **2026-06-11 – 06-18** — Rebuilt the calculator step by step in `reproduction/`
  (`reproducing-code.js`, `all-graphs-organized.js`) with a written `LEARNING-PLAN` and
  `TEST-PLAN`. Along the way: recoded survey answer values, added `qData` question
  mappings and emission constants, ran the **first end-to-end test (Jun 18)**, and
  down-leveled the JavaScript because the **Qualtrics editor only accepts an older JS
  standard** (ES5-style rewrites). Also experimented with shrinking the results page.

## Phase 3 — The `current_code` era and the heating-model overhaul (Jun 22 – 26, 2026)

- **2026-06-22** — Consolidated everything into `current_code/2026.06.22-all-code.js`
  (the reproduction became the real code); added the `full calculator details.docx` spec.
- **2026-06-24 – 06-25** — Major **home-heating model** rework (+313 lines), driven by a
  new `CO2_footprint_calculator.xlsx` workbook; added the results-page HTML
  (`2026.06.26-current-html.html`) and a `heating-test-scenarios.md` test suite. Fixed a
  home-heating bug and a **"no vehicle" glitch** (respondents without a car).
- **2026-06-26** — Split diet emissions into **male / female parameters** (calorie-based
  factors per gender).

## Phase 4 — Qualtrics re-wiring and the all-jurisdictions expansion (Jul 10 – 11, 2026)

- **2026-07-10** — New code version `2026.07.07-all-code.js`; **updated Qualtrics QIDs**
  (question IDs/recodes had shifted — a recurring hazard when survey questions are
  inserted). Replaced the old workbook/spec with `CO2_calculator_all_jurisdictions.xlsx`
  and a country-averages flight-routes CSV.
- **2026-07-11** — **"All states" modification** (+545 lines): expanded the model from a
  small set of jurisdictions to region-keyed factor tables covering all US states —grid
  intensity, gas efficiency, heat-pump COP, space/cooling/water demand, vehicle factors.

## Phase 5 — Part 2 data, territories, and the 2030 target (Jul 21 – 23, 2026)

- **2026-07-21** — Added a **`part 2/`** folder with large datasets for the next phase:
  US ZIP3 climate/tax summaries, Canadian FSA flight destinations, CO₂ emissions and tax
  regime tables (~5,300 rows of CSV plus workbooks), and the authoritative
  `full calculator details - July 20.pdf` spec. Documented in the README change log:
  - **Removed Guam** from all state lists and factor tables (state recodes shifted —
    Qualtrics state question must be renumbered to match).
  - **Puerto Rico / U.S. Virgin Islands** added with real provisional parameters
    (eGRID-based island grids, FL/HI analogs for cooling/water/appliances) replacing
    HI-seeded placeholders; new all-electric "don't know" mixes for territories.
  - **2030 sustainable target lowered from 2.5 to 1.57 t** CO₂e/person (Hot-or-Cool
    global target scaled to the categories the calculator captures).
  - **Heat-pump back-up**: HTML done (label + footnote), JS model pending inputs.
  - Known discrepancy flagged: JS diet factors don't yet match the July 20 PDF table.
- **2026-07-23** — Code cleanup in `2026.07.07-all-code.js`.

## Phase 6 — New instructions, the 07.27 rewrite, and flights work (Jul 27 – 28, 2026)

- **2026-07-27** — **Migrated to a new instruction set**: the
  `CO2_calculator_all_jurisdictions 07.22.xlsx` workbook (now the source of truth —
  66 jurisdictions including PR/VI), a Qualtrics implementation spec, and two
  **heat-pump back-up methodology** documents (the dual-fuel model that was pending in
  Phase 5).
- **2026-07-28** — "Changes post meeting with Nick":
  - New code version **`current_code/2026.07.27-all-code.js`** (~1,480 lines), the
    current implementation.
  - Added a `flights/` folder: `build_fares_workbook.py` and
    `london_airfare_high_season.xlsx` (high-season London airfare data).

## Current uncommitted work (as of Jul 29, 2026)

- `current_code/2026.07.27-all-code.js` — in-progress edits (net simplification,
  −26 lines).
- `test-cases-07.27.md` (new) — regression test cases for the 07.27 code: expected
  per-category outputs (flights / mobility / diet / heat, t CO₂e per person per year)
  produced by executing the code with stubbed Qualtrics answers, for comparison against
  the live survey and the 07.22 workbook.

---

## The big themes, in one list

1. **Provenance**: started from the March 3, 2026 calculator, rebuilt from scratch in a
   `reproduction/` phase, then became `current_code/` with dated versions
   (06.22 → 07.07 → 07.27).
2. **Model scope**: a handful of jurisdictions → all US states → 66 jurisdictions
   including DC, PR, VI (Guam removed) and Canadian provinces/territories.
3. **Model fidelity**: heating model overhaul, gendered diet factors, territory-specific
   grid/cooling parameters, dual-fuel heat-pump back-up methodology, 2030 target
   recalibrated (2.5 → 1.57 t).
4. **Qualtrics constraints**: ES5-only editor, and QID/recode renumbering repeatedly
   forced code updates.
5. **Data infrastructure**: spec moved from Word doc → PDF → the 07.22 Excel workbook as
   source of truth; `part 2/` ZIP3/FSA datasets and a `flights/` airfare workbook added
   for the next phase.
