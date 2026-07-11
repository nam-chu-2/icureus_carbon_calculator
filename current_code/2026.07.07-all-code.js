/* This file is a reproduction of the graph and intro text code that calculates the user's carbon emissions. There are a few phases with this code:

1. Capture
- Captures the user's responses from the survey. 

2. Convert
- Converts the user's responses to an estimated carbon footprint using four emissions categories: 1) Diet 2) Flight 3) Ground Mobility 4) 
3. Create
- Creates a stacked bar chart to visualize these emissions
4. Counterfactual 
- Allows the user to use radiobuttons to play around with their emissions
*/

/* Qualtrics Questions API - Adding the following line instantiates an object within the Question's class. 
*/

Qualtrics.SurveyEngine.addOnReady(function(){
const qData = {
    q1: "${q://QID123/SelectedChoicesRecode}", // Car Access: {Yes: 1, No: 2}
    q2: "${q://QID2/SelectedChoicesRecode}", // Type of car: {Gas: 1, Diesel: 2, Hybrid: 3, Plug-in hybrid: 4, Electric: 5}
    q3: "${q://QID3/SelectedChoicesRecode}", // Size of car: {Car: 1, Truck: 2, SUV: 3}
    q4: "${q://QID4/ChoiceNumericEntryValue/1}", // Kilometers driven: 0 - 30,000 +
    q5: "${q://QID302/ChoiceNumericEntryValue/1}", // Miles driven: 0 - 39,000 + 
    q6: "${q://QID357/ChoiceTextEntryValue}",// How many people do you drive with? (Numeric)
    q7: "${q://QID10/SelectedChoicesRecode}", // Do you expect to fly: {Yes: 1, No: 2}
    q8: "${q://QID390/ChoiceTextEntryValue}", // Number of short haul flights 
    q9: "${q://QID391/ChoiceTextEntryValue}", // Number of medium haul flights
    q10: "${q://QID392/ChoiceTextEntryValue}", // Number of long haul flights
    q11: "${q://QID21/SelectedChoicesRecode}", // Diet: {Omnivore: 1, Flexitarian: 2, Vegetarian: 3, Vegan: 4}
    q12: "${q://QID386/SelectedChoicesRecode}", // {Apartment: 1, Semi-detached: 2, Detached: 3}
    q13: "${q://QID23/SelectedChoicesRecode}", // Last built: {< 1960: 1, 1960-1983: 2, 1984-1999: 3, >2000: 4}
    q14: "${q://QID387/SelectedChoicesRecode}", // Upgraded windows {Yes: 1, No: 2, Don't know: 3}
    q15: "${q://QID24/SelectedChoicesRecode}", // Number of people in household: {1: 1, 2: 2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9+:9}
    q16: "${q://QID25/ChoiceTextEntryValue}", // heated area of primary residence
    q17: "${q://QID26/SelectedChoicesRecode}", // main home heating: {natural gas: 1, electric: 2, heat pump: 3, heating oil: 4, wood: 5, don't know: 6}
    q18: "${q://QID388/SelectedChoicesRecode}", // main water heating source: {natural gas: 1, electric: 2, don't know: 3}
    q19: "${q://QID389/SelectedChoicesRecode}", // AC in home? {Yes: 1, No: 2}
    q20: "${q://QID1720071878/SelectedChoicesRecode}", // gender: {Male: 1, Female: 2, Don't know: 3}
    q21: "${q://QID1720071882/SelectedChoicesRecode}", // province: {Alberta: 1, British Columbia: 2, Manitoba: 3, New Brunswick: 4, Newfoundland: 5, Northwest: 6, Nova Scotia: 7, Nunavut: 8, Ontario: 9, PEI: 10, Quebec: 11, Saskatchewan: 12, Yukon: 13}
    q22: "${q://QID1720071883/SelectedChoicesRecode}", // state / us territory. All states/territories, in alphabetical order and recoded appropriately
    /*
    Alabama
    Alaska
    Arizona
    Arkansas
    California
    Colorado
    Connecticut
    Delaware
    District of Columbia
    Florida
    Georgia
    Guam
    Hawaii
    Idaho
    Illinois
    Indiana
    Iowa
    Kansas
    Kentucky
    Louisiana
    Maine
    Maryland
    Massachusetts
    Michigan
    Minnesota
    Mississippi
    Missouri
    Montana
    Nebraska
    Nevada
    New Hampshire
    New Jersey
    New Mexico
    New York
    North Carolina
    North Dakota
    Ohio
    Oklahoma
    Oregon
    Pennsylvania
    Puerto Rico
    Rhode Island
    South Carolina
    South Dakota
    Tennessee
    Texas
    U.S. Virgin Islands
    Utah
    Vermont
    Virginia
    Washington
    West Virginia
    Wisconsin
    Wyoming
    */
   q23: "${q://QID262/SelectedChoicesRecode}", // Country: {Canada: 1, USA: 2}
   
}; console.log(qData)
// Constants

// Chart Benchmarks (tonnes C02e per person per year)
const GLOBAL_AVERAGE_TONNES = 2.9; // displayed/labelled as 2.9
const SUSTAINABLE_TARGET_TONNES = 2.5;
const ADDITIONAL_FLIGHT_TONNES = 3.0;

// Average annual driving distance (km) used by the Avg_Gas_CF counterfactual.
const AVG_GAS_CF_DISTANCE_KM = 17000;

const SQFT_PER_SQM = 10.7639;
const KM_PER_MILE = 1.60934;
const KG_PER_TONNE = 1000;

const Y_AXIS_HEADROOM_TONNES = 0.5;

// Gender-specific diet factors, upscaled for higher calories/capita in
// Canada/US. Keyed by gender (q44) then diet type. "Other"/unspecified
// gender uses the mean of the men and women factors.
const DIET_FACTOR_TONNES = {
    men: {
        omnivore: 2.018596,
        flexitarian: 1.534314,
        vegetarian: 1.050032,
        vegan: 0.624588,
        "": 2.018596, // blank diet defaults to omnivore
    },
    women: {
        omnivore: 1.505808,
        flexitarian: 1.144549,
        vegetarian: 0.78329,
        vegan: 0.465923,
        "": 1.505808,
    },
    other: {
        omnivore: 1.762202,
        flexitarian: 1.3394315,
        vegetarian: 0.916661,
        vegan: 0.5452555,
        "": 1.762202,
    },
};

// Round-trip t CO2e per flight, by distance band, keyed by country.
// [54_Jurisdiction_Routes_Detail(Country Averages).csv, "Avg Total CO2e RT" column]
// Band 1 (<300 mi) = short, Band 2 (300-2300 mi) = medium, Band 3 (>2300 mi) = long.
// Pax-weighted averages over the 54 jurisdiction routes, collapsed to a national
// figure — which is why the flight questions are no longer asked per region.
const FLIGHT_FACTOR_TONNES = {
    CANADA: {short: 0.090, medium: 0.708, long: 3.068},
    USA:    {short: 0.136, medium: 0.648, long: 2.578},
};

/* =========================================================================
 * RESIDENTIAL ENERGY MODEL  [ported verbatim from CO2_footprint_calculator.xlsx]
 * -------------------------------------------------------------------------
 * Home energy = Space heating + Water heating + Air conditioning + Other
 * electricity, computed per household (kg CO2e/yr) then divided by household
 * size for a per-person figure. All constants are the exact Excel values;
 * keyed tables mirror the workbook's "REGION|vintage" / "REGION|dwelling" keys.
 * ========================================================================= */

// Electricity grid factor, lifecycle (combustion + upstream), kg CO2e/GJ
// delivered. Already kg/GJ — no g/kWh conversion. [P_EF_Elec col F]
const GRID_LIFECYCLE_KG_PER_GJ = {
    // Canada
    QC: 0.672223, ON: 13.955564, AB: 158.81122, BC: 5.46667, MB: 0.627778, SK: 206.88904,
    NS: 178.55568, NB: 63.00004, NL: 7.111116, PE: 87.4445, YT: 14.61112, NT: 105.77784,
    NU: 250.66684,
    // United States
    AL: 125.464984, AK: 129.047714, AZ: 103.689218, AR: 108.113333, CA: 67.982492, CO: 153.395904,
    CT: 62.901728, DE: 92.703767, DC: 92.703767, FL: 116.616755, GA: 112.878832, HI: 193.792284,
    ID: 26.672304, IL: 108.685532, IN: 150.519206, IA: 100.79268, KS: 104.189218, KY: 165.532163,
    LA: 110.982294, ME: 40.904042, MD: 80.9445, MA: 85.262419, MI: 119.014787, MN: 91.603066,
    MS: 113.378832, MO: 158.430365, MT: 73.223837, NE: 109.982294, NV: 90.206528, NH: 53.584387,
    NJ: 63.976896, NM: 114.378832, NY: 73.5611, NC: 83.361721, ND: 163.67171, OH: 130.103657,
    OK: 99.344411, OR: 33.965381, PA: 82.838021, RI: 80.399414, SC: 69.775568, SD: 43.654995,
    TN: 94.947873, TX: 109.744371, UT: 139.051137, VT: 6.653872, VA: 70.775568, WA: 40.299842,
    WV: 186.752894, WI: 120.671908, WY: 185.895746,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    GU: 193.792284, PR: 193.792284, VI: 193.792284,
};

// Gas-furnace seasonal efficiency, province/state-specific. [P_GasEff]
const GAS_EFFICIENCY = {
    // Canada
    QC: 0.88, ON: 0.89, AB: 0.87, BC: 0.87, MB: 0.88, SK: 0.87,
    NS: 0.86, NB: 0.86, NL: 0.86, PE: 0.86, YT: 0.87, NT: 0.87,
    NU: 0.87,
    // United States
    AL: 0.85, AK: 0.85, AZ: 0.85, AR: 0.85, CA: 0.85, CO: 0.85,
    CT: 0.85, DE: 0.85, DC: 0.85, FL: 0.85, GA: 0.85, HI: 0.85,
    ID: 0.85, IL: 0.85, IN: 0.85, IA: 0.85, KS: 0.85, KY: 0.85,
    LA: 0.85, ME: 0.85, MD: 0.85, MA: 0.85, MI: 0.85, MN: 0.85,
    MS: 0.85, MO: 0.85, MT: 0.85, NE: 0.85, NV: 0.85, NH: 0.85,
    NJ: 0.85, NM: 0.85, NY: 0.85, NC: 0.85, ND: 0.85, OH: 0.85,
    OK: 0.85, OR: 0.85, PA: 0.85, RI: 0.85, SC: 0.85, SD: 0.85,
    TN: 0.85, TX: 0.85, UT: 0.85, VT: 0.85, VA: 0.85, WA: 0.85,
    WV: 0.85, WI: 0.85, WY: 0.85,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    GU: 0.85, PR: 0.85, VI: 0.85,
};

// Air-source heat-pump seasonal COP: 1.9 Canada / 2.0 US. [P_HPcop]
const HEATPUMP_COP = {
    // Canada
    QC: 1.9, ON: 1.9, AB: 1.9, BC: 1.9, MB: 1.9, SK: 1.9,
    NS: 1.9, NB: 1.9, NL: 1.9, PE: 1.9, YT: 1.9, NT: 1.9,
    NU: 1.9,
    // United States
    AL: 2, AK: 2, AZ: 2, AR: 2, CA: 2, CO: 2,
    CT: 2, DE: 2, DC: 2, FL: 2, GA: 2, HI: 2,
    ID: 2, IL: 2, IN: 2, IA: 2, KS: 2, KY: 2,
    LA: 2, ME: 2, MD: 2, MA: 2, MI: 2, MN: 2,
    MS: 2, MO: 2, MT: 2, NE: 2, NV: 2, NH: 2,
    NJ: 2, NM: 2, NY: 2, NC: 2, ND: 2, OH: 2,
    OK: 2, OR: 2, PA: 2, RI: 2, SC: 2, SD: 2,
    TN: 2, TX: 2, UT: 2, VT: 2, VA: 2, WA: 2,
    WV: 2, WI: 2, WY: 2,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    GU: 2, PR: 2, VI: 2,
};

// Lifecycle fuel emission factors, kg CO2e/GJ (combustion + upstream). [P_EF_Fuel]
const FUEL_NG = 63.28;
const FUEL_OILPROP = 79.8;
const FUEL_WOOD = 1.1;

// Non-region space-heating efficiencies (gas/heatpump are region-specific above).
const SPACE_EFF_OILPROP = 0.84;
const SPACE_EFF_ELECTRIC = 1.0;
const SPACE_EFF_WOOD = 0.65;

// Water-heater efficiency / COP by system. [P_WaterHeat]
const WATER_EFF = {
    naturalgas: 0.60,
    electric: 0.90,
    oilpropane: 0.59, // used only by the "Don't know" water blend
    heatpump: 2.5,    // used only by the "Don't know" water blend
};

// Dwelling-type envelope factor on per-m2 heating & cooling. [P_BuildingType]
const ENVELOPE_FACTOR = {detached: 1.00, attached: 0.85, apartment: 0.70};

// Space-heating useful demand D (GJ/m2/yr), keyed "REGION|vintage". [P_Heating]
const SPACE_DEMAND_GJ_PER_M2 = {
    // Canada
    "QC|pre-1960": 0.85, "QC|1960-1983": 0.65, "QC|1984-1999": 0.45, "QC|2000+": 0.34,
    "ON|pre-1960": 0.85, "ON|1960-1983": 0.55, "ON|1984-1999": 0.4, "ON|2000+": 0.33,
    "AB|pre-1960": 0.9, "AB|1960-1983": 0.65, "AB|1984-1999": 0.45, "AB|2000+": 0.36,
    "BC|pre-1960": 0.55, "BC|1960-1983": 0.4, "BC|1984-1999": 0.3, "BC|2000+": 0.22,
    "MB|pre-1960": 0.97, "MB|1960-1983": 0.7, "MB|1984-1999": 0.49, "MB|2000+": 0.39,
    "SK|pre-1960": 0.92, "SK|1960-1983": 0.66, "SK|1984-1999": 0.46, "SK|2000+": 0.37,
    "NS|pre-1960": 0.81, "NS|1960-1983": 0.52, "NS|1984-1999": 0.38, "NS|2000+": 0.31,
    "NB|pre-1960": 0.85, "NB|1960-1983": 0.58, "NB|1984-1999": 0.42, "NB|2000+": 0.33,
    "NL|pre-1960": 0.78, "NL|1960-1983": 0.6, "NL|1984-1999": 0.42, "NL|2000+": 0.31,
    "PE|pre-1960": 0.81, "PE|1960-1983": 0.52, "PE|1984-1999": 0.38, "PE|2000+": 0.31,
    "YT|pre-1960": 1.24, "YT|1960-1983": 0.89, "YT|1984-1999": 0.62, "YT|2000+": 0.49,
    "NT|pre-1960": 1.5, "NT|1960-1983": 1.08, "NT|1984-1999": 0.75, "NT|2000+": 0.6,
    "NU|pre-1960": 1.85, "NU|1960-1983": 1.34, "NU|1984-1999": 0.93, "NU|2000+": 0.74,
    // United States
    "AL|pre-1960": 0.191, "AL|1960-1983": 0.163, "AL|1984-1999": 0.141, "AL|2000+": 0.111,
    "AK|pre-1960": 0.975, "AK|1960-1983": 0.8, "AK|1984-1999": 0.65, "AK|2000+": 0.595,
    "AZ|pre-1960": 0.118, "AZ|1960-1983": 0.093, "AZ|1984-1999": 0.064, "AZ|2000+": 0.052,
    "AR|pre-1960": 0.279, "AR|1960-1983": 0.248, "AR|1984-1999": 0.233, "AR|2000+": 0.182,
    "CA|pre-1960": 0.118, "CA|1960-1983": 0.093, "CA|1984-1999": 0.064, "CA|2000+": 0.052,
    "CO|pre-1960": 0.314, "CO|1960-1983": 0.279, "CO|1984-1999": 0.247, "CO|2000+": 0.199,
    "CT|pre-1960": 0.339, "CT|1960-1983": 0.322, "CT|1984-1999": 0.263, "CT|2000+": 0.22,
    "DE|pre-1960": 0.307, "DE|1960-1983": 0.273, "DE|1984-1999": 0.244, "DE|2000+": 0.196,
    "DC|pre-1960": 0.307, "DC|1960-1983": 0.273, "DC|1984-1999": 0.244, "DC|2000+": 0.196,
    "FL|pre-1960": 0.06, "FL|1960-1983": 0.045, "FL|1984-1999": 0.03, "FL|2000+": 0.025,
    "GA|pre-1960": 0.267, "GA|1960-1983": 0.236, "GA|1984-1999": 0.221, "GA|2000+": 0.173,
    "HI|pre-1960": 0.028, "HI|1960-1983": 0.021, "HI|1984-1999": 0.014, "HI|2000+": 0.011,
    "ID|pre-1960": 0.314, "ID|1960-1983": 0.279, "ID|1984-1999": 0.247, "ID|2000+": 0.199,
    "IL|pre-1960": 0.379, "IL|1960-1983": 0.334, "IL|1984-1999": 0.271, "IL|2000+": 0.236,
    "IN|pre-1960": 0.358, "IN|1960-1983": 0.328, "IN|1984-1999": 0.267, "IN|2000+": 0.227,
    "IA|pre-1960": 0.495, "IA|1960-1983": 0.388, "IA|1984-1999": 0.311, "IA|2000+": 0.287,
    "KS|pre-1960": 0.311, "KS|1960-1983": 0.277, "KS|1984-1999": 0.246, "KS|2000+": 0.198,
    "KY|pre-1960": 0.306, "KY|1960-1983": 0.272, "KY|1984-1999": 0.244, "KY|2000+": 0.195,
    "LA|pre-1960": 0.088, "LA|1960-1983": 0.067, "LA|1984-1999": 0.044, "LA|2000+": 0.036,
    "ME|pre-1960": 0.585, "ME|1960-1983": 0.469, "ME|1984-1999": 0.368, "ME|2000+": 0.34,
    "MD|pre-1960": 0.306, "MD|1960-1983": 0.272, "MD|1984-1999": 0.244, "MD|2000+": 0.195,
    "MA|pre-1960": 0.364, "MA|1960-1983": 0.33, "MA|1984-1999": 0.268, "MA|2000+": 0.23,
    "MI|pre-1960": 0.46, "MI|1960-1983": 0.357, "MI|1984-1999": 0.289, "MI|2000+": 0.267,
    "MN|pre-1960": 0.622, "MN|1960-1983": 0.501, "MN|1984-1999": 0.391, "MN|2000+": 0.361,
    "MS|pre-1960": 0.135, "MS|1960-1983": 0.109, "MS|1984-1999": 0.082, "MS|2000+": 0.066,
    "MO|pre-1960": 0.311, "MO|1960-1983": 0.276, "MO|1984-1999": 0.246, "MO|2000+": 0.198,
    "MT|pre-1960": 0.521, "MT|1960-1983": 0.412, "MT|1984-1999": 0.328, "MT|2000+": 0.303,
    "NE|pre-1960": 0.423, "NE|1960-1983": 0.346, "NE|1984-1999": 0.281, "NE|2000+": 0.252,
    "NV|pre-1960": 0.305, "NV|1960-1983": 0.271, "NV|1984-1999": 0.243, "NV|2000+": 0.195,
    "NH|pre-1960": 0.509, "NH|1960-1983": 0.4, "NH|1984-1999": 0.32, "NH|2000+": 0.295,
    "NJ|pre-1960": 0.311, "NJ|1960-1983": 0.276, "NJ|1984-1999": 0.246, "NJ|2000+": 0.198,
    "NM|pre-1960": 0.31, "NM|1960-1983": 0.276, "NM|1984-1999": 0.246, "NM|2000+": 0.197,
    "NY|pre-1960": 0.331, "NY|1960-1983": 0.32, "NY|1984-1999": 0.261, "NY|2000+": 0.217,
    "NC|pre-1960": 0.287, "NC|1960-1983": 0.255, "NC|1984-1999": 0.236, "NC|2000+": 0.186,
    "ND|pre-1960": 0.635, "ND|1960-1983": 0.513, "ND|1984-1999": 0.401, "ND|2000+": 0.37,
    "OH|pre-1960": 0.356, "OH|1960-1983": 0.327, "OH|1984-1999": 0.266, "OH|2000+": 0.227,
    "OK|pre-1960": 0.283, "OK|1960-1983": 0.251, "OK|1984-1999": 0.235, "OK|2000+": 0.184,
    "OR|pre-1960": 0.288, "OR|1960-1983": 0.256, "OR|1984-1999": 0.237, "OR|2000+": 0.187,
    "PA|pre-1960": 0.352, "PA|1960-1983": 0.326, "PA|1984-1999": 0.266, "PA|2000+": 0.225,
    "RI|pre-1960": 0.358, "RI|1960-1983": 0.328, "RI|1984-1999": 0.267, "RI|2000+": 0.227,
    "SC|pre-1960": 0.191, "SC|1960-1983": 0.163, "SC|1984-1999": 0.141, "SC|2000+": 0.111,
    "SD|pre-1960": 0.512, "SD|1960-1983": 0.403, "SD|1984-1999": 0.322, "SD|2000+": 0.297,
    "TN|pre-1960": 0.293, "TN|1960-1983": 0.261, "TN|1984-1999": 0.239, "TN|2000+": 0.189,
    "TX|pre-1960": 0.102, "TX|1960-1983": 0.079, "TX|1984-1999": 0.051, "TX|2000+": 0.042,
    "UT|pre-1960": 0.373, "UT|1960-1983": 0.332, "UT|1984-1999": 0.27, "UT|2000+": 0.233,
    "VT|pre-1960": 0.589, "VT|1960-1983": 0.472, "VT|1984-1999": 0.37, "VT|2000+": 0.342,
    "VA|pre-1960": 0.299, "VA|1960-1983": 0.266, "VA|1984-1999": 0.241, "VA|2000+": 0.192,
    "WA|pre-1960": 0.278, "WA|1960-1983": 0.247, "WA|1984-1999": 0.233, "WA|2000+": 0.182,
    "WV|pre-1960": 0.358, "WV|1960-1983": 0.328, "WV|1984-1999": 0.267, "WV|2000+": 0.227,
    "WI|pre-1960": 0.496, "WI|1960-1983": 0.389, "WI|1984-1999": 0.312, "WI|2000+": 0.288,
    "WY|pre-1960": 0.482, "WY|1960-1983": 0.377, "WY|1984-1999": 0.303, "WY|2000+": 0.28,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    "GU|pre-1960": 0.028, "GU|1960-1983": 0.021, "GU|1984-1999": 0.014, "GU|2000+": 0.011,
    "PR|pre-1960": 0.028, "PR|1960-1983": 0.021, "PR|1984-1999": 0.014, "PR|2000+": 0.011,
    "VI|pre-1960": 0.028, "VI|1960-1983": 0.021, "VI|1984-1999": 0.014, "VI|2000+": 0.011,
};

// Air-conditioning electricity intensity (GJ/m2/yr), keyed "REGION|vintage". [P_Cooling]
const COOLING_INTENSITY_GJ_PER_M2 = {
    // Canada
    "QC|pre-1960": 0.053, "QC|1960-1983": 0.041, "QC|1984-1999": 0.029, "QC|2000+": 0.024,
    "ON|pre-1960": 0.043, "ON|1960-1983": 0.033, "ON|1984-1999": 0.023, "ON|2000+": 0.019,
    "AB|pre-1960": 0.009, "AB|1960-1983": 0.007, "AB|1984-1999": 0.005, "AB|2000+": 0.004,
    "BC|pre-1960": 0.029, "BC|1960-1983": 0.023, "BC|1984-1999": 0.016, "BC|2000+": 0.013,
    "MB|pre-1960": 0.042, "MB|1960-1983": 0.033, "MB|1984-1999": 0.023, "MB|2000+": 0.019,
    "SK|pre-1960": 0.015, "SK|1960-1983": 0.012, "SK|1984-1999": 0.008, "SK|2000+": 0.006,
    "NS|pre-1960": 0.028, "NS|1960-1983": 0.022, "NS|1984-1999": 0.015, "NS|2000+": 0.012,
    "NB|pre-1960": 0.03, "NB|1960-1983": 0.023, "NB|1984-1999": 0.016, "NB|2000+": 0.013,
    "NL|pre-1960": 0.012, "NL|1960-1983": 0.01, "NL|1984-1999": 0.007, "NL|2000+": 0.005,
    "PE|pre-1960": 0.025, "PE|1960-1983": 0.019, "PE|1984-1999": 0.013, "PE|2000+": 0.011,
    "YT|pre-1960": 0.002, "YT|1960-1983": 0.002, "YT|1984-1999": 0.001, "YT|2000+": 0.001,
    "NT|pre-1960": 0.002, "NT|1960-1983": 0.002, "NT|1984-1999": 0.001, "NT|2000+": 0.001,
    "NU|pre-1960": 0.002, "NU|1960-1983": 0.002, "NU|1984-1999": 0.001, "NU|2000+": 0.001,
    // United States
    "AL|pre-1960": 0.144, "AL|1960-1983": 0.111, "AL|1984-1999": 0.081, "AL|2000+": 0.066,
    "AK|pre-1960": 0.013, "AK|1960-1983": 0.01, "AK|1984-1999": 0.007, "AK|2000+": 0.006,
    "AZ|pre-1960": 0.123, "AZ|1960-1983": 0.095, "AZ|1984-1999": 0.069, "AZ|2000+": 0.057,
    "AR|pre-1960": 0.129, "AR|1960-1983": 0.099, "AR|1984-1999": 0.072, "AR|2000+": 0.059,
    "CA|pre-1960": 0.049, "CA|1960-1983": 0.038, "CA|1984-1999": 0.027, "CA|2000+": 0.023,
    "CO|pre-1960": 0.042, "CO|1960-1983": 0.029, "CO|1984-1999": 0.027, "CO|2000+": 0.024,
    "CT|pre-1960": 0.056, "CT|1960-1983": 0.043, "CT|1984-1999": 0.031, "CT|2000+": 0.026,
    "DE|pre-1960": 0.072, "DE|1960-1983": 0.055, "DE|1984-1999": 0.04, "DE|2000+": 0.033,
    "DC|pre-1960": 0.085, "DC|1960-1983": 0.065, "DC|1984-1999": 0.048, "DC|2000+": 0.039,
    "FL|pre-1960": 0.211, "FL|1960-1983": 0.162, "FL|1984-1999": 0.118, "FL|2000+": 0.097,
    "GA|pre-1960": 0.139, "GA|1960-1983": 0.107, "GA|1984-1999": 0.078, "GA|2000+": 0.064,
    "HI|pre-1960": 0.191, "HI|1960-1983": 0.147, "HI|1984-1999": 0.107, "HI|2000+": 0.088,
    "ID|pre-1960": 0.046, "ID|1960-1983": 0.035, "ID|1984-1999": 0.026, "ID|2000+": 0.021,
    "IL|pre-1960": 0.083, "IL|1960-1983": 0.064, "IL|1984-1999": 0.046, "IL|2000+": 0.038,
    "IN|pre-1960": 0.077, "IN|1960-1983": 0.059, "IN|1984-1999": 0.043, "IN|2000+": 0.035,
    "IA|pre-1960": 0.074, "IA|1960-1983": 0.057, "IA|1984-1999": 0.041, "IA|2000+": 0.034,
    "KS|pre-1960": 0.095, "KS|1960-1983": 0.073, "KS|1984-1999": 0.053, "KS|2000+": 0.044,
    "KY|pre-1960": 0.099, "KY|1960-1983": 0.076, "KY|1984-1999": 0.055, "KY|2000+": 0.046,
    "LA|pre-1960": 0.171, "LA|1960-1983": 0.132, "LA|1984-1999": 0.096, "LA|2000+": 0.079,
    "ME|pre-1960": 0.041, "ME|1960-1983": 0.032, "ME|1984-1999": 0.023, "ME|2000+": 0.019,
    "MD|pre-1960": 0.081, "MD|1960-1983": 0.062, "MD|1984-1999": 0.045, "MD|2000+": 0.037,
    "MA|pre-1960": 0.055, "MA|1960-1983": 0.042, "MA|1984-1999": 0.031, "MA|2000+": 0.025,
    "MI|pre-1960": 0.043, "MI|1960-1983": 0.036, "MI|1984-1999": 0.02, "MI|2000+": 0.018,
    "MN|pre-1960": 0.054, "MN|1960-1983": 0.042, "MN|1984-1999": 0.03, "MN|2000+": 0.025,
    "MS|pre-1960": 0.151, "MS|1960-1983": 0.116, "MS|1984-1999": 0.085, "MS|2000+": 0.069,
    "MO|pre-1960": 0.098, "MO|1960-1983": 0.075, "MO|1984-1999": 0.055, "MO|2000+": 0.045,
    "MT|pre-1960": 0.031, "MT|1960-1983": 0.024, "MT|1984-1999": 0.017, "MT|2000+": 0.014,
    "NE|pre-1960": 0.086, "NE|1960-1983": 0.066, "NE|1984-1999": 0.048, "NE|2000+": 0.04,
    "NV|pre-1960": 0.077, "NV|1960-1983": 0.059, "NV|1984-1999": 0.043, "NV|2000+": 0.035,
    "NH|pre-1960": 0.044, "NH|1960-1983": 0.034, "NH|1984-1999": 0.025, "NH|2000+": 0.02,
    "NJ|pre-1960": 0.065, "NJ|1960-1983": 0.05, "NJ|1984-1999": 0.036, "NJ|2000+": 0.03,
    "NM|pre-1960": 0.055, "NM|1960-1983": 0.042, "NM|1984-1999": 0.031, "NM|2000+": 0.025,
    "NY|pre-1960": 0.063, "NY|1960-1983": 0.06, "NY|1984-1999": 0.041, "NY|2000+": 0.029,
    "NC|pre-1960": 0.114, "NC|1960-1983": 0.088, "NC|1984-1999": 0.064, "NC|2000+": 0.052,
    "ND|pre-1960": 0.044, "ND|1960-1983": 0.034, "ND|1984-1999": 0.025, "ND|2000+": 0.02,
    "OH|pre-1960": 0.073, "OH|1960-1983": 0.056, "OH|1984-1999": 0.041, "OH|2000+": 0.034,
    "OK|pre-1960": 0.139, "OK|1960-1983": 0.107, "OK|1984-1999": 0.078, "OK|2000+": 0.064,
    "OR|pre-1960": 0.053, "OR|1960-1983": 0.041, "OR|1984-1999": 0.03, "OR|2000+": 0.024,
    "PA|pre-1960": 0.068, "PA|1960-1983": 0.052, "PA|1984-1999": 0.038, "PA|2000+": 0.031,
    "RI|pre-1960": 0.053, "RI|1960-1983": 0.041, "RI|1984-1999": 0.03, "RI|2000+": 0.024,
    "SC|pre-1960": 0.132, "SC|1960-1983": 0.102, "SC|1984-1999": 0.074, "SC|2000+": 0.061,
    "SD|pre-1960": 0.05, "SD|1960-1983": 0.039, "SD|1984-1999": 0.028, "SD|2000+": 0.023,
    "TN|pre-1960": 0.111, "TN|1960-1983": 0.085, "TN|1984-1999": 0.062, "TN|2000+": 0.051,
    "TX|pre-1960": 0.167, "TX|1960-1983": 0.129, "TX|1984-1999": 0.094, "TX|2000+": 0.077,
    "UT|pre-1960": 0.055, "UT|1960-1983": 0.042, "UT|1984-1999": 0.031, "UT|2000+": 0.025,
    "VT|pre-1960": 0.037, "VT|1960-1983": 0.028, "VT|1984-1999": 0.021, "VT|2000+": 0.017,
    "VA|pre-1960": 0.098, "VA|1960-1983": 0.075, "VA|1984-1999": 0.055, "VA|2000+": 0.045,
    "WA|pre-1960": 0.05, "WA|1960-1983": 0.033, "WA|1984-1999": 0.022, "WA|2000+": 0.019,
    "WV|pre-1960": 0.071, "WV|1960-1983": 0.055, "WV|1984-1999": 0.04, "WV|2000+": 0.033,
    "WI|pre-1960": 0.059, "WI|1960-1983": 0.045, "WI|1984-1999": 0.033, "WI|2000+": 0.027,
    "WY|pre-1960": 0.034, "WY|1960-1983": 0.026, "WY|1984-1999": 0.019, "WY|2000+": 0.016,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    "GU|pre-1960": 0.191, "GU|1960-1983": 0.147, "GU|1984-1999": 0.107, "GU|2000+": 0.088,
    "PR|pre-1960": 0.191, "PR|1960-1983": 0.147, "PR|1984-1999": 0.107, "PR|2000+": 0.088,
    "VI|pre-1960": 0.191, "VI|1960-1983": 0.147, "VI|1984-1999": 0.107, "VI|2000+": 0.088,
};

// Water-heating useful demand U (GJ/household/yr), keyed "REGION|dwelling".
// Dwelling-type load already baked in — do NOT re-apply envelope factor. [P_U_water]
const WATER_DEMAND_GJ_PER_HH = {
    // Canada
    "QC|detached": 12.4, "QC|attached": 11.3, "QC|apartment": 8.5,
    "ON|detached": 11.2, "ON|attached": 10.2, "ON|apartment": 7.6,
    "AB|detached": 19.8, "AB|attached": 18, "AB|apartment": 13.5,
    "BC|detached": 15.8, "BC|attached": 14.4, "BC|apartment": 10.8,
    "MB|detached": 13.2, "MB|attached": 12, "MB|apartment": 9,
    "SK|detached": 18.2, "SK|attached": 16.5, "SK|apartment": 12.4,
    "NS|detached": 12.7, "NS|attached": 11.5, "NS|apartment": 8.6,
    "NB|detached": 12.7, "NB|attached": 11.5, "NB|apartment": 8.6,
    "NL|detached": 13.8, "NL|attached": 12.5, "NL|apartment": 9.4,
    "PE|detached": 12.7, "PE|attached": 11.5, "PE|apartment": 8.6,
    "YT|detached": 14.9, "YT|attached": 13.5, "YT|apartment": 10.1,
    "NT|detached": 15.4, "NT|attached": 14, "NT|apartment": 10.5,
    "NU|detached": 15.4, "NU|attached": 14, "NU|apartment": 10.5,
    // United States
    "AL|detached": 12.3, "AL|attached": 11.2, "AL|apartment": 8.4,
    "AK|detached": 15.4, "AK|attached": 14, "AK|apartment": 10.5,
    "AZ|detached": 10.6, "AZ|attached": 9.6, "AZ|apartment": 7.2,
    "AR|detached": 12.7, "AR|attached": 11.5, "AR|apartment": 8.6,
    "CA|detached": 11.9, "CA|attached": 10.8, "CA|apartment": 8.1,
    "CO|detached": 12.8, "CO|attached": 11.6, "CO|apartment": 8.7,
    "CT|detached": 12.1, "CT|attached": 11, "CT|apartment": 8.2,
    "DE|detached": 12.4, "DE|attached": 11.3, "DE|apartment": 8.5,
    "DC|detached": 11.6, "DC|attached": 10.5, "DC|apartment": 7.9,
    "FL|detached": 10.3, "FL|attached": 9.4, "FL|apartment": 7.1,
    "GA|detached": 11.9, "GA|attached": 10.8, "GA|apartment": 8.1,
    "HI|detached": 9.9, "HI|attached": 9, "HI|apartment": 6.8,
    "ID|detached": 14.3, "ID|attached": 13, "ID|apartment": 9.8,
    "IL|detached": 11.9, "IL|attached": 10.8, "IL|apartment": 8.1,
    "IN|detached": 11.9, "IN|attached": 10.8, "IN|apartment": 8.1,
    "IA|detached": 12.3, "IA|attached": 11.2, "IA|apartment": 8.4,
    "KS|detached": 12.3, "KS|attached": 11.2, "KS|apartment": 8.4,
    "KY|detached": 12.7, "KY|attached": 11.5, "KY|apartment": 8.6,
    "LA|detached": 10.8, "LA|attached": 9.8, "LA|apartment": 7.4,
    "ME|detached": 13.8, "ME|attached": 12.5, "ME|apartment": 9.4,
    "MD|detached": 12.3, "MD|attached": 11.2, "MD|apartment": 8.4,
    "MA|detached": 12.1, "MA|attached": 11, "MA|apartment": 8.2,
    "MI|detached": 11.6, "MI|attached": 10.6, "MI|apartment": 7.9,
    "MN|detached": 13, "MN|attached": 11.8, "MN|apartment": 8.9,
    "MS|detached": 11.6, "MS|attached": 10.5, "MS|apartment": 7.9,
    "MO|detached": 12.1, "MO|attached": 11, "MO|apartment": 8.2,
    "MT|detached": 14.3, "MT|attached": 13, "MT|apartment": 9.8,
    "NE|detached": 12.7, "NE|attached": 11.5, "NE|apartment": 8.6,
    "NV|detached": 11, "NV|attached": 10, "NV|apartment": 7.5,
    "NH|detached": 13.2, "NH|attached": 12, "NH|apartment": 9,
    "NJ|detached": 12.3, "NJ|attached": 11.2, "NJ|apartment": 8.4,
    "NM|detached": 11.6, "NM|attached": 10.5, "NM|apartment": 7.9,
    "NY|detached": 12, "NY|attached": 10.9, "NY|apartment": 8.2,
    "NC|detached": 11.9, "NC|attached": 10.8, "NC|apartment": 8.1,
    "ND|detached": 13.8, "ND|attached": 12.5, "ND|apartment": 9.4,
    "OH|detached": 11.9, "OH|attached": 10.8, "OH|apartment": 8.1,
    "OK|detached": 11.6, "OK|attached": 10.5, "OK|apartment": 7.9,
    "OR|detached": 14.1, "OR|attached": 12.8, "OR|apartment": 9.6,
    "PA|detached": 12.1, "PA|attached": 11, "PA|apartment": 8.2,
    "RI|detached": 12.1, "RI|attached": 11, "RI|apartment": 8.2,
    "SC|detached": 11.6, "SC|attached": 10.5, "SC|apartment": 7.9,
    "SD|detached": 13.8, "SD|attached": 12.5, "SD|apartment": 9.4,
    "TN|detached": 11.9, "TN|attached": 10.8, "TN|apartment": 8.1,
    "TX|detached": 10.8, "TX|attached": 9.8, "TX|apartment": 7.4,
    "UT|detached": 13.2, "UT|attached": 12, "UT|apartment": 9,
    "VT|detached": 13.8, "VT|attached": 12.5, "VT|apartment": 9.4,
    "VA|detached": 11.9, "VA|attached": 10.8, "VA|apartment": 8.1,
    "WA|detached": 14.7, "WA|attached": 13.4, "WA|apartment": 10,
    "WV|detached": 12.7, "WV|attached": 11.5, "WV|apartment": 8.6,
    "WI|detached": 12.3, "WI|attached": 11.2, "WI|apartment": 8.4,
    "WY|detached": 14.9, "WY|attached": 13.5, "WY|apartment": 10.1,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    "GU|detached": 9.9, "GU|attached": 9, "GU|apartment": 6.8,
    "PR|detached": 9.9, "PR|attached": 9, "PR|apartment": 6.8,
    "VI|detached": 9.9, "VI|attached": 9, "VI|apartment": 6.8,
};

// Other-electricity baseline (appliances/lighting/plug), GJ/household/yr. [P_OtherElec]
const OTHER_ELEC_BASE_GJ = {
    // Canada
    QC: 20.2, ON: 12.8, AB: 16.2, BC: 17, MB: 16, SK: 15.5,
    NS: 18, NB: 17, NL: 20, PE: 16.5, YT: 20, NT: 21,
    NU: 22,
    // United States
    AL: 25, AK: 22, AZ: 21, AR: 22.5, CA: 16, CO: 21,
    CT: 17, DE: 19.5, DC: 14.5, FL: 27, GA: 23, HI: 19,
    ID: 21.5, IL: 19.5, IN: 22, IA: 21, KS: 21.5, KY: 22.5,
    LA: 26, ME: 16.5, MD: 18.5, MA: 16.5, MI: 21, MN: 20,
    MS: 24, MO: 21.5, MT: 21, NE: 21, NV: 20.5, NH: 17,
    NJ: 18, NM: 20, NY: 16, NC: 21.5, ND: 21.5, OH: 21.5,
    OK: 22.5, OR: 18.5, PA: 18, RI: 17, SC: 24, SD: 21.5,
    TN: 23, TX: 23, UT: 21, VT: 16.5, VA: 20, WA: 20,
    WV: 22, WI: 21, WY: 22,
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    GU: 19, PR: 19, VI: 19,
};

// Household-size load factors (normalized to mean=1), RECS 2020 (CO/MI/NY/WA
// pooled), indexed by household size 1..6+ (index 6 = "6+"). Index 0 (blank) ->
// size 1. [P_Size]
//
// Per the workbook: "other_elec_factor used; water_factor_ref optional." So we
// apply the other-electricity factor (it scales the household Other-electricity
// total sub-linearly with occupancy) but DO NOT size-scale water — occupancy
// enters water only through the per-person division in calculateHeatingEmissions.
// The optional water_factor_ref [P_Size col C], size 1..6+, is kept here for
// reference only: [0.64, 0.95, 1.21, 1.40, 1.52, 1.55].
const OTHER_ELEC_SIZE_FACTOR = [0.66, 0.66, 1.00, 1.17, 1.30, 1.41, 1.51]; // [P_Size col B] — applied

// Last defined size-factor bin ("6+"). Household sizes above this clamp to it for
// the other-electricity factor lookup, while the per-person divisor uses the
// actual size (1..9+).
const SIZE_FACTOR_MAX_BIN = 6;

// National system-mix weights for the "Don't know" blends. Canada used for
// QC/ON/AB/BC, US for CO/MI/NY/WA. [P_DKHeat / P_DKWater weight columns]
const DK_SPACE_MIX = {
    CANADA: {gas: 0.443, oilprop: 0.059, baseboard: 0.374, heatpump: 0.079, wood: 0.045},
    USA:    {gas: 0.533, oilprop: 0.086, baseboard: 0.216, heatpump: 0.146, wood: 0.019},
};
const DK_WATER_MIX = {
    CANADA: {gas: 0.49,  electric: 0.492, oilprop: 0.018, hpwh: 0},
    USA:    {gas: 0.482, electric: 0.463, oilprop: 0.055, hpwh: 0},
};

const COMBUSTION = {
    petrol : {car: 0.215, truck: 0.315, suv: 0.315},
    diesel : {car: 0.181, truck: 0.266, suv: 0.266},
    hybrid : {car: 0.144, truck: 0.219, suv: 0.219},
};

// Object.assign instead of object spread {...COMBUSTION}: Qualtrics' JS editor
// rejects the ES2018 spread syntax, so the shared combustion rows are merged
// with each region's grid-dependent rows (phev/battery) this way instead.
function regionVehicleFactors(gridDependentRows) {
    return Object.assign({}, COMBUSTION, gridDependentRows);
}

const VEHICLE_FACTOR_BY_REGION = {
    // Canada
    QC: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.116, suv: 0.116},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    ON: regionVehicleFactors({
        phev: {car: 0.082, truck: 0.117, suv: 0.117},
        battery: {car: 0.042, truck: 0.067, suv: 0.067}}),
    AB: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.051, truck: 0.082, suv: 0.082}}),
    BC: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.116, suv: 0.116},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    MB: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.116, suv: 0.116},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    SK: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    NS: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    NB: regionVehicleFactors({
        phev: {car: 0.083, truck: 0.119, suv: 0.119},
        battery: {car: 0.044, truck: 0.07, suv: 0.07}}),
    NL: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.116, suv: 0.116},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    PE: regionVehicleFactors({
        phev: {car: 0.085, truck: 0.122, suv: 0.122},
        battery: {car: 0.049, truck: 0.078, suv: 0.078}}),
    YT: regionVehicleFactors({
        phev: {car: 0.082, truck: 0.118, suv: 0.118},
        battery: {car: 0.042, truck: 0.068, suv: 0.068}}),
    NT: regionVehicleFactors({
        phev: {car: 0.092, truck: 0.131, suv: 0.131},
        battery: {car: 0.063, truck: 0.102, suv: 0.102}}),
    NU: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    // United States
    AL: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    AK: regionVehicleFactors({
        phev: {car: 0.106, truck: 0.138, suv: 0.138},
        battery: {car: 0.095, truck: 0.152, suv: 0.152}}),
    AZ: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    AR: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    CA: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    CO: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    CT: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    DE: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    DC: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    FL: regionVehicleFactors({
        phev: {car: 0.099, truck: 0.132, suv: 0.132},
        battery: {car: 0.081, truck: 0.13, suv: 0.13}}),
    GA: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    HI: regionVehicleFactors({
        phev: {car: 0.129, truck: 0.162, suv: 0.162},
        battery: {car: 0.147, truck: 0.236, suv: 0.236}}),
    ID: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    IL: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    IN: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    IA: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    KS: regionVehicleFactors({
        phev: {car: 0.095, truck: 0.127, suv: 0.127},
        battery: {car: 0.07, truck: 0.112, suv: 0.112}}),
    KY: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    LA: regionVehicleFactors({
        phev: {car: 0.095, truck: 0.127, suv: 0.127},
        battery: {car: 0.07, truck: 0.112, suv: 0.112}}),
    ME: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    MD: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    MA: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    MI: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.14, suv: 0.14},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    MN: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    MS: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    MO: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    MT: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    NE: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    NV: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    NH: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    NJ: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    NM: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    NY: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.116, suv: 0.116},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    NC: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    ND: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    OH: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    OK: regionVehicleFactors({
        phev: {car: 0.095, truck: 0.127, suv: 0.127},
        battery: {car: 0.07, truck: 0.112, suv: 0.112}}),
    OR: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    PA: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    RI: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    SC: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    SD: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    TN: regionVehicleFactors({
        phev: {car: 0.1, truck: 0.133, suv: 0.133},
        battery: {car: 0.083, truck: 0.134, suv: 0.134}}),
    TX: regionVehicleFactors({
        phev: {car: 0.091, truck: 0.124, suv: 0.124},
        battery: {car: 0.062, truck: 0.1, suv: 0.1}}),
    UT: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    VT: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.114, suv: 0.114},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    VA: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    WA: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.123, suv: 0.123},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    WV: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.13, suv: 0.13},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    WI: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.131, suv: 0.131},
        battery: {car: 0.078, truck: 0.126, suv: 0.126}}),
    WY: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.119, suv: 0.119},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    /* PLACEHOLDER — no workbook data for Guam / Puerto Rico /
       U.S. Virgin Islands. Seeded from HI. TODO: real values. */
    GU: regionVehicleFactors({
        phev: {car: 0.129, truck: 0.162, suv: 0.162},
        battery: {car: 0.147, truck: 0.236, suv: 0.236}}),
    PR: regionVehicleFactors({
        phev: {car: 0.129, truck: 0.162, suv: 0.162},
        battery: {car: 0.147, truck: 0.236, suv: 0.236}}),
    VI: regionVehicleFactors({
        phev: {car: 0.129, truck: 0.162, suv: 0.162},
        battery: {car: 0.147, truck: 0.236, suv: 0.236}}),
};

