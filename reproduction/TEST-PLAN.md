# Carbon Calculator — Test Plan Template

A template of all the test cases worth running against the calculator
(`reproducing-code.js` / `all-graphs-organized.js`). Built around **equivalence
classes and boundaries** rather than every literal combination (8 regions × 5
fuels × 3 sizes × … is too many to enumerate), so each row exercises one
distinct code path.

## How to use this
1. Pick the inputs for a row, set them as `qData` values (locally) or answer the
   matching questions in a Qualtrics preview.
2. Read the result. The code already logs it — open the browser console and look
   for the `*********G_FlightChartValue, …` line (the four components + total)
   and the `*********G_SurveySettings:` state dump.
3. Fill in **Actual** and mark **✅/❌**. For a fail, note the component that's off.
4. When the questionnaire changes, add rows (see *Extensibility* at the bottom).

> Tip: the four component logs are your oracle. If a **total** looks wrong but
> every component is right, suspect the round-then-sum step, not the inputs.

---

## Input legend (Qualtrics recode → label)

| qData | Question | Recode → value |
|-------|----------|----------------|
| `q1`  | Car access | 1=Yes, 2=No |
| `q2`  | Fuel type | 1=petrol(gas), 2=diesel, 3=hybrid, 4=**phev**, 5=battery(electric) |
| `q3`  | Car size | 1=car, 2=truck, 3=suv |
| `q4`/`q5` | Distance | km (Canada) / miles (USA), numeric text |
| `q6`  | Passengers | numeric text (clamped to ≥1) |
| `q7`  | Will fly? | 1=Yes, 2=No |
| `q8`–`q31` | Flight counts | numeric text, per region × haul |
| `q32` | Diet | 1=omnivore, 2=flexitarian, 3=vegetarian, 4=vegan |
| `q33` | Building age | 1=old(<1960), 2=mid(1960–83), 3=new(>83), blank="" |
| `q34` | Household size | 1–10 |
| `q35` | House size | sqft, numeric text (clamped to ≥1) |
| `q36` | Heating | 1=oil, 2=gas, 3=**hydro**(electric), 4=heatpump, 5=wood, 6=unknown |
| `q37` | Country | 1=Canada, 2=USA |
| `q38` | Province | 1=ON, 2=QC, 3=AB, 4=BC |
| `q39` | State | 1=WA, 2=CO, 3=MI, 4=NY |

**Region drives a lot:** flight question routing, grid intensity (hydro/heatpump
heating + phev/battery vehicles), and building-standard table all key off region.

---

## A. Smoke tests (happy path, full profile)

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| A1 | Canada / ON, omnivore, gas car, flies, gas heat | q37=1,q38=1,q1=1,q2=1,q3=1,q4=15000,q6=1,q7=1,q8=2,q16=1,q24=0,q32=1,q33=1,q34=1,q35=1000,q36=2 | All 4 components > 0, total = their rounded sum | | |
| A2 | USA / NY, vegan, no car, no flights, electric heat | q37=2,q39=4,q1=2,q7=2,q32=4,q33=3,q34=2,q35=1500,q36=3 | vehicle=0, flight=0, diet=0.5, heat region-scaled by NY grid | | |

---

## B. Country & region routing

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| B1 | Canada → uses q4 (km), q38 | q37=1,q38=2 | region=QC, mileage read from q4 | | |
| B2 | USA → uses q5 (miles), q39 | q37=2,q39=1 | region=WA, mileage read from q5, ×1.60934 applied | | |
| B3 | Each Canada province | q38 = 1,2,3,4 | region = ON/QC/AB/BC respectively | | |
| B4 | Each USA state | q39 = 1,2,3,4 | region = WA/CO/MI/NY respectively | | |
| B5 | Blank country (q37="") | q37="" | isCanada=false → treated as USA path | | |

---

