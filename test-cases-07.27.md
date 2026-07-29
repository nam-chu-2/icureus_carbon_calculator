# Calculator test cases — 2026.07.27 code

Expected values below were produced by executing `current_code/2026.07.27-all-code.js` directly
(Qualtrics/jQuery stubbed, answers injected), so they are the code's actual output — compare them
against the live survey's embedded data and against `CO2_calculator_all_jurisdictions 07.22.xlsx`.

All emissions in **t CO₂e per person per year**, rounded to 1 decimal (matching the code's
`toFixed(1)` per category; Total is the sum of the four rounded categories).

---

## Case 1 — Ontario, gas SUV, typical household
| Survey question | Answer |
|---|---|
| Country | Canada |
| Province | Ontario |
| Car access / type / size | Yes / Gas / SUV |
| Km driven / passengers | 15,000 km / 1 |
| Flights (short/med/long) | Yes: 0 / 2 / 0 |
| Diet / gender | Omnivore / Male |
| Dwelling / vintage / windows upgraded | Detached / 1960–1983 / No |
| Household size / heated area | 3 / 2,000 sqft |
| Space heat / water heat / AC | Natural gas / Natural gas / Yes |

**Expected:** Flights **1.4** · Mobility **4.7** · Diet **2.0** · Heat **2.9** · **Total 11.0**
CFs: EV 1.0 · Gas 4.7 · AvgGas 5.4 · HeatPump 0.7 · Vegan 0.6

## Case 2 — Quebec, no car, vegan, small electric apartment
| Survey question | Answer |
|---|---|
| Country / Province | Canada / Quebec |
| Car access | No |
| Flights | No |
| Diet / gender | Vegan / Female |
| Dwelling / vintage / windows | Apartment / >2000 / No |
| Household size / area | 2 / 800 sqft |
| Space heat / water heat / AC | Electric / Electric / No |

**Expected:** Flights **0.0** · Mobility **0.0** · Diet **0.5** · Heat **0.0** · **Total 0.5**
CFs: EV 0.0 · Gas 0.0 · AvgGas 3.7 · HeatPump 0.0 · Vegan 0.5
(Heat genuinely rounds to 0.0 — QC grid is 0.672 kg/GJ; household total ≈ 27 kg/yr.)

## Case 3 — Alberta, diesel truck, heat pump + gas backup, DK water
| Survey question | Answer |
|---|---|
| Country / Province | Canada / Alberta |
| Car / type / size | Yes / Diesel / Truck |
| Km / passengers | 25,000 km / 2 |
| Flights | Yes: 1 / 0 / 1 |
| Diet / gender | Flexitarian / Other ("Don't know") |
| Dwelling / vintage / windows | Detached / <1960 / Yes (upgraded) |
| Household size / area | 4 / 2,400 sqft |
| Space heat / backup | Heat pump / Natural gas backup |
| Water heat / AC | Don't know / No |

**Expected:** Flights **3.2** · Mobility **3.3** · Diet **1.3** · Heat **4.5** · **Total 12.3**
CFs: EV 1.0 · Gas 3.9 · AvgGas 5.4 · HeatPump 4.5 · Vegan 0.5

## Case 4 — Texas, gas SUV (miles), all-electric home, AC
| Survey question | Answer |
|---|---|
| Country / State | USA / Texas |
| Car / type / size | Yes / Gas / SUV |
| Miles / passengers | 12,000 mi / 1 |
| Flights | Yes: 2 / 2 / 0 |
| Diet / gender | Omnivore / Female |
| Dwelling / vintage / windows | Detached / 1984–1999 / No |
| Household size / area | 4 / 2,200 sqft |
| Space heat / water heat / AC | Electric / Electric / Yes |

**Expected:** Flights **1.6** · Mobility **6.1** · Diet **1.5** · Heat **2.0** · **Total 11.2**
CFs: EV 1.9 · Gas 6.1 · AvgGas 5.4 · HeatPump 1.8 · Vegan 0.5

## Case 5 — California, EV, heat pump only (no backup), semi-detached
| Survey question | Answer |
|---|---|
| Country / State | USA / California |
| Car / type / size | Yes / Electric / Car |
| Miles / passengers | 10,000 mi / 1 |
| Flights | Yes: 0 / 0 / 1 |
| Diet / gender | Vegetarian / Male |
| Dwelling / vintage / windows | Semi-detached / >2000 / No |
| Household size / area | 2 / 1,500 sqft |
| Space heat / backup | Heat pump / None — heat pump only |
| Water heat / AC | Natural gas / No |

**Expected:** Flights **2.6** · Mobility **0.8** · Diet **1.1** · Heat **1.2** · **Total 5.7**
CFs: EV 0.8 · Gas 3.5 · AvgGas 3.7 · HeatPump 1.2 · Vegan 0.6

## Case 6 — New York, hybrid, "Don't know" heating AND water, Other gender
| Survey question | Answer |
|---|---|
| Country / State | USA / New York |
| Car / type / size | Yes / Hybrid / Car |
| Miles / passengers | 8,000 mi / 1 |
| Flights | No |
| Diet / gender | Omnivore / Don't know |
| Dwelling / vintage / windows | Apartment / <1960 / Don't know |
| Household size / area | 1 / 900 sqft |
| Space heat / water heat / AC | Don't know / Don't know / Yes |