/* =========================================================================
   * 4. ANSWER-OPTION TABLES  [P2: survey recodes map to values through data]
   * -------------------------------------------------------------------------
   * Each array is 1-based: Qualtrics recode 1 selects element 1. Index 0 is
   * the fallback for a blank (unanswered) question.
   * ========================================================================= */

const OPTIONS = {
    // q13 dwelling vintage {<1960:1, 1960-1983:2, 1984-1999:3, >2000:4}; blank -> 1984-1999
    vintage: ["1984-1999", "pre-1960", "1960-1983", "1984-1999", "2000+"],
    // q12 dwelling {Apartment:1, Semi-detached:2, Detached:3}; blank -> detached
    dwellingType: ["detached", "apartment", "attached", "detached"],
    // q17 space heating {Gas:1, Electric:2, Heat pump:3, Oil/Propane:4, Wood:5, Don't know:6}; blank -> naturalgas
    spaceSystem: ["naturalgas", "naturalgas", "electric", "heatpump", "oilpropane", "wood", "unknown"],
    // q18 water heating {Natural gas:1, Electric:2, Don't know:3}; blank -> naturalgas
    waterSystem: ["naturalgas", "naturalgas", "electric", "unknown"],
    // q14 windows/insulation upgraded {Yes:1, No:2, Unsure:3} -> demand multiplier; blank -> 1.0
    retrofitFactor: [1.0, 0.85, 1.0, 1.0],
    fuelType: ["", "petrol", "diesel", "hybrid", "phev", "battery"],
    carSize: ["", "car", "truck", "suv"],
    diet: ["", "omnivore", "flexitarian", "vegetarian", "vegan"],
    // q20 gender {Male:1, Female:2, Other:3}; blank/Other -> averaged factors
    gender: ["other", "men", "women", "other"],
    // q21 province, alphabetical by full name. Index 0 is the blank fallback.
    canadaProvince: ["",
        "AB", "BC", "MB", "NB", "NL", "NT", "NS", "NU", "ON", "PE", "QC", "SK",
        "YT"],
    // q22 state / US territory, alphabetical by full name. Index 0 is the blank
    // fallback. Note DC (9), and the three territories with no workbook data:
    // GU (12), PR (41), VI (47) — see PLACEHOLDER_REGIONS.
    usaState: ["",
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "GU",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI",
        "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
        "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "VI", "UT",
        "VT", "VA", "WA", "WV", "WI", "WY"],
    // q15 {1..9+}; recode 9 = "9+"; blank -> 1
    householdSize: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
};