## C. Vehicle (ground mobility)

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| C1 | No car access (gate) | q1=2 | fuelType="novehicle" → vehicle=0 | | |
| C2 | Petrol car | q1=1,q2=1,q3=1 | uses petrol/car factor | | |
| C3 | Diesel truck | q1=1,q2=2,q3=2 | uses diesel/truck factor | | |
| C4 | Hybrid suv | q1=1,q2=3,q3=3 | uses hybrid/suv factor | | |
| C5 | **PHEV [Q1]** | q1=1,q2=4,q3=1 | non-zero (maps to lowercase "phev") — regression guard | | |
| C6 | Battery (EV) | q1=1,q2=5,q3=1 | uses region battery factor | | |
| C7 | Miles conversion (USA) | q37=2,q39=1,q1=1,q2=1,q5=10000 | mileage treated as ×1.60934 km | | |
| C8 | Passengers divide | q6=4 | emissions = single-occupant / 4 | | |
| C9 | Passengers blank/0 | q6="" or q6=0 | clamped to 1 (no divide-by-zero) | | |
| C10 | Zero mileage | q1=1,q4=0 | vehicle=0 | | |
| C11 | **Rounding [Q3]** | any driver | result rounded to 1 decimal | | |

---

## D. Flight

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| D1 | No fly (gate) | q7=2 | flight=0, flownStatus=false | | |
| D2 | Short haul only | q7=1, region=ON, q8=3 | 3 × short factor | | |
| D3 | Medium haul only | q7=1, region=ON, q16=2 | 2 × medium factor | | |
| D4 | Long haul only | q7=1, region=ON, q24=1 | 1 × long factor (2.991917) | | |
| D5 | Region routing — short | q7=1, region=QC, q9=1 | reads **q9** not q8 | | |
| D6 | Region routing — long (note swapped q25/q26) | q7=1, region=AB, q25=1 | AB long = **q25** | | |
| D7 | All hauls combined | q7=1, q8=1,q16=1,q24=1 | sum of all three factors | | |
| D8 | Blank flight counts | q7=1, q8="" | parses to 0 | | |

---

## E. Heating

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| E1 | Oil | q36=1 | uses oil factor/efficiency | | |
| E2 | Gas | q36=2 | uses gas factor/efficiency | | |
| E3 | Electric (hydro) — region grid | q36=3, region=QC vs AB | QC ≈ near-zero (grid 0.472), AB high (136) | | |
| E4 | Heat pump — region grid + COP | q36=4 | factor=grid intensity, efficiency=2.74 | | |
| E5 | Wood | q36=5 | near-zero factor (0.001) | | |
| E6 | Unknown | q36=6 | defaults to gas factor (50.149), eff 0.9 | | |
| E7 | Blank heating type | q36="" | defaults to gas factor, eff 0.9 | | |
| E8 | Building age old/mid/new | q33=1/2/3 | scales by region's old/mid/new | | |
| E9 | **Blank building age in QC** | q38=2,q33="" | works → uses "" key (0.56) | | |
| E10 | **Blank building age outside QC [Q2]** | q38=1,q33="" | **NaN heating → NaN total** (preserved quirk!) | | |
| E11 | Household divide | q34=4 | per-person = total / 4 | | |
| E12 | Household blank | q34="" | clamped to 1 | | |
| E13 | House size scaling | q35=2000 vs 1000 | roughly 2× heating | | |
| E14 | House size blank | q35="" | clamped to 1 sqft | | |

---

## F. Diet

| ID | Scenario | Key inputs | Expected | Actual | ✅/❌ |
|----|----------|-----------|----------|--------|------|
| F1 | Omnivore | q32=1 | 1.6279 → 1.6 | | |
| F2 | Flexitarian | q32=2 | 1.23735 → 1.2 | | |
| F3 | Vegetarian | q32=3 | 0.8468 → 0.8 | | |
| F4 | Vegan | q32=4 | 0.5037 → 0.5 | | |
| F5 | Blank diet | q32="" | defaults to omnivore (1.6) — needs `""` key | | |

---

## G. Rounding & total

| ID | Scenario | Expected | Actual | ✅/❌ |
|----|----------|----------|--------|------|
| G1 | Each component rounded to 1 dp before summing | components shown to 1 dp | | |
| G2 | Total = round(sum of pre-rounded components) | round-then-sum-then-round | | |
| G3 | A whole value formats with trailing .0 in embedded data | e.g. "3.0" not "3" | | |

---

## H. Counterfactuals (embedded data)

