# Home-Energy (Heating) Test Scenarios

Test cases for the residential-energy model in `current_code/2026.06.22-all-code.js`.
Each scenario lists the survey inputs (with Qualtrics recodes), the per-component
breakdown, the **household** total, and the **per-person** figure (per person is
what the chart and the `Heat` embedded-data value show).

_Last updated: 2026-06-25._

## Model summary

Home energy = **Space heating + Water heating + Air conditioning + Other electricity**,
computed as a household total (kg CO₂e/yr) and then **divided by household size**
for the per-person figure.

| Component | Household-size factor? | Scales with | ÷ household size? |
|---|---|---|---|
| Space heating | — | floor area, vintage, dwelling, retrofit, fuel | Yes |
| Water heating | **No** (`water_factor_ref` optional, not applied) | region, dwelling, fuel | Yes |
| Air conditioning | — | floor area, vintage, dwelling, retrofit, grid | Yes |
| Other electricity | **Yes** (`other_elec_factor`, mean-normalized, clamped at "6+") | region, household size, grid | Yes |

**Household-size factors (RECS 2020, normalized to mean = 1):**

| Household size | other_elec_factor (applied) | water_factor_ref (optional, not applied) |
|---|---|---|
| 1 | 0.66 | 0.64 |
| 2 | 1.00 | 0.95 |
| 3 | 1.17 | 1.21 |
| 4 | 1.30 | 1.40 |
| 5 | 1.41 | 1.52 |
| 6+ | 1.51 | 1.55 |

Household sizes **6, 7, 8, 9+** all reuse the **"6+"** factor (index clamped to 6),
but the per-person division uses the **actual** household size (1–9).

## Scenario inputs (survey recodes)

| # | Country/Region | q37 | q38/q39 | Vintage (q33) | Dwelling (q40) | Heat (q36) | Water (q42) | Retrofit (q41) | AC (q43) | Size (q34) | Area sqft (q35) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Canada / ON | 1 | q38=1 | 2000+ (4) | Detached (3) | Gas (1) | Gas (1) | No (2) | No (2) | 1 | 1500 |
| B | Canada / ON | 1 | q38=1 | 2000+ (4) | Detached (3) | Gas (1) | Gas (1) | No (2) | No (2) | 4 | 1500 |
| C | Canada / AB | 1 | q38=3 | pre-1960 (1) | Detached (3) | Gas (1) | Gas (1) | No (2) | Yes (1) | 2 | 2200 |
| D | Canada / QC | 1 | q38=2 | 1984-1999 (3) | Apartment (1) | Electric (2) | Electric (2) | No (2) | No (2) | 1 | 800 |
| E | USA / NY | 2 | q39=4 | 1960-1983 (2) | Semi-det. (2) | Heat pump (3) | Electric (2) | No (2) | Yes (1) | 3 | 1600 |
| F | USA / CO | 2 | q39=2 | 2000+ (4) | Detached (3) | Oil/Prop. (4) | Gas (1) | No (2) | Yes (1) | 5 | 2000 |
| G | Canada / BC | 1 | q38=4 | 1960-1983 (2) | Detached (3) | Wood (5) | Electric (2) | Yes (1) | No (2) | 2 | 1800 |
| H | USA / MI | 2 | q39=3 | pre-1960 (1) | Detached (3) | Don't know (6) | Don't know (3) | No (2) | Yes (1) | 4 | 2000 |
| I | Canada / ON | 1 | q38=1 | 2000+ (4) | Detached (3) | Gas (1) | Gas (1) | No (2) | No (2) | 6 | 1500 |
| J | Canada / ON | 1 | q38=1 | 2000+ (4) | Detached (3) | Gas (1) | Gas (1) | No (2) | No (2) | 9 | 1500 |