// Jurisdictions the survey can return but the workbook has no row for. Their
// factors above are seeded from HI so nothing evaluates to NaN.
// TODO: replace the seeded values once real data lands.
const PLACEHOLDER_REGIONS = ["GU", "PR", "VI"];

// Where an unresolved region falls back to. A blank or out-of-range recode would
// otherwise index every factor table with `undefined` and yield NaN across the
// board — a blank chart for the respondent. Degrade to the most populous
// jurisdiction in the country instead, and say so in the console.
const DEFAULT_REGION = {CANADA: "ON", USA: "CA"};

/* =========================================================================
   * 5. GENERIC PARSERS  [P4: pure functions — string in, value out]
   * ========================================================================= */

/**
 * Returns 0 or parsed integer for Qualtrics answers.
 * 
 * Qualtrics survey responses come back as strings, so this function
 * is used to return a number (integer) instead. 
 * 
 * @param {string} answer  - string from qualtrics (may be empty/undefined)
 * @returns {number} the parsed integer or 0
 */

function parseIntOrZero(answer){
    const parsed = parseInt(answer);
    return isNaN(parsed) ? 0: parsed;
}

/**
 * Returns re-coded values for single-digit and multi-digit multiple selected answers (e.g., "1,2,3" -> 1,2,3)
 * 
 * @param {string} answer The respondent's answer
 * @param {boolean} forceReturnArray 
 * @returns the re-coded values from string to numeric
 */