| ID | Field | Definition | Expected | Actual | ✅/❌ |
|----|-------|-----------|----------|--------|------|
| H1 | `EV_CF` | their drive, swapped to battery | ≤ Gas_CF; 0 if no vehicle | | |
| H2 | `Gas_CF` | their drive, swapped to petrol | ≥ EV_CF; 0 if no vehicle | | |
| H3 | `Avg_Gas_CF` | petrol, 17,000 km, solo | **non-zero even for non-drivers** | | |
| H4 | `HeatPump_CF` | their home, swapped to heat pump | uses grid + 2.74 COP | | |
| H5 | `Vegan_CF` | vegan regardless of diet | always 0.5 | | |
| H6 | Avg_Gas_CF unit independence | same tonnes for CA(km) and US(miles) respondents | identical | | |

---

## I. Interactive toggles (chart page)

| ID | Toggle | Action | Expected | Actual | ✅/❌ |
|----|--------|--------|----------|--------|------|
| I1 | flight | "current" | uses real flight value | | |
| I2 | flight | "additional" | +3 t (one long-haul) | | |
| I3 | flight | "noflight" | flight bar → 0 | | |
| I4 | heating | switch oil → heatpump | **efficiency follows type [Q4]** (uses 2.74, not old eff) | | |
| I5 | vehicle | switch to battery | bar drops to EV factor | | |
| I6 | diet | switch to vegan | diet bar → 0.5 | | |
| I7 | y-axis | toggle any | max stays frozen (set at load incl. +flight headroom) | | |
| I8 | total title | any toggle | title total updates to new sum | | |

---

## J. Embedded data write-out (verify all 10 fields populate)

`Flights`, `Mobility`, `Diet`, `Heat`, `GHG_Total`, `EV_CF`, `Gas_CF`,
`Avg_Gas_CF`, `HeatPump_CF`, `Vegan_CF`.

| ID | Check | Expected | Actual | ✅/❌ |
|----|-------|----------|--------|------|
| J1 | All 10 set on the run page | non-empty, 1-decimal strings | | |
| J2 | Available to a **later** page (pipe `${e://Field/GHG_Total}`) | renders the value | | |
| J3 | NOT piped on the same page | (won't work — server resolves before JS) | | |
| J4 | `#footprint` shows total on intro page | "X.X t CO₂" injected | | |

---

## K. Cross-cutting edge cases

| ID | Scenario | Expected | Actual | ✅/❌ |
|----|----------|----------|--------|------|
| K1 | Everything blank / unanswered | no crash; diet→omnivore, sizes→1; **but [Q2] NaN if non-QC + blank q33** | | |
| K2 | All max values (10+ flights, big house, 30k km) | large but finite total | | |
| K3 | Non-driver but flies a lot | vehicle=0, flight large | | |
| K4 | Driver but no flights | flight=0, vehicle large | | |
| K5 | Multi-select recode (e.g. "1,3") into a single-choice field | reads first / array — confirm intended | | |

---

## Extensibility — when the questionnaire changes

For each addition, update the code **and** add the matching test rows:

- **New region (province/state):** add to `GRID_INTENSITY`, `BUILDING_STANDARD_BY_REGION`,
  `VEHICLE_FACTOR_BY_REGION`, the three `*_HAUL_QUESTION_BY_REGION` maps, and
  `OPTIONS.canadaProvince`/`usaState`. → add B-, D5/D6-, E3/E4-style rows.
- **New fuel type:** add to `OPTIONS.fuelType` (lowercase!) and every region in
  `VEHICLE_FACTOR_BY_REGION`. → add a C-row + an EV/Gas-style CF check.
- **New diet:** add to `OPTIONS.diet` and `DIET_FACTOR_TONNES`. → add an F-row.
- **New heating type:** add to `OPTIONS.heatingType`, `HEATING_FACTOR`,
  `HEATING_EFFICIENCY`, and the `knownHeating` toggle list. → add an E-row + I4-style toggle.
- **New haul/flight question:** extend the `*_HAUL_QUESTION_BY_REGION` map and
  `FLIGHT_FACTOR_TONNES`. → add a D-row.
- **New embedded-data / counterfactual:** add a calc fn + `setEmbeddedData` call.
  → add an H-row + J-row.

**Regression guards to keep green:** C5 (Q1/phev), C11 & G1–G2 (Q3 rounding),
I4 (Q4 efficiency-follows-type). **Known-preserved quirk:** E10/K1 (Q2 NaN for
blank building age outside QC) — decide per release whether to finally fix it.
