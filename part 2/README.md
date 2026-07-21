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