function extractSelectedChoices(answer, forceReturnArray = false) {
    const NO_ANSWER = 0;
    let indices = [];
    if (answer == null || String(answer).trim() === "") {
        indices.push(NO_ANSWER);
    } else {
        indices = String(answer)
            .split(",")
            .map(part => parseInt(part.trim()));
    }
    return indices.length == 1 && !forceReturnArray ? indices[0] : indices;
}

/** Converts the recoded value into a label (e.g., 2 -> suv)
 * 
 * @param {numeric} answer 
 * @param {Object} table 
 * @returns Object
 */

function choiceFromTable(answer, table){
    return table[extractSelectedChoices(answer)];
}

// Boolean wrapper for gate questions q1, q7 (do you have access to a vehicle and do you fly, respectively)
function isFirstChoice(answer) {
    return extractSelectedChoices(answer) == 1;
}

// Helper function that ensures the minimum number is 1 to prvent a division by zero error / similar errors
function atLeastOne(answer) {
    const value = parseIntOrZero(answer);
    return value < 1 ? 1: value;
}

/* =========================================================================
   * 6. INTERPRETATION: raw answers -> one state object  [P4, P5]
   * -------------------------------------------------------------------------
   * The original scattered this across G_ globals mutated at the top level.
   * Here, one function reads qData and returns the complete survey state;
   * nothing else ever reads qData.
   * ========================================================================= */

