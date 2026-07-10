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

const FLIGHT_FACTOR_TONNES = {
    short: 0.181154,
    medium: 0.746467,
    long: 2.991917,
    default: 0,
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
    QC: 0.6722226,
    ON: 13.955564,
    AB: 158.81122,
    BC: 5.466670,
    CO: 159.478634,
    MI: 123.364129,
    NY: 76.170706,
    WA: 41.748111,
};

// Gas-furnace seasonal efficiency, province/state-specific. [P_GasEff]
const GAS_EFFICIENCY = {
    QC: 0.88, ON: 0.89, AB: 0.87, BC: 0.87,
    CO: 0.85, MI: 0.85, NY: 0.85, WA: 0.85,
};

// Air-source heat-pump seasonal COP: 1.9 Canada / 1.9 US. [P_HPcop]
const HEATPUMP_COP = {
    QC: 1.9, ON: 1.9, AB: 1.9, BC: 1.9,
    CO: 1.9, MI: 1.9, NY: 1.9, WA: 1.9,
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
    "QC|pre-1960": 0.85, "QC|1960-1983": 0.65, "QC|1984-1999": 0.45, "QC|2000+": 0.34,
    "ON|pre-1960": 0.85, "ON|1960-1983": 0.55, "ON|1984-1999": 0.40, "ON|2000+": 0.33,
    "AB|pre-1960": 0.90, "AB|1960-1983": 0.65, "AB|1984-1999": 0.45, "AB|2000+": 0.36,
    "BC|pre-1960": 0.55, "BC|1960-1983": 0.40, "BC|1984-1999": 0.30, "BC|2000+": 0.22,
    "CO|pre-1960": 0.314, "CO|1960-1983": 0.279, "CO|1984-1999": 0.247, "CO|2000+": 0.199,
    "MI|pre-1960": 0.46, "MI|1960-1983": 0.357, "MI|1984-1999": 0.289, "MI|2000+": 0.267,
    "NY|pre-1960": 0.331, "NY|1960-1983": 0.32, "NY|1984-1999": 0.261, "NY|2000+": 0.217,
    "WA|pre-1960": 0.278, "WA|1960-1983": 0.247, "WA|1984-1999": 0.233, "WA|2000+": 0.182,
};

// Air-conditioning electricity intensity (GJ/m2/yr), keyed "REGION|vintage". [P_Cooling]
const COOLING_INTENSITY_GJ_PER_M2 = {
    "QC|pre-1960": 0.053, "QC|1960-1983": 0.041, "QC|1984-1999": 0.029, "QC|2000+": 0.024,
    "ON|pre-1960": 0.043, "ON|1960-1983": 0.033, "ON|1984-1999": 0.023, "ON|2000+": 0.019,
    "AB|pre-1960": 0.009, "AB|1960-1983": 0.007, "AB|1984-1999": 0.005, "AB|2000+": 0.004,
    "BC|pre-1960": 0.029, "BC|1960-1983": 0.023, "BC|1984-1999": 0.016, "BC|2000+": 0.013,
    "CO|pre-1960": 0.042, "CO|1960-1983": 0.029, "CO|1984-1999": 0.027, "CO|2000+": 0.024,
    "MI|pre-1960": 0.043, "MI|1960-1983": 0.036, "MI|1984-1999": 0.020, "MI|2000+": 0.018,
    "NY|pre-1960": 0.063, "NY|1960-1983": 0.060, "NY|1984-1999": 0.041, "NY|2000+": 0.029,
    "WA|pre-1960": 0.050, "WA|1960-1983": 0.033, "WA|1984-1999": 0.022, "WA|2000+": 0.019,
};

// Water-heating useful demand U (GJ/household/yr), keyed "REGION|dwelling".
// Dwelling-type load already baked in — do NOT re-apply envelope factor. [P_U_water]
const WATER_DEMAND_GJ_PER_HH = {
    "QC|detached": 12.4, "QC|attached": 11.3, "QC|apartment": 8.5,
    "ON|detached": 11.2, "ON|attached": 10.2, "ON|apartment": 7.6,
    "AB|detached": 19.8, "AB|attached": 18.0, "AB|apartment": 13.5,
    "BC|detached": 15.8, "BC|attached": 14.4, "BC|apartment": 10.8,
    "CO|detached": 12.8, "CO|attached": 11.6, "CO|apartment": 8.7,
    "MI|detached": 11.6, "MI|attached": 10.6, "MI|apartment": 7.9,
    "NY|detached": 12.0, "NY|attached": 10.9, "NY|apartment": 8.2,
    "WA|detached": 14.7, "WA|attached": 13.4, "WA|apartment": 10.0,
};