**Recode key:** q33 {1=pre-1960, 2=1960-83, 3=1984-99, 4=2000+}; q40 {1=Apartment,
2=Semi-detached→"attached", 3=Detached}; q41 {1=Yes→0.85 demand, 2=No→1.0,
3=Unsure→1.0}; q42 {1=Gas, 2=Electric, 3=Don't know}; q43 {1=Yes, 2=No};
q38 {1=ON, 2=QC, 3=AB, 4=BC}; q39 {1=WA, 2=CO, 3=MI, 4=NY}.

## Expected results

Component breakdown is in **kg CO₂e/yr**; household and per-person are in **t CO₂e/yr**
(rounded to 1 decimal, as the app reports).

| # | Scenario (size) | space | water | ac | other | **Household** | **Per person** |
|---|---|---|---|---|---|---|---|
| A | ON detached gas, 1 | 3270 | 1181 | 0 | 118 | **4.6 t** | **4.6 t** (÷1) |
| B | ON detached gas, 4 | 3270 | 1181 | 0 | 232 | **4.7 t** | **1.2 t** (÷4) |
| C | AB detached pre-1960 +AC, 2 | 13380 | 2088 | 292 | 2573 | **18.3 t** | **9.2 t** (÷2) |
| D | QC apartment electric, 1 | 16 | 6 | 0 | 9 | **0.0 t** | **0.0 t** (÷1) |
| E | NY attached heatpump +AC, 3 | 1540 | 923 | 577 | 1426 | **4.5 t** | **1.5 t** (÷3) |
| F | CO detached oil/gas +AC, 5 | 3513 | 1350 | 711 | 4722 | **10.3 t** | **2.1 t** (÷5) |
| G | BC detached wood retrofit, 2 | 96 | 96 | 0 | 93 | **0.3 t** | **0.1 t** (÷2) |
| H | MI detached Don't-know +AC, 4 | 7140 | 1412 | 986 | 3368 | **12.9 t** | **3.2 t** (÷4) |
| I | ON detached gas, 6 | 3270 | 1181 | 0 | 270 | **4.7 t** | **0.8 t** (÷6) |
| J | ON detached gas, 9 | 3270 | 1181 | 0 | 270 | **4.7 t** | **0.5 t** (÷9) |

## What each scenario tests

- **A vs B** — same house, 1 vs 4 people. Water is identical (not size-scaled);
  other-electricity rises (0.66 → 1.30); the household total barely changes, but
  per-person drops sharply via the ÷size division.
- **C** — Alberta's high-carbon grid + old detached + AC: a high-emitter check.
- **D** & **G** — clean grids (QC hydro, BC) / wood heat: near-zero rounding cases;
  confirms nothing divides-by-zero or goes negative.
- **E** — heat-pump path (uses COP) + electric water + AC on a US grid.
- **F** — oil/propane space heat + gas water + AC, 5 people.
- **H** — exercises **both** "Don't know" blends (`dkSpaceCoef` / `dkWaterCoef`).
- **I vs J** — the **clamp** wrinkle. Sizes 6 and 9+ both read the "6+" other-elec
  factor (1.51), so the **household total is identical (4.7 t)**, while per-person
  divides by the actual size (÷6 → 0.8 t vs ÷9 → 0.5 t).

## Worked example — Scenario A (ON · detached · 2000+ · gas heat · gas water · 1 person · 1500 sqft)

Constants: area 1500 sqft → 139.354 m²; grid ON = 13.9556 kg/GJ; FUEL_NG = 63.28 kg/GJ.

```
Space heating:
  useful = SPACE_DEMAND["ON|2000+"](0.33) × 139.354 m² × envelope(1.0) × retrofit(1.0)
         = 45.99 GJ
  fuel   = 45.99 / gas_eff_ON(0.89) = 51.67 GJ
  kg     = 51.67 × FUEL_NG(63.28)   = 3270 kg

Water heating (NOT size-scaled):
  useful = WATER_DEMAND["ON|detached"](11.2) = 11.2 GJ
  fuel   = 11.2 / WATER_EFF.naturalgas(0.60) = 18.67 GJ
  kg     = 18.67 × FUEL_NG(63.28)            = 1181 kg

Air conditioning: AC off → 0 kg

Other electricity (size factor applied):
  GJ = OTHER_BASE["ON"](12.8) × other_elec_factor[1](0.66) = 8.448 GJ
  kg = 8.448 × grid_ON(13.9556) = 118 kg

Household total = 3270 + 1181 + 0 + 118 = 4569 kg = 4.6 t
Per person      = 4569 / 1 / 1000      = 4.6 t
```