// Resolves the respondent's jurisdiction, falling back rather than returning a
// key no factor table has. GRID_LIFECYCLE_KG_PER_GJ et al. are indexed directly
// by this value, so an unmapped region silently poisons every category with NaN.
function resolveRegion(qData, isCanada, countryName) {
    const region = isCanada
        ? choiceFromTable(qData.q21, OPTIONS.canadaProvince)
        : choiceFromTable(qData.q22, OPTIONS.usaState);

    if (!region || !GRID_LIFECYCLE_KG_PER_GJ[region]) {
        const fallback = DEFAULT_REGION[countryName];
        console.warn("Unresolved region for " + countryName +
            " (q21=" + qData.q21 + ", q22=" + qData.q22 + ") — falling back to " + fallback);
        return fallback;
    }
    if (PLACEHOLDER_REGIONS.indexOf(region) !== -1) {
        console.warn("Region " + region + " is using placeholder factors seeded from HI.");
    }
    return region;
}

function buildSurveyState(qData) {
    const isCanada = isFirstChoice(qData.q23);
    const countryName = isCanada ? "CANADA" : "USA";
    const mileageType = isCanada ? "KM" : "MILES";
    const region = resolveRegion(qData, isCanada, countryName);

    // Flight options. The survey now asks one short/medium/long count for
    // everyone (q8/q9/q10) rather than a separate question per region — the
    // per-band factors are national averages. See FLIGHT_FACTOR_TONNES.
    const flight = {
        short: {personal: 0},
        medium: {personal: 0},
        long: {personal: 0},
        flownStatus: false,
        additional: false,
        noFlight: false,
    };
    if (isFirstChoice(qData.q7)) {
        flight.flownStatus = true;
        flight.short.personal = parseIntOrZero(qData.q8);
        flight.medium.personal = parseIntOrZero(qData.q9);
        flight.long.personal = parseIntOrZero(qData.q10);
    }
    const heating = {
        vintage: choiceFromTable(qData.q13, OPTIONS.vintage),
        householdSize: choiceFromTable(qData.q15, OPTIONS.householdSize),
        area: atLeastOne(qData.q16), // sqft of heated floor area
        spaceSystem: choiceFromTable(qData.q17, OPTIONS.spaceSystem),
        dwellingType: choiceFromTable(qData.q12, OPTIONS.dwellingType),
        retrofitFactor: choiceFromTable(qData.q14, OPTIONS.retrofitFactor),
        waterSystem: choiceFromTable(qData.q18, OPTIONS.waterSystem),
        acOn: isFirstChoice(qData.q19),
    };
    const vehicle = {
        fuelType: "novehicle",
        vehicleSize: "car",
        passengers: 1,
        mileage: 0,
    };
    if (isFirstChoice(qData.q1)) {
        vehicle.fuelType = choiceFromTable(qData.q2, OPTIONS.fuelType);
        vehicle.vehicleSize = choiceFromTable(qData.q3,OPTIONS.carSize);
        vehicle.passengers = atLeastOne(qData.q6);
        vehicle.mileage = parseIntOrZero(isCanada ? qData.q4: qData.q5);
    }

    const diet = {
        dietType: choiceFromTable(qData.q11, OPTIONS.diet),
        gender: choiceFromTable(qData.q20, OPTIONS.gender),
    };

    return {countryName, mileageType, region, flight, heating, vehicle, diet};
}
/* =========================================================================
   * 7. EMISSION CALCULATIONS  [P4: state in, tonnes CO2e out — no globals]
   * ========================================================================= */

  // Flight = sum(count x per-flight factor), +3 t if the "additional flight"
  // toggle is on, forced to 0 if the "no flight" toggle is on.

