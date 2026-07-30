# How the further-set airfares were produced

**File:** `further_set_airfares.xlsx` · **Generator:** `build_further_set_fares.py` · **Produced:** 2026-07-29

## 1. What the numbers are

Approximate **July high-season economy round-trip fares** from every Canadian FSA (1,650 rows, **CAD**) and every US ZIP3 (919 rows, **USD**) to the two cities of that region's "further set":

| Country | Set A | Set B |
|---|---|---|
| Canada | Vancouver, BC + Calgary, AB | Toronto, ON + Montréal, QC |
| US | San Francisco, CA + Denver, CO | New York City, NY + Boston, MA |

Each row gets two fares — one per destination city of its set. Example: FSA K2H (Nepean) is Set A → Vancouver ~CA$790 and Calgary ~CA$730.

## 2. Inputs

| Source (in `part 2/spreadsheets/`) | Used for |
|---|---|
| `canada_fsa_flight_destinations.csv` | FSA list + `further_set` (A/B), taken as-is, not recomputed |
| `co2_emissions.csv` | FSA → `nearest_airport_city` (46 distinct origin airports) |
| `us_zip3_climate_footprint_US_ZIP3_Summary_v2_web.xlsx` | ZIP3 list + `Further Set` + `Airport IATA` (113 distinct origins) |
| `airport_coords.csv` (this folder) | Coordinates for all 154 origin/destination airports, extracted from OpenFlights `airports.dat` |

## 3. Why fares were modeled, not all queried

The row-level combinations reduce to ~630 distinct origin-airport → destination routes — too many to query individually. Instead, the **London-workbook methodology** was applied to a calibration sample and generalized by distance:

1. **Advance-purchase proxy dates.** July 2027 is beyond Google Flights' ~11-month bookable window, and pricing July 2026 in late July 2026 would embed a last-minute premium. So all quotes use **May 12–26, 2027** travel (~10-month booking lead), queried 2026-07-29.
2. **Live calibration quotes.** 18 Google Flights round-trip economy quotes (lowest fare shown per route), CAD for Canadian routes and USD for US routes, spanning ~700–4,400 km and different airport types.
3. **Distance fit.** Per country, least-squares `fare = a + b × km` over great-circle (haversine) airport-to-airport distance, fitted on competitive "major" origins only.
4. **Competition premiums.** Residuals of the non-major calibration routes set fixed premiums per origin tier (competition turned out to matter more than distance — see §5).
5. **July uplift.** Modeled advance fare × **1.13** (May shoulder → July peak, same factor as the London workbook), rounded to the nearest $10.

## 4. Calibration quotes

**Canada (CAD)** — fitted line `fare = 419 + 0.0751 × km`, floor CA$332:

| Route | km | Fare | Tier |
|---|---|---|---|
| YQB–YYZ | ~700 | 662 | major |
| YHZ–YYZ | ~1,265 | 332 | major (Flair) |
| YWG–YYZ | ~1,505 | 352 | major (Flair) |
| YZF–YVR | ~1,440 | 610 | major |
| YXE–YUL | ~2,600 | 731 | major |
| YOW–YVR | ~3,540 | 640 | major |
| YHZ–YVR | ~4,420 | 776 | major |
| YQT–YVR | ~2,320 | 860 | regional → premium **+CA$256** |
| YBG–YVR | ~3,690 | 1,124 | monopoly → premium **+CA$420** (mean w/ YZV) |
| YZV–YVR | ~4,080 | 1,135 | monopoly (same premium) |

**US (USD)** — fitted slope came out slightly negative (transcon competition), so the model is clamped **flat at $370**, floor $339:

| Route | km | Fare | Tier |
|---|---|---|---|
| MSP–JFK | ~1,640 | 339 | major |
| STL–DEN | ~1,240 | 377 | major |
| FSD–JFK | ~1,750 | 381 | major (mid-size prices like major) |
| ATL–DEN | ~1,940 | 433 | major |
| JFK–DEN | ~2,610 | 367 | major |
| ORD–SFO | ~2,970 | 345 | major |
| JFK–SFO | ~4,150 | 379 | major |
| BOS–SFO | ~4,340 | 339 | major |
| GJT–JFK | ~2,760 | 443 | small → premium **+$118** (mean w/ MOT) |
| MOT–JFK | ~2,330 | 532 | small (same premium) |

**Held-out sanity checks** (live quotes not used in the fit): YEG–YYZ CA$487 (Flair; mainline CA$587) vs model CA$621 advance; DEN–BOS US$247 (1-stop; nonstops $275–378) vs model $370. Both within the stated uncertainty band.

## 5. Origin airport tiers

Fares depend more on carrier competition than on distance (Halifax–Toronto with Flair: CA$332; Saguenay–Vancouver on an Air Canada monopoly: CA$1,124). Every origin airport is therefore assigned a tier (full lists at the top of `build_further_set_fares.py`):

- **Canada — major** (fit line, no premium): mainline-jet-competitive airports, incl. Yellowknife and Whitehorse (YZF tested at only CA$610).
- **Canada — regional** (+CA$256): regional airports with some competition (Thunder Bay, Sudbury, Deer Lake, Prince George, Fort McMurray, …).
- **Canada — monopoly** (+CA$420): single-operator regional feed (Saguenay, Sept-Îles, Baie-Comeau, Îles-de-la-Madeleine, Smithers, Prince Rupert).
- **Canada — northern/fly-in** (+CA$420, flagged): Resolute, Cambridge Bay, Puvirnituq, Hopedale, Attawapiskat, Pickle Lake, Radisson, Norman Wells, Thompson. Google Flights returned **no bookable fares** for Resolute, so no premium could be calibrated — these ~20 rows reuse the monopoly premium and are explicitly **lower bounds**, flagged in the Note column.
- **US — major** (flat $370): large/medium airports and mid-size ones (Sioux Falls confirmed mid-size prices like majors).
- **US — small** (+$118): small non-hub airports with limited competition (Minot, Grand Junction, Amarillo, Rapid City, Jackson Hole, …).

## 6. Row assembly

For each FSA/ZIP3: further set (from source) → its two destination cities → origin airport (from source) → haversine km to each destination airport → country fit + tier premium, floored at the country's cheapest calibrated fare → ×1.13 → round to nearest $10. Notes flag premium tiers, northern lower bounds, cross-border US ZIP3s that use Canadian airports (YOW/YQB/YUL/YYZ), and any origin-equals-destination anomaly (none occurred).

## 7. Accuracy and caveats

- Treat values as **±20–25%** — wider than a single-route live quote because the fit averages over large competition-driven scatter (ULCC-served routes price at roughly half of monopoly routes at the same distance).
- **Northern fly-in rows are lower bounds**, not estimates.
- Summer leisure capacity (Air Transat, Flair) can hold July fares down on some routes; July is not always the priciest month.
- The source `nearest_airport_city` maps some FSAs to a farther major airport (e.g., Ottawa/Kingston → Montréal). Followed as-is; fare impact ~CA$10 at these distances.
- US fares are modeled flat with distance; individual hub-to-hub routes (like DEN–BOS) can undercut the model by ~$100.

## 8. Reproducing / updating

```
python build_further_set_fares.py
```

Calibration quotes (`CAL`), held-out checks (`HOLDOUT`), tier sets (`TIER_CA`, `TIER_US_SMALL`), the uplift, and the city→airport map are constants at the top of the script. To refresh: re-query the same routes on Google Flights (`&curr=CAD`/`&curr=USD`), replace the fares, and re-run. The Calibration tab of the workbook records every quote, the fitted coefficients, and residuals.
