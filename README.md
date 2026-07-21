# icureus_carbon_calculator
This repository will host the code for the carbon calculator.

## Change log

### 2026-07-21 — Territories, 2030 target, heat-pump back-up (work in progress)

Source of truth for parameters: `current_code/instructions/full calculator details - July 20.pdf`.
Note: the workbook in `instructions/` (`CO2_calculator_all_jurisdictions.xlsx`) predates the
territory / dual-fuel update — it covers only the 50 states + DC and 13 provinces/territories.
Everything below was applied to `current_code/2026.07.07-all-code.js` and
`current_code/2026.06.26-current-html.html`.

#### 1. Removed Guam (JS)

- Removed from the q22 comment list, `OPTIONS.usaState`, and all eight region-keyed factor
  tables (`GRID_LIFECYCLE_KG_PER_GJ`, `GAS_EFFICIENCY`, `HEATPUMP_COP`,
  `SPACE_DEMAND_GJ_PER_M2`, `COOLING_INTENSITY_GJ_PER_M2`, `WATER_DEMAND_GJ_PER_HH`,
  `OTHER_ELEC_BASE_GJ`, `VEHICLE_FACTOR_BY_REGION`).
- `OPTIONS.usaState` stays alphabetical, so **recodes shifted**: HI = 12, PR = 40, VI = 46
  ("U.S. Virgin Islands" sorts before "Utah").
- **ACTION REQUIRED:** the Qualtrics state question (QID1720071883) must be renumbered so
  recode = alphabetical position in the Guam-free list; otherwise every state from Hawaii
  onward maps to the wrong region.

#### 2. Puerto Rico / U.S. Virgin Islands real parameters (JS)

Replaced the HI-seeded placeholders with provisional analog-based values per PDF §3h
(territory parameters are "provisional analog-based estimates pending territory-specific
survey data"):

| Table | PR / VI values | Basis |
|---|---|---|
| `GRID_LIFECYCLE_KG_PER_GJ` | PR 239.590909, VI 233.675214 | PR: eGRID2023 PRMS 702 g CO2e/kWh; VI: ~700 g/kWh (2022 mix ~69% propane / ~31% diesel). Formula mirrors P_EF_Elec: g/kWh ÷ 3.6 ÷ (1 − loss), losses PR 12% / VI 9%, plus upstream adder **estimated** analog to HI's oil-heavy island grid (PR +18, VI +20 kg/GJ — the one number the PDF does not pin down) |
| `SPACE_DEMAND_GJ_PER_M2` | HI values (0.028/0.021/0.014/0.011) | PDF: HDD ≈ 0, intensities "set near zero" |
| `COOLING_INTENSITY_GJ_PER_M2` | 0.201/0.155/0.113/0.093 | Mean of FL and HI (PDF's named warm-climate analogs) |
| `WATER_DEMAND_GJ_PER_HH` | 10.1/9.2/7 | Mean of FL and HI |
| `OTHER_ELEC_BASE_GJ` | 23 | Mean of FL (27) and HI (19) |
| `GAS_EFFICIENCY`, `HEATPUMP_COP` | 0.85, 2 | US national values |
| `VEHICLE_FACTOR_BY_REGION` | HI's phev/battery rows | AFLEET has no territory rows; HI is the closest island-grid analog |

- New `DK_ELECTRIC_REGIONS = ["PR","VI"]` with all-electric "Don't know" space/water mixes
  (`DK_SPACE_MIX_TERRITORY`, `DK_WATER_MIX_TERRITORY`), per PDF: territory mixes "assume
  predominantly electric heating and water heating".
- `PLACEHOLDER_REGIONS` renamed to `PROVISIONAL_REGIONS = ["PR","VI"]`; console warning
  updated.

#### 3. 2030 target (JS)

- `SUSTAINABLE_TARGET_TONNES`: 2.5 → **1.57** (PDF §6: 2.9 × 2.5⁄4.6 — Hot or Cool global
  target scaled to the categories the calculator captures). `GLOBAL_AVERAGE_TONNES` stays 2.9.

#### 4. Verification done

- `node --check` passes.
- Smoke-tested via a stubbed Qualtrics/jQuery harness (scratchpad, not committed): recodes
  40/46/12 resolve to PR/VI/HI; PR home-energy figure (5.8 t for 1,500 sqft detached,
  don't-know systems, AC, household of 2) reproduced by hand-calculation; PR/VI > HI
  (5.8/5.7 vs 3.9 t) as expected from the dirtier grids.

#### 5. Heat-pump back-up (HTML done, JS functionality PENDING)

Context: a survey question was added on the back-up system for heat-pump owners; the results
widget should model it (PDF §3c dual-fuel model: heat pump above the switchover temperature,
back-up furnace below; economic switchover capped at 0°C, −15°C lockout).

- **Done** in `2026.06.26-current-html.html`: heating radio label is now
  "Heat pump (w/ gas back-up)*" and a footnote below the toggle table reads
  "* actual back up source for your system if you have a heat pump."
- **Pending (blocked on info from the researcher):**
  1. QID + recode order of the new back-up question (likely Electric / Natural gas /
     Oil or propane; fossil answers trigger the dual-fuel path) — to be wired into `qData`
     (as q24) and `buildSurveyState`.
  2. How to quantify the dual-fuel split: the PDF §3c model needs per-jurisdiction climate
     normals and energy prices that exist only in a **newer workbook we don't have**.
     Options discussed: port from updated workbook (preferred, matches how the rest of the
     file was built) / fixed national split as a provisional approximation / implement the
     full climate model in JS.
  3. Intended behavior: toggling to "Heat pump (w/ gas back-up)" uses a gas-backed heat pump
     for non-heat-pump respondents; respondents who report a heat pump use their *actual*
     back-up source (hence the asterisk).

#### 6. Known discrepancy (not yet changed)

- `DIET_FACTOR_TONNES` in the JS (men omnivore 2.019 / women 1.506, i.e. 2.23 kg/1000 kcal ×
  ~2,480/~1,850 kcal/day) does **not** match the July 20 PDF diet table (2.279 / 1.750,
  based on bias-corrected 2,800/2,150 kcal/day). Awaiting confirmation before updating.