function calculateFlightEmissions(state){
    const flight = state.flight;
    const numShort = flight.short.personal;
    const numMedium = flight.medium.personal;
    const numLong = flight.long.personal;

    const factor = FLIGHT_FACTOR_TONNES[state.countryName];

    let tonnes =
        numShort * factor.short +
        numMedium * factor.medium +
        numLong * factor.long;

    if (flight.additional) {
        tonnes += ADDITIONAL_FLIGHT_TONNES;
    }
    if (flight.noFlight === true) {
        tonnes = 0;
    }
    return Number(tonnes.toFixed(1));
  }

// Residential energy: four components summed to a per-household kg figure,
// then divided by household size for a per-person tonnes figure. Mirrors the
// "Calculator" sheet of CO2_footprint_calculator.xlsx column for column.

function gridFactor(region) {
    return GRID_LIFECYCLE_KG_PER_GJ[region]; // kg CO2e/GJ, lifecycle
}

// Useful-heat efficiency / COP for a known space-heating system.
function spaceEfficiency(system, region) {
    if (system === "naturalgas") return GAS_EFFICIENCY[region];
    if (system === "heatpump") return HEATPUMP_COP[region];
    if (system === "oilpropane") return SPACE_EFF_OILPROP;
    if (system === "wood") return SPACE_EFF_WOOD;
    return SPACE_EFF_ELECTRIC; // electric baseboard
}