**Expected:** Flights **0.0** · Mobility **1.9** · Diet **1.8** · Heat **3.2** · **Total 6.9**
CFs: EV 0.5 · Gas 2.8 · AvgGas 3.7 · HeatPump 2.6 · Vegan 0.5

## Case 7 — Minnesota, heat pump + oil/propane backup, no car
| Survey question | Answer |
|---|---|
| Country / State | USA / Minnesota |
| Car access | No |
| Flights | Yes: 0 / 3 / 0 |
| Diet / gender | Flexitarian / Female |
| Dwelling / vintage / windows | Detached / <1960 / No |
| Household size / area | 2 / 1,800 sqft |
| Space heat / backup | Heat pump / Oil or propane backup |
| Water heat / AC | Natural gas / No |

**Expected:** Flights **1.9** · Mobility **0.0** · Diet **1.1** · Heat **4.8** · **Total 7.8**
CFs: EV 0.0 · Gas 0.0 · AvgGas 3.7 · HeatPump 4.8 · Vegan 0.5

## Case 8 — Puerto Rico, apartment, AC, no car/flights
| Survey question | Answer |
|---|---|
| Country / Territory | USA / Puerto Rico |
| Car access / Flights | No / No |
| Diet / gender | Omnivore / Male |
| Dwelling / vintage / windows | Apartment / >2000 / No |
| Household size / area | 3 / 1,000 sqft |
| Space heat / water heat / AC | Electric / Electric / Yes |

**Expected:** Flights **0.0** · Mobility **0.0** · Diet **2.0** · Heat **2.8** · **Total 4.8**
CFs: EV 0.0 · Gas 0.0 · AvgGas 3.7 · HeatPump 2.7 · Vegan 0.6

## Case 9 — Everything unanswered (fallback path)
All questions blank. Code falls back to: USA, region → **CA** (console warns
"Unresolved region"), no vehicle, no flights, diet blank → omnivore at "other"-gender factor,
detached / 1984–1999 / area 1 sqft / household 1 / natural-gas space+water / no AC.

**Expected:** Flights **0.0** · Mobility **0.0** · Diet **1.8** · Heat **2.0** · **Total 3.8**
CFs: EV 0.0 · Gas 0.0 · AvgGas 3.7 · HeatPump 2.0 · Vegan 0.5
(This one is survey-only — the Excel workbook has no blank-input mode, so don't expect a match there.)

## Case 10 — Nova Scotia, wood heat, 9+ household, carpool, "fly yes" with 0 flights
| Survey question | Answer |
|---|---|
| Country / Province | Canada / Nova Scotia |
| Car / type / size | Yes / Gas / Car |
| Km / passengers | 5,000 km / 4 |
| Flights | Yes, but 0 / 0 / 0 entered |
| Diet / gender | Vegetarian / Female |
| Dwelling / vintage / windows | Detached / <1960 / No |
| Household size / area | 9+ / 3,000 sqft |
| Space heat / water heat / AC | Wood / Natural gas / No |

**Expected:** Flights **0.0** · Mobility **0.3** · Diet **0.8** · Heat **0.7** · **Total 1.8**
CFs: EV 0.1 · Gas 0.3 · AvgGas 3.7 · HeatPump 2.8 · Vegan 0.5

---

## Notes for the Excel comparison
- The workbook computes with full precision and the survey rounds each category to 1 decimal
  before summing — expect the Total to differ from Excel's by up to ±0.2 from rounding alone.
- Household size 9+ (Case 10) clamps the other-electricity size factor at the "6+" bin but
  divides the household total by 9 — check the workbook does the same.
- Case 3's "Don't know" water uses the **Canada** national mix; Case 6 uses the **US** mix;
  PR/VI (Case 8 region) have their own island DK mixes.
- AvgGas_CF is always a solo gas car at 17,000 km in the respondent's region
  (ON/AB: 5.4 — SUV/truck size carried over; car-size regions: 3.7).

## Quick-reference summary

| # | Case | Flights | Mobility | Diet | Heat | Total |
|---|---|---|---|---|---|---|
| 1 | ON gas SUV | 1.4 | 4.7 | 2.0 | 2.9 | **11.0** |
| 2 | QC vegan apartment | 0.0 | 0.0 | 0.5 | 0.0 | **0.5** |
| 3 | AB truck, HP+gas backup | 3.2 | 3.3 | 1.3 | 4.5 | **12.3** |
| 4 | TX SUV all-electric home | 1.6 | 6.1 | 1.5 | 2.0 | **11.2** |
| 5 | CA EV, HP only | 2.6 | 0.8 | 1.1 | 1.2 | **5.7** |
| 6 | NY DK heat/water | 0.0 | 1.9 | 1.8 | 3.2 | **6.9** |
| 7 | MN HP+oil backup | 1.9 | 0.0 | 1.1 | 4.8 | **7.8** |
| 8 | Puerto Rico | 0.0 | 0.0 | 2.0 | 2.8 | **4.8** |
| 9 | All blank | 0.0 | 0.0 | 1.8 | 2.0 | **3.8** |
| 10 | NS wood, 9+ hh | 0.0 | 0.3 | 0.8 | 0.7 | **1.8** |