// Other-electricity baseline (appliances/lighting/plug), GJ/household/yr. [P_OtherElec]
const OTHER_ELEC_BASE_GJ = {
    QC: 20.2, ON: 12.8, AB: 16.2, BC: 17.0,
    CO: 21, MI: 21, NY: 16, WA: 20,
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
    WA: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.128, suv: 0.128},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    CO: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.128, suv: 0.128},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}}),
    MI: regionVehicleFactors({
        phev: {car: 0.098, truck: 0.144, suv: 0.144},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}}),
    NY: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
    BC: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.065, suv: 0.065}}),
    AB: regionVehicleFactors({
        phev: {car: 0.086, truck: 0.128, suv: 0.128},
        battery: {car: 0.05, truck: 0.08, suv: 0.08}}),
    ON: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.065, suv: 0.065}}),
    QC: regionVehicleFactors({
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.064, suv: 0.064}}),
};

/* =========================================================================
   * 4. ANSWER-OPTION TABLES  [P2: survey recodes map to values through data]
   * -------------------------------------------------------------------------
   * Each array is 1-based: Qualtrics recode 1 selects element 1. Index 0 is
   * the fallback for a blank (unanswered) question.
   * ========================================================================= */

const OPTIONS = {
    // q33 dwelling vintage {<1960:1, 1960-1983:2, 1984-1999:3, >2000:4}; blank -> 1984-1999
    vintage: ["1984-1999", "pre-1960", "1960-1983", "1984-1999", "2000+"],
    // q40 dwelling {Apartment:1, Semi-detached:2, Detached:3}; blank -> detached
    dwellingType: ["detached", "apartment", "attached", "detached"],
    // q36 space heating {Gas:1, Electric:2, Heat pump:3, Oil/Propane:4, Wood:5, Don't know:6}; blank -> naturalgas
    spaceSystem: ["naturalgas", "naturalgas", "electric", "heatpump", "oilpropane", "wood", "unknown"],
    // q42 water heating {Natural gas:1, Electric:2, Don't know:3}; blank -> naturalgas
    waterSystem: ["naturalgas", "naturalgas", "electric", "unknown"],
    // q41 windows/insulation upgraded {Yes:1, No:2, Unsure:3} -> demand multiplier; blank -> 1.0
    retrofitFactor: [1.0, 0.85, 1.0, 1.0],
    fuelType: ["", "petrol", "diesel", "hybrid", "phev", "battery"],
    carSize: ["", "car", "truck", "suv"],
    diet: ["", "omnivore", "flexitarian", "vegetarian", "vegan"],
    // q44 gender {Male:1, Female:2, Other:3}; blank/Other -> averaged factors
    gender: ["other", "men", "women", "other"],
    canadaProvince: ["", "ON", "QC", "AB", "BC"],
    usaState: ["", "WA", "CO", "MI", "NY"],
    // q34 {1..9+}; recode 9 = "9+"; blank -> 1
    householdSize: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
};

const SHORT_HAUL_QUESTION_BY_REGION = {
    ON: "q8",
    QC: "q9",
    AB: "q10",
    BC: "q11",
    NY: "q12",
    MI: "q13",
    CO: "q14",
    WA: "q15",
};

const MEDIUM_HAUL_QUESTION_BY_REGION = {
    ON: "q16",
    QC: "q17",
    AB: "q18",
    BC: "q19",
    NY: "q20",
    MI: "q21",
    CO: "q22",
    WA: "q23",
};

const LONG_HAUL_QUESTION_BY_REGION = {
    ON: "q24",
    AB: "q25",
    QC: "q26",
    BC: "q27",
    NY: "q28",
    WA: "q29",
    CO: "q30",
    MI: "q31",
};

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

function buildSurveyState(qData) {
    const isCanada = isFirstChoice(qData.q37);
    const countryName = isCanada ? "CANADA" : "USA";
    const mileageType = isCanada ? "KM" : "MILES";
    const region = isCanada ? choiceFromTable(qData.q38, OPTIONS.canadaProvince) : choiceFromTable(qData.q39, OPTIONS.usaState);

    // Flight options
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
        flight.short.personal = parseIntOrZero(qData[SHORT_HAUL_QUESTION_BY_REGION[region]]);
        flight.medium.personal = parseIntOrZero(qData[MEDIUM_HAUL_QUESTION_BY_REGION[region]]);
        flight.long.personal = parseIntOrZero(qData[LONG_HAUL_QUESTION_BY_REGION[region]])
    }
    const heating = {
        vintage: choiceFromTable(qData.q33, OPTIONS.vintage),
        householdSize: choiceFromTable(qData.q34, OPTIONS.householdSize),
        area: atLeastOne(qData.q35), // sqft of heated floor area
        spaceSystem: choiceFromTable(qData.q36, OPTIONS.spaceSystem),
        dwellingType: choiceFromTable(qData.q40, OPTIONS.dwellingType),
        retrofitFactor: choiceFromTable(qData.q41, OPTIONS.retrofitFactor),
        waterSystem: choiceFromTable(qData.q42, OPTIONS.waterSystem),
        acOn: isFirstChoice(qData.q43),
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
        dietType: choiceFromTable(qData.q32, OPTIONS.diet),
        gender: choiceFromTable(qData.q44, OPTIONS.gender),
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

    let tonnes = 
        numShort * FLIGHT_FACTOR_TONNES.short + 
        numMedium * FLIGHT_FACTOR_TONNES.medium +
        numLong * FLIGHT_FACTOR_TONNES.long;

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