// kg CO2e/GJ of delivered fuel for a known space-heating system. Electricity
// systems (baseboard, heat pump) bill at the regional grid factor.
function spaceFuelFactor(system, region) {
    if (system === "naturalgas") return FUEL_NG;
    if (system === "oilpropane") return FUEL_OILPROP;
    if (system === "wood") return FUEL_WOOD;
    return gridFactor(region); // electric, heatpump
}

// "Don't know" space heating: expected kg per GJ of useful heat across the
// national system mix = Sum(share * fuelFactor / efficiency). [P_DKHeat col K]
function dkSpaceCoef(region, countryName) {
    const w = DK_SPACE_MIX[countryName] || DK_SPACE_MIX.CANADA;
    const grid = gridFactor(region);
    return w.gas * (FUEL_NG / GAS_EFFICIENCY[region]) +
        w.oilprop * (FUEL_OILPROP / SPACE_EFF_OILPROP) +
        w.baseboard * grid +
        w.heatpump * (grid / HEATPUMP_COP[region]) +
        w.wood * (FUEL_WOOD / SPACE_EFF_WOOD);
}

// "Don't know" water heating: expected kg per GJ of useful hot water across the
// national mix = Sum(share * fuelFactor / efficiency). [P_DKWater col H]
function dkWaterCoef(region, countryName) {
    const w = DK_WATER_MIX[countryName] || DK_WATER_MIX.CANADA;
    const grid = gridFactor(region);
    return w.gas * (FUEL_NG / WATER_EFF.naturalgas) +
        w.electric * (grid / WATER_EFF.electric) +
        w.oilprop * (FUEL_OILPROP / WATER_EFF.oilpropane) +
        w.hpwh * (grid / WATER_EFF.heatpump);
}

function spaceHeatingKg(heating, region, countryName) {
    const areaM2 = heating.area / SQFT_PER_SQM;
    const usefulGJ =
        SPACE_DEMAND_GJ_PER_M2[region + "|" + heating.vintage] * areaM2 *
        ENVELOPE_FACTOR[heating.dwellingType] * heating.retrofitFactor;
    if (heating.spaceSystem === "unknown") {
        return usefulGJ * dkSpaceCoef(region, countryName);
    }
    const fuelGJ = usefulGJ / spaceEfficiency(heating.spaceSystem, region);
    return fuelGJ * spaceFuelFactor(heating.spaceSystem, region);
}

function waterHeatingKg(heating, region, countryName) {
    // Water demand is NOT size-scaled (water_factor_ref is optional per RECS 2020);
    // occupancy enters water only via the per-person division downstream.
    const usefulGJ = WATER_DEMAND_GJ_PER_HH[region + "|" + heating.dwellingType];
    if (heating.waterSystem === "unknown") {
        return usefulGJ * dkWaterCoef(region, countryName);
    }
    const fuelGJ = usefulGJ / WATER_EFF[heating.waterSystem];
    const factor = heating.waterSystem === "electric" ? gridFactor(region) : FUEL_NG;
    return fuelGJ * factor;
}

function airConditioningKg(heating, region) {
    if (!heating.acOn) return 0;
    const areaM2 = heating.area / SQFT_PER_SQM;
    const electricityGJ =
        COOLING_INTENSITY_GJ_PER_M2[region + "|" + heating.vintage] * areaM2 *
        ENVELOPE_FACTOR[heating.dwellingType] * heating.retrofitFactor;
    return electricityGJ * gridFactor(region);
}

function otherElectricityKg(heating, region) {
    const electricityGJ =
        OTHER_ELEC_BASE_GJ[region] *
        OTHER_ELEC_SIZE_FACTOR[Math.min(heating.householdSize, SIZE_FACTOR_MAX_BIN)];
    return electricityGJ * gridFactor(region);
}

function calculateHeatingEmissions(state){
    const heating = state.heating;
    const region = state.region;
    const country = state.countryName;

    const householdKg =
        spaceHeatingKg(heating, region, country) +
        waterHeatingKg(heating, region, country) +
        airConditioningKg(heating, region) +
        otherElectricityKg(heating, region);

    // Per person: divide the household total by the actual household size (1..9+).
    // The water/other-electricity size factors capture sub-linear scaling of the
    // household total with occupancy; this division converts that total into a
    // per-person figure, consistent with the diet/vehicle/flight categories.
    const perPersonTonnes = householdKg / heating.householdSize / KG_PER_TONNE;
    return Number(perPersonTonnes.toFixed(1));
  }

function calculateVehicleEmissions(state) {
    const vehicle = state.vehicle;

    let mileageKm = vehicle.mileage;
    if (state.mileageType === "MILES") {
        mileageKm = mileageKm * KM_PER_MILE;
    }

    const regionFactors = VEHICLE_FACTOR_BY_REGION[state.region];
    const fuelFactors = regionFactors[vehicle.fuelType] || { car: 0, truck: 0, suv: 0};
    const tonnesPerKm = fuelFactors[vehicle.vehicleSize] / KG_PER_TONNE;

    return Number(((tonnesPerKm * mileageKm) / vehicle.passengers).toFixed(1));
}

function calculateDietEmissions(state) {
    return Number(DIET_FACTOR_TONNES[state.diet.gender][state.diet.dietType].toFixed(1));
}

function computeEmissions(state) {
    const flight = calculateFlightEmissions(state);
    const heating = calculateHeatingEmissions(state);
    const vehicle = calculateVehicleEmissions(state);
    const diet = calculateDietEmissions(state);
    const total = parseFloat((flight + heating + vehicle + diet).toFixed(1));
    return { flight, heating, vehicle, diet, total };
}

