# Part 2 — US ZIP3 Climate Footprint Data Notes

File: `spreadsheets/us_zip3_climate_footprint(US ZIP3 Summary).csv` (919 records)

## File versions

All three files contain identical data (919 records × 51 columns, including the cleaned missing values, `fly_dest` columns, and 15 tax columns described below). Dates are 2026.

| File | Created | Description |
|---|---|---|
| `us_zip3_climate_footprint(US ZIP3 Summary).csv` | Jul 21 | Source CSV, updated in place (missing values → 0, `fly_dest_1–5` and 15 tax columns added). |
| `us_zip3_climate_footprint_US_ZIP3_Summary_v1.xlsx` | Jul 21 | First Excel conversion of the CSV. ZIP3 stored as text (preserves leading zeros); all other numeric fields stored as numbers. |
| `us_zip3_climate_footprint_US_ZIP3_Summary_v2_web.xlsx` | Jul 21 | Excel for the web version. Same content as v1, plus a URL-safe filename (no spaces/parentheses) and document properties (title, creator) for OneDrive/SharePoint. Use this one for Excel for the web. |
| `us_zip3_tax_summary.csv` | Jul 21 | Trimmed extract (919 records × 25 columns): ZIP3, Location, Dest 1, Dest 2, Airport City, fly_dest_1–5, and the 15 carbon tax columns. |

## Missing values replaced with 0

The following cells were blank in the source data and have been set to `0`. All of these are drive-distance/drive-time fields for territories or remote areas (Puerto Rico, US Virgin Islands, Hawaii, Alaska) where driving to the destination is not possible, so a 0 should be interpreted as "not drivable," not as a true zero distance.

| Column | Count | ZIP3 codes affected |
|---|---|---|
| D1 Drive km | 7 | 006, 007, 008, 009, 967, 968, 969 |
| D1 Drive hrs | 7 | 006, 007, 008, 009, 967, 968, 969 |
| D2 Drive km | 12 | 006, 007, 008, 009, 967, 968, 969, 995, 996, 997, 998, 999 |
| D2 Drive hrs | 12 | 006, 007, 008, 009, 967, 968, 969, 995, 996, 997, 998, 999 |

No other columns contained missing values (in particular, all five CO2e columns were complete).

## Columns added

### Flight destinations (`fly_dest_1` … `fly_dest_5`)

| Column | Further Set = A | Further Set = B |
|---|---|---|
| fly_dest_1 | Vancouver, Canada | Toronto, Canada |
| fly_dest_2 | San Francisco, United States | New York City, United States |
| fly_dest_3 | London, England | London, England |
| fly_dest_4 | Paris, France | Paris, France |
| fly_dest_5 | Tokyo, Japan | Tokyo, Japan |

Note: the file already contained similar `flight_dest_1` … `flight_dest_5` columns. Those were left untouched; they differ from the new columns only in that `flight_dest_2` uses "New York, United States" (not "New York City, United States") for Set B rows.

### Carbon tax columns (15 total)

Rates come from `spreadsheets/footprint_parameters_June_16 pm(Tax Regimes).csv`: US_1 = $21/tCO2e, US_2 = $190/tCO2e, US_3 = $759/tCO2e.

For each of the five CO2e columns (`CO2e CDG kg`, `CO2e LHR kg`, `CO2e NRT kg`, `CO2e Set1 kg`, `CO2e Set2 kg`):

```
Tax <dest> <regime> = (CO2e kg / 1000) × regime rate, rounded to 2 significant figures
```

Resulting columns: `Tax CDG US_1`, `Tax LHR US_1`, `Tax NRT US_1`, `Tax Set1 US_1`, `Tax Set2 US_1`, and the same five for `US_2` and `US_3`.

Example (ZIP3 005): CO2e CDG = 1430.51 kg = 1.43051 t → US_1: 30, US_2: 270, US_3: 1100.

## Session log — 2026-07-21

Everything above was produced in this session. Sequence of work:

1. **Cleaned the source CSV in place** (`us_zip3_climate_footprint(US ZIP3 Summary).csv`): replaced 38 blank cells with 0 (drive columns only — see table above) and verified no blanks remain anywhere in the file.
2. **Added `fly_dest_1–5`** based on the `Further Set` column (714 rows are Set A, 205 are Set B).
3. **Added the 15 carbon tax columns** using rates from `footprint_parameters_June_16 pm(Tax Regimes).csv`, with kg→ton conversion and 2-significant-figure rounding.
4. **Converted to Excel** (`_v1.xlsx`), then saved a web-compatible copy (`_v2_web.xlsx`) for Excel for the web — v2 still needs to be uploaded to OneDrive/SharePoint to actually open it there.
5. **Created the trimmed extract** `us_zip3_tax_summary.csv` (25 columns).

### Open items / things to decide next time

- **Duplicate destination columns:** the source CSV still carries the pre-existing `flight_dest_1–5` columns alongside the new `fly_dest_1–5`. They match except `flight_dest_2` says "New York, United States" for Set B rows instead of "New York City, United States". Decide whether to drop `flight_dest_1–5`.
- The xlsx versions (v1, v2_web) were generated **before** deciding the duplicate-column question — if `flight_dest_1–5` gets dropped from the CSV, regenerate both xlsx files and the trimmed extract.
- `us_zip3_tax_summary.csv` has no xlsx counterpart yet; create one if it also needs to be viewed in Excel for the web.
- Untouched inputs in this folder: `canada_fsa_flight_destinations.csv` and `co2_emissions.csv` (nothing was done with these).

### How the derived files were built

All transformations were plain Python (csv + openpyxl, no pandas required). Key details to reproduce or extend:

- Read/write the CSV with `encoding='utf-8-sig'` (the file has a BOM).
- 2-sig-fig rounding: `float(f'{x:.2g}')`.
- In xlsx output, the ZIP3 column is written as text (number format `@`) to preserve leading zeros; all other numerics are real numbers.