function calculateYAxisMax(state) {
    const counterfactualTotal = calculateFlightEmissions(state) +
    calculateHeatingEmissions(state) +
    calculateVehicleEmissions(state) +
    calculateDietEmissions(state) +
    ADDITIONAL_FLIGHT_TONNES;
    return Math.ceil(counterfactualTotal + Y_AXIS_HEADROOM_TONNES);
}

 /* =========================================================================
   * 7B. COUNTERFACTUALS  [P3, P4: state in, tonnes CO2e out — no globals]
   * -------------------------------------------------------------------------
*/

function withPatch(state, key, patch){
    return Object.assign({}, state, {
        [key]: Object.assign({}, state[key], patch),
    });
}

function calculateEV_CF(state){
    return calculateVehicleEmissions(withPatch(state, "vehicle", { fuelType: "battery"}));
}

function calculateGas_CF(state) {
    return calculateVehicleEmissions(withPatch(state, "vehicle", { fuelType: "petrol" }));
  }

function calculateAvgGas_CF(state) {
    const cfState = Object.assign(
      withPatch(state, "vehicle", {
        fuelType: "petrol",
        mileage: AVG_GAS_CF_DISTANCE_KM,
        passengers: 1,
      }),
      { mileageType: "KM" }
    );
    return calculateVehicleEmissions(cfState);
  }

function calculateHeatPump_CF(state) {
    return calculateHeatingEmissions(withPatch(state, "heating", { spaceSystem: "heatpump" }));
}

function calculateVegan_CF(state) {
    return calculateDietEmissions(withPatch(state, "diet", { dietType: "vegan" }));
}

/* =========================================================================
   * 8. CHART RENDERING  [P5, P6]
   * -------------------------------------------------------------------------
   * Chart.js v2 syntax (xAxes/yAxes arrays, options.title) — requires
   * Chart.js 2.x. A "stacked bar across three columns" is faked with six
   * datasets: the four emission components carry data only in column 0, the
   * global average only in column 1, the 2030 target only in column 2.
   * ========================================================================= */

const DATASET = {DIET: 0, VEHICLE: 1, FLIGHT: 2, HEATING: 3};

const COLORS = {
    diet: "rgba(217,155,253,0.8)",
    vehicle: "rgba(158,195,255,0.8)",
    flight: "rgba(255,205,86,0.8)",
    heating: "rgba(112,128,144,0.8)",
    globalAverage: "#4caf50",
    target: "#8bc34a",
  };

function chartTitle(totalTonnes) {
    return "Your Emissions: " + totalTonnes + " t CO₂e/year";
}

function createChart(emissions, yAxisMax) {
    const ctx = document.getElementById("myChart").getContext("2d");
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Your Emissions", "Global Average", "2030 Target"],
        datasets: [
          // Order must match DATASET above. [P6]
          {
            label: "Diet",
            data: [emissions.diet, 0, 0],
            backgroundColor: COLORS.diet,
          },
          {
            label: "Ground Transport",
            data: [emissions.vehicle, 0, 0],
            backgroundColor: COLORS.vehicle,
          },
          {
            label: "Flight",
            data: [emissions.flight, 0, 0],
            backgroundColor: COLORS.flight,
          },
          {
            label: "Home Heating",
            data: [emissions.heating, 0, 0],
            backgroundColor: COLORS.heating,
          },
          {
            label: "Global Average",
            data: [0, GLOBAL_AVERAGE_TONNES, 0],
            backgroundColor: COLORS.globalAverage,
          },
          {
            label: "2030 Target",
            data: [0, 0, SUSTAINABLE_TARGET_TONNES],
            backgroundColor: COLORS.target,
          },
        ],
      },
      options: {
        scales: {
          xAxes: [{ stacked: true }],
          yAxes: [
            {
              stacked: true,
              ticks: {
                beginAtZero: true,
                max: yAxisMax, // frozen at load — see calculateYAxisMax
                callback: function (v) {
                  return v + " t";
                },
                fontColor: "#333",
              },
              scaleLabel: {
                display: true,
                labelString: "t CO₂e",
                fontColor: "#333",
              },
              gridLines: { color: "rgba(0,0,0,0.1)" },
            },
          ],
        },
        legend: {
          position: "bottom",
          onClick: function () {}, // disable hide-on-click: respondents must
          labels: { fontColor: "#333" }, // not be able to hide bars
        },
        title: {
          display: true,
          text: chartTitle(emissions.total),
          padding: 30,
          fontSize: 24,
          fontFamily: "Arial",
          fontColor: "#333",
          fontStyle: "bold",
        },
      },
    });
  }

/* =========================================================================
   * 9. INTERACTIVITY  [P3: one wiring helper replaces four copy-pasted
   *    listeners; P4: all listeners funnel through one refresh function]
   *

========================================================================= */

function setInitialToggles(state) {
    $("input:radio[name=flightToggle]").val([
      state.flight.flownStatus ? "currentflight" : "noflight",
    ]);

    const knownHeating = ["naturalgas", "electric", "heatpump", "oilpropane", "wood"];
    $("input:radio[name=heatingToggle]").val([
      knownHeating.includes(state.heating.spaceSystem)
        ? state.heating.spaceSystem
        : "naturalgas",
    ]);

    $("input:radio[name=vehicleToggle]").val([
      state.vehicle.fuelType === "diesel" ? "petrol" : state.vehicle.fuelType,
    ]);

    $("input:radio[name=dietToggle]").val([state.diet.dietType]);
  }

  function refreshChart(chart, state, yAxisMax) {
    const emissions = computeEmissions(state);
    chart.data.datasets[DATASET.DIET].data[0] = emissions.diet;
    chart.data.datasets[DATASET.VEHICLE].data[0] = emissions.vehicle;
    chart.data.datasets[DATASET.FLIGHT].data[0] = emissions.flight;
    chart.data.datasets[DATASET.HEATING].data[0] = emissions.heating;
    chart.options.title.text = chartTitle(emissions.total);
    chart.options.scales.yAxes[0].ticks.max = yAxisMax; // stays frozen
    chart.update();
  }

  // One generic wiring function. Each toggle supplies only the part that
  // differs: how the selected value changes the state. [P3]
  function wireToggles(chart, state, yAxisMax) {
    // Captured once, before any toggle mutates fuelType: did this respondent
    // actually report a vehicle? A "no vehicle" respondent has mileage 0, so
    // their vehicle toggles would otherwise compute 0 forever. For them, picking
    // a real fuel simulates a solo driver at the average-gas-car distance
    // (17,000 km) so the radios are meaningful. Selecting "No Vehicle" again
    // returns to 0.
    const hasNoReportedVehicle = state.vehicle.fuelType === "novehicle";

    const toggleActions = {
      // The flight toggle is the study's intervention lever: three states
      // instead of a simple category swap.
      flightToggle: function (value) {
        state.flight.additional = value === "additionalflight";
        state.flight.noFlight = value === "noflight";
      },
      // spaceSystem is the single source of truth; efficiency/COP and fuel
      // factor are derived from it at calc time, so the counterfactual uses the
      // toggled system's real values. Radio values must be one of:
      // naturalgas | electric | heatpump | oilpropane | wood.
      heatingToggle: function (value) {
        state.heating.spaceSystem = value;
      },
      vehicleToggle: function (value) {
        state.vehicle.fuelType = value;
        if (hasNoReportedVehicle && value !== "novehicle") {
          // Solo driver, average gas-car distance, in km regardless of region.
          state.vehicle.passengers = 1;
          state.vehicle.vehicleSize = "car";
          state.vehicle.mileage = AVG_GAS_CF_DISTANCE_KM;
          state.mileageType = "KM";
        }
      },
      dietToggle: function (value) {
        state.diet.dietType = value;
      },
    };

    Object.keys(toggleActions).forEach(function (name) {
      $("input[type=radio][name=" + name + "]").on("change", function () {
        toggleActions[name]($(this).val());
        refreshChart(chart, state, yAxisMax);
      });
    });
  }

  /* =========================================================================
   * 10. MAIN  [P5: the whole program, told top to bottom]========================================================================= */
  const state = buildSurveyState(qData);
  const emissions = computeEmissions(state);

  if (jQuery("#footprint").length) {
    jQuery("#footprint").html(emissions.total.toFixed(1) + " t CO<sub>2</sub>");
  }
  Qualtrics.SurveyEngine.setEmbeddedData("Flights", emissions.flight.toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Mobility", emissions.vehicle.toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Diet", emissions.diet.toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Heat", emissions.heating.toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("GHG_Total", emissions.total.toFixed(1));

  // Counterfactuals (downstream pages pipe these)
  Qualtrics.SurveyEngine.setEmbeddedData("EV_CF", calculateEV_CF(state).toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Gas_CF", calculateGas_CF(state).toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Avg_Gas_CF", calculateAvgGas_CF(state).toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("HeatPump_CF", calculateHeatPump_CF(state).toFixed(1));
  Qualtrics.SurveyEngine.setEmbeddedData("Vegan_CF", calculateVegan_CF(state).toFixed(1));

  // -- Chart role: only on the page that has the canvas --
  if (document.getElementById("myChart")) {
    const yAxisMax = calculateYAxisMax(state);
    const chart = createChart(emissions, yAxisMax);
    setInitialToggles(state);
    wireToggles(chart, state, yAxisMax);
  }
  
});