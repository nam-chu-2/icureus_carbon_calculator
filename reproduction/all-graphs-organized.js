/**
 * all-graphs-organized.js
 * =======================
 * A behavior-identical reorganization of "June 10 2026/all-graphs.js",
 * restructured to demonstrate common programming principles. Compare the two
 * files side by side: every number and every observable behavior is the same;
 * only the organization changed.
 *
 * Principles demonstrated (look for the [P#] tags in section headers):
 *  [P1] Named constants — magic numbers (3.8, 10.7639, 1.60934, 3.0, ...) get
 *       names and units, so formulas read like the methods section of a paper.
 *  [P2] Data over branching — long if/else and switch chains become lookup
 *       tables (e.g. which short-haul question to read per province).
 *  [P3] Single source of truth / DRY — duplicated data (grid intensity,
 *       combustion-vehicle factors, building-standard groups) is defined once
 *       and referenced; the four near-identical event listeners share one
 *       wiring helper.
 *  [P4] Pure functions over global mutation — calculations take state as a
 *       parameter and return values, instead of reading and writing G_ globals.
 *  [P5] Separation of concerns — the file is layered: input -> constants ->
 *       parsing -> interpretation -> calculation -> rendering -> interactivity,
 *       with a short "main" at the bottom that tells the whole story.
 *  [P6] Named indices — chart dataset positions get names (DATASET.FLIGHT)
 *       instead of bare numbers scattered through the listeners.
 *
 * Quirks of the original that are deliberately PRESERVED (this file reproduces
 * behavior, it does not fix bugs — see LEARNING-PLAN.md, Phases 3-5):
 *  [Q1] getFuelType returns "PHEV" (uppercase) but the factor table uses
 *       "phev" — PHEV drivers fall through to zero vehicle emissions.
 *  [Q2] buildingStandard blank key is "" for QC but "blank" elsewhere — a
 *       blank answer outside QC looks up undefined and yields NaN heating.
 *  [Q3] Vehicle emissions are NOT rounded to one decimal (the original's
 *       `.toFixed(1)` binds to the divisor, not the result).
 *  [Q4] heatingEfficiency is set from the same answer as heatingType and is
 *       never updated by the what-if heating toggle.
 * (Only cosmetic difference: the original's initial chart title contained a
 * doubled space after the colon; this version uses one title helper.)
 */
Qualtrics.SurveyEngine.addOnReady(function () {
  console.log(" =-= GHG Chart script started =-=");

  /* =========================================================================
   * 1. SURVEY INPUT  [P5: the only Qualtrics-specific layer]
   * -------------------------------------------------------------------------
   * Piped-text placeholders are replaced by the Qualtrics SERVER before this
   * script runs, so each value below is already a plain string. This block
   * must stay literal — it cannot be generated or moved out of the file.
   * ========================================================================= */
  const qData = {
    q1: "${q://QID123/SelectedChoicesRecode}", // Car Access: {Yes: 1, No: 2}
    q2: "${q://QID2/SelectedChoicesRecode}", // Type of car: {Gas: 1, Diesel: 2, Hybrid: 3, Plug-in hybrid: 4, Electric: 5}
    q3: "${q://QID3/SelectedChoicesRecode}", // Size of car: {Car: 1, Truck: 2, SUV: 3}
    q4: "${q://QID4/ChoiceNumericEntryValue/1}", // Kilometers driven: 0 - 30,000 +
    q5: "${q://QID302/ChoiceNumericEntryValue/1}", // Miles driven: 0 - 39,000 +
    q6: "${q://QID343/ChoiceTextEntryValue}", // How many people do you drive with? (Numeric)
    q7: "${q://QID10/SelectedChoicesRecode}", // Do you expect to fly: {Yes: 1, No: 2}
    q8: "${q://QID12/ChoiceTextEntryValue}", // # of short haul flights (Ontario)
    q9: "${q://QID273/ChoiceTextEntryValue}", // # of short haul flights (Quebec)
    q10: "${q://QID276/ChoiceTextEntryValue}", // # of short haul flights (Alberta)
    q11: "${q://QID278/ChoiceTextEntryValue}", // # of short haul flights (British Columbia)
    q12: "${q://QID280/ChoiceTextEntryValue}", // # of short haul flights (New York)
    q13: "${q://QID282/ChoiceTextEntryValue}", // # of short haul flights (Michigan)
    q14: "${q://QID284/ChoiceTextEntryValue}", // # of short haul flights (Colorado)
    q15: "${q://QID286/ChoiceTextEntryValue}", // # of short haul flights (Washington)
    q16: "${q://QID13/ChoiceTextEntryValue}", // # of medium haul flights (Ontario)
    q17: "${q://QID326/ChoiceTextEntryValue}", // # of medium haul flights (Quebec)
    q18: "${q://QID328/ChoiceTextEntryValue}", // # of medium haul flights (Alberta)
    q19: "${q://QID330/ChoiceTextEntryValue}", // # of medium haul flights (British Columbia)
    q20: "${q://QID288/ChoiceTextEntryValue}", // # of medium haul flights (New York)
    q21: "${q://QID334/ChoiceTextEntryValue}", // # of medium haul flights (Michigan)
    q22: "${q://QID332/ChoiceTextEntryValue}", // # of medium haul flights (Colorado)
    q23: "${q://QID336/ChoiceTextEntryValue}", // # of medium haul flights (Washington)
    q24: "${q://QID14/ChoiceTextEntryValue}", // # of long haul flights (Ontario)
    q25: "${q://QID355/ChoiceTextEntryValue}", // # of long haul flights (Alberta)
    q26: "${q://QID354/ChoiceTextEntryValue}", // # of long haul flights (Quebec)
    q27: "${q://QID368/ChoiceTextEntryValue}", // # of long haul flights (British Columbia)
    q28: "${q://QID290/ChoiceTextEntryValue}", // # of long haul flights (New York)
    q29: "${q://QID370/ChoiceTextEntryValue}", // # of long haul flights (Washington)
    q30: "${q://QID372/ChoiceTextEntryValue}", // # of long haul flights (Colorado)
    q31: "${q://QID374/ChoiceTextEntryValue}", // # of long haul flights (Michigan)
    q32: "${q://QID21/SelectedChoicesRecode}", // Diet: {Omnivore: 1, Flexitarian: 2, Vegetarian: 3, Vegan: 4}
    q33: "${q://QID23/SelectedChoicesRecode}", // Age of Residence: {< 1960: 1, 1960-1983: 2, > 1983: 3}
    q34: "${q://QID24/SelectedChoicesRecode}", // Size of household: {1-10+}
    q35: "${q://QID25/ChoiceTextEntryValue}", // Size of Residence
    q36: "${q://QID26/SelectedChoicesRecode}", // Main type of heating {Oil: 1, Gas: 2, Electric: 3, Heat pump: 4, Wood: 5, I don't know: 6}
    q37: "${q://QID262/SelectedChoicesRecode}", // What is your country: {Canada: 1, USA: 2}
    q38: "${q://QID1720071882/SelectedChoicesRecode}", // Which province? {Ontario: 1, Quebec: 2, Alberta: 3, British Columbia: 4}
    q39: "${q://QID1720071883/SelectedChoicesRecode}", // Which state? {Washington: 1, Colorado: 2, Michigan: 3, New York: 4}
  };
  console.log(qData);

  /* =========================================================================
   * 2. CONSTANTS  [P1: every magic number gets a name and a unit]
   * ========================================================================= */

  // Benchmarks shown on the chart (tonnes CO2e per person per year)
  const GLOBAL_AVERAGE_TONNES = 3.8;
  const SUSTAINABLE_TARGET_TONNES = 2.5;

  // The "what if I took one more long-haul flight?" counterfactual (tonnes)
  const ADDITIONAL_FLIGHT_TONNES = 3.0;

  // Unit conversions
  const SQFT_PER_SQM = 10.7639; // survey collects house size in square feet
  const KM_PER_MILE = 1.60934; // US respondents report annual miles
  const KG_PER_TONNE = 1000;

  // Y-axis headroom added before ceiling (tonnes)
  const Y_AXIS_HEADROOM_TONNES = 0.5;

  /* =========================================================================
   * 3. EMISSION FACTORS  [P3: shared data defined once, referenced everywhere]
   * ========================================================================= */

  // FLIGHT: tonnes CO2e per round trip, by haul length
  const FLIGHT_FACTOR_TONNES = {
    short: 0.181154,
    medium: 0.746467,
    long: 2.991917,
    default: 0,
  };

  // Grid carbon intensity by province/state. Electricity-based heating
  // ("hydro" — should really be labeled "electric" — and heat pumps) depends
  // on the local grid, so these two heating types share this one table. [P3]
  const GRID_INTENSITY = {
    BC: 4.167,
    AB: 136.111,
    ON: 10.556,
    QC: 0.472,
    WA: 36.791,
    CO: 142.0,
    MI: 114.91,
    NY: 65.771,
  };

  // HEATING: fuel carbon factor by heating type. Blank/unknown answers
  // default to the gas factor (the most common system).
  const HEATING_FACTOR = {
    oil: 70.271,
    gas: 50.149,
    hydro: GRID_INTENSITY,
    heatpump: GRID_INTENSITY,
    wood: 0.001,
    unknown: 50.149,
    "": 50.149,
  };

  // HEATING: system efficiency (dimensionless; heat pump 2.74 is a COP)
  const HEATING_EFFICIENCY = {
    oil: 0.81,
    gas: 0.8725,
    hydro: 1.0,
    heatpump: 2.74,
    wood: 0.78,
    unknown: 0.9,
    "": 0.9,
  };

  /* BUILDING STANDARD: energy-intensity multiplier by region x building age.
   * Regions fall into four groups (VH's revision note in the original):
   *        QC    (ON/NY/MI/CO)   AB    (BC/WA)
   * old:   0.62  0.62            0.76  0.57
   * mid:   0.55  0.54            0.74  0.53
   * new:   0.52  0.46            0.61  0.49
   * blank: 0.56  0.54            0.70  0.58
   * [P3] Each group is defined once and shared by reference.
   * [Q2] PRESERVED QUIRK: QC keys its blank entry as "" while the other
   * groups use "blank". The parser returns "" for a blank answer, so outside
   * QC the lookup is undefined and heating emissions become NaN.
   */
  const BUILDING_STANDARD_QC = { old: 0.62, mid: 0.55, new: 0.52, "": 0.56 };
  const BUILDING_STANDARD_CENTRAL = { old: 0.62, mid: 0.54, new: 0.46, blank: 0.54 };
  const BUILDING_STANDARD_AB = { old: 0.76, mid: 0.74, new: 0.61, blank: 0.7 };
  const BUILDING_STANDARD_PACIFIC = { old: 0.57, mid: 0.53, new: 0.49, blank: 0.58 };

  const BUILDING_STANDARD_BY_REGION = {
    QC: BUILDING_STANDARD_QC,
    ON: BUILDING_STANDARD_CENTRAL,
    NY: BUILDING_STANDARD_CENTRAL,
    MI: BUILDING_STANDARD_CENTRAL,
    CO: BUILDING_STANDARD_CENTRAL,
    AB: BUILDING_STANDARD_AB,
    BC: BUILDING_STANDARD_PACIFIC,
    WA: BUILDING_STANDARD_PACIFIC,
  };

  /* VEHICLE: kg CO2e per km, by region x fuel x size (updated Feb 4, 2026).
   * Combustion factors (petrol/diesel/hybrid) are identical in every region;
   * only the grid-dependent rows (phev/battery) vary, because those vehicles
   * charge from the local grid. [P3] The shared rows are defined once.
   * [Q1] PRESERVED QUIRK: keys are lowercase "phev" but the parser returns
   * "PHEV", so PHEV drivers hit the zero fallback in the calculation.
   */
  const COMBUSTION_VEHICLE_FACTORS = {
    petrol: { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel: { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid: { truck: 0.219, car: 0.144, suv: 0.219 },
  };

  function regionVehicleFactors(gridDependentRows) {
    return Object.assign({}, COMBUSTION_VEHICLE_FACTORS, gridDependentRows);
  }

  const VEHICLE_FACTOR_BY_REGION = {
    WA: regionVehicleFactors({
      phev: { truck: 0.128, car: 0.086, suv: 0.128 },
      battery: { truck: 0.081, car: 0.05, suv: 0.081 },
    }),
    CO: regionVehicleFactors({
      phev: { truck: 0.128, car: 0.086, suv: 0.128 },
      battery: { truck: 0.081, car: 0.05, suv: 0.081 },
    }),
    MI: regionVehicleFactors({
      phev: { truck: 0.144, car: 0.098, suv: 0.144 },
      battery: { truck: 0.124, car: 0.077, suv: 0.124 },
    }),
    NY: regionVehicleFactors({
      phev: { truck: 0.122, car: 0.081, suv: 0.122 },
      battery: { truck: 0.064, car: 0.04, suv: 0.064 },
    }),
    BC: regionVehicleFactors({
      phev: { truck: 0.122, car: 0.081, suv: 0.122 },
      battery: { truck: 0.065, car: 0.04, suv: 0.065 },
    }),
    AB: regionVehicleFactors({
      phev: { truck: 0.128, car: 0.086, suv: 0.128 },
      battery: { truck: 0.08, car: 0.05, suv: 0.08 },
    }),
    ON: regionVehicleFactors({
      phev: { truck: 0.122, car: 0.081, suv: 0.122 },
      battery: { truck: 0.065, car: 0.04, suv: 0.065 },
    }),
    QC: regionVehicleFactors({
      phev: { truck: 0.122, car: 0.081, suv: 0.122 },
      battery: { truck: 0.064, car: 0.04, suv: 0.064 },
    }),
  };

  // DIET: tonnes CO2e per person per year. Blank answer = omnivore (VH's
  // assumption: non-response defaults to the most common diet).
  const DIET_FACTOR_TONNES = {
    omnivore: 1.6279,
    flexitarian: 1.23735,
    vegetarian: 0.8468,
    vegan: 0.5037,
    "": 1.6279,
  };

  /* =========================================================================
   * 4. ANSWER-OPTION TABLES  [P2: survey recodes map to values through data]
   * -------------------------------------------------------------------------
   * Each array is 1-based: Qualtrics recode 1 selects element 1. Index 0 is
   * the fallback for a blank (unanswered) question.
   * ========================================================================= */
  const OPTIONS = {
    buildingStandard: ["", "old", "mid", "new"],
    heatingType: ["", "oil", "gas", "hydro", "heatpump", "wood", "unknown"], // wood=5, unknown=6
    fuelType: ["", "petrol", "diesel", "hybrid", "phev", "battery"], // [Q1]
    carSize: ["", "car", "truck", "suv"],
    diet: ["", "omnivore", "flexitarian", "vegetarian", "vegan"],
    canadaProvince: ["", "ON", "QC", "AB", "BC"],
    usaProvince: ["", "WA", "CO", "MI", "NY"],
    householdSize: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // blank -> 1 person
  };

  // Which qData field holds the short-haul flight count for each region. [P2]
  // (The original used an 8-branch if/else chain for this.)
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

  // Which qData field holds the MEDIUM-haul flight count for each region. [P2]
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

  // Which qData field holds the LONG-haul flight count for each region. [P2]
  const LONG_HAUL_QUESTION_BY_REGION = {
    ON: "q24",
    QC: "q26",
    AB: "q25",
    BC: "q27",
    NY: "q28",
    MI: "q31",
    CO: "q30",
    WA: "q29",
  };

  /* =========================================================================
   * 5. GENERIC PARSERS  [P4: pure functions — string in, value out]
   * ========================================================================= */

  function parseIntOrZero(answer) {
    const parsed = parseInt(answer);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parses a Qualtrics SelectedChoicesRecode string ("3" or "1, 3") into the
   * selected recode(s). Limits inherited from the original: single-digit
   * recodes only (reads charAt(0)), ", " separators, blank answer -> 0.
   * @returns {number|number[]} a number for one selection, an array for many
   */
  function extractSelectedChoices(answer, forceReturnArray = false) {
    const NO_ANSWER = 0;
    let indices = [];
    if (answer == null || String(answer).trim() === "") {
      indices.push(NO_ANSWER);
    } else {
      indices = String(answer)
        .split(",")
        .map(part => parseInt(part.trim())); // split on comma; handles multi-digit recodes
    }
    return indices.length == 1 && !forceReturnArray ? indices[0] : indices;
  }

  // One helper replaces the original's seven copy-pasted lookup parsers. [P3]
  function choiceFromTable(answer, table) {
    return table[extractSelectedChoices(answer)];
  }

  function isFirstChoice(answer) {
    // yes/no questions where recode 1 means "yes"
    return extractSelectedChoices(answer) == 1;
  }

  function atLeastOne(answer) {
    // numeric answers used as divisors (house size, passengers) are clamped
    // to a minimum of 1 to avoid division by zero
    const value = parseIntOrZero(answer);
    return value < 1 ? 1 : value;
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
    const region = isCanada
      ? choiceFromTable(qData.q38, OPTIONS.canadaProvince)
      : choiceFromTable(qData.q39, OPTIONS.usaProvince);

    // -- Flight --
    const flight = {
      short: { personal: 0, business: 0 }, // business legs: kept from an
      medium: { personal: 0, business: 0 }, // earlier design, always 0
      long: { personal: 0, business: 0 },
      flownStatus: false,
      additional: false, // what-if toggle: one extra long-haul flight
      noFlight: false, // what-if toggle: no flights at all
    };
    if (isFirstChoice(qData.q7)) {
      flight.flownStatus = true;
      flight.short.personal = parseIntOrZero(
        qData[SHORT_HAUL_QUESTION_BY_REGION[region]]
      );
      flight.medium.personal = parseIntOrZero(
        qData[MEDIUM_HAUL_QUESTION_BY_REGION[region]]
      );
      flight.long.personal = parseIntOrZero(
        qData[LONG_HAUL_QUESTION_BY_REGION[region]]
      );
    }

    // -- Heating --
    // [Q4] PRESERVED QUIRK: heatingEfficiency comes from the same answer as
    // heatingType, and the heating what-if toggle later updates only
    // heatingType — efficiency stays frozen at the respondent's real system.
    const heating = {
      houseSize: atLeastOne(qData.q35), // square feet
      householdSize: choiceFromTable(qData.q34, OPTIONS.householdSize),
      buildingStandard: choiceFromTable(qData.q33, OPTIONS.buildingStandard),
      heatingType: choiceFromTable(qData.q36, OPTIONS.heatingType),
      heatingEfficiency: choiceFromTable(qData.q36, OPTIONS.heatingType),
    };

    // -- Vehicle --
    const vehicle = {
      fuelType: "novehicle",
      vehicleSize: "car",
      passengers: 1,
      mileage: 0, // km (Canada) or miles (USA); converted at calculation time
    };
    if (isFirstChoice(qData.q1)) {
      vehicle.fuelType = choiceFromTable(qData.q2, OPTIONS.fuelType);
      vehicle.vehicleSize = choiceFromTable(qData.q3, OPTIONS.carSize);
      vehicle.passengers = atLeastOne(qData.q6);
      vehicle.mileage = parseIntOrZero(isCanada ? qData.q4 : qData.q5);
    }

    // -- Diet --
    const diet = { dietType: choiceFromTable(qData.q32, OPTIONS.diet) };

    return { countryName, mileageType, region, flight, heating, vehicle, diet };
  }

  /* =========================================================================
   * 7. EMISSION CALCULATIONS  [P4: state in, tonnes CO2e out — no globals]
   * ========================================================================= */

  // Flight = sum(count x per-flight factor), +3 t if the "additional flight"
  // toggle is on, forced to 0 if the "no flight" toggle is on.
  function calculateFlightEmissions(state) {
    const flight = state.flight;
    const numShort = flight.short.personal + flight.short.business;
    const numMedium = flight.medium.personal + flight.medium.business;
    const numLong = flight.long.personal + flight.long.business;

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

  // Heating = m2 x building-standard intensity x (fuel factor / efficiency)
  //           / 1000 [-> tonnes] / household size [per person]
  function calculateHeatingEmissions(state) {
    const heating = state.heating;
    const region = state.region;

    // electricity-based heating depends on the regional grid
    const factor =
      heating.heatingType === "hydro" || heating.heatingType === "heatpump"
        ? HEATING_FACTOR[heating.heatingType][region]
        : HEATING_FACTOR[heating.heatingType];

    const houseSizeSqm = heating.houseSize / SQFT_PER_SQM; // survey uses ft2

    const tonnes =
      ((houseSizeSqm *
        BUILDING_STANDARD_BY_REGION[region][heating.buildingStandard] * // [Q2]
        (factor / HEATING_EFFICIENCY[heating.heatingEfficiency])) /
        KG_PER_TONNE) /
      heating.householdSize;

    return Number(tonnes.toFixed(1));
  }

  // Vehicle = (kg/km factor / 1000) x annual km / passengers
  function calculateVehicleEmissions(state) {
    const vehicle = state.vehicle;

    let mileageKm = vehicle.mileage;
    if (state.mileageType === "MILES") {
      mileageKm = mileageKm * KM_PER_MILE; // US answers are miles -> convert
    }

    // Unknown fuel ("novehicle", "PHEV" [Q1]) falls back to zero factors.
    const regionFactors = VEHICLE_FACTOR_BY_REGION[state.region];
    const fuelFactors =
      regionFactors[vehicle.fuelType] || { car: 0, truck: 0, suv: 0 };
    const tonnesPerKm = fuelFactors[vehicle.vehicleSize] / KG_PER_TONNE;

    // [Q3] PRESERVED QUIRK: the original wrote
    //   (factor * mileage) / passengerSize.toFixed(1)
    // — .toFixed(1) rounds the DIVISOR (a no-op for whole passengers), not
    // the result. So unlike the other components, this value is unrounded.
    return Number((tonnesPerKm * mileageKm) / vehicle.passengers);
  }

  // Diet = direct per-person annual factor
  function calculateDietEmissions(state) {
    return Number(DIET_FACTOR_TONNES[state.diet.dietType].toFixed(1));
  }

  // All four components plus their sum, in one pass. [P4: the original's
  // calculateTotalEmissions wrote four globals as a side effect; this
  // returns a plain object instead.]
  function computeEmissions(state) {
    const flight = calculateFlightEmissions(state);
    const heating = calculateHeatingEmissions(state);
    const vehicle = calculateVehicleEmissions(state);
    const diet = calculateDietEmissions(state);
    const total = parseFloat((flight + heating + vehicle + diet).toFixed(1));
    console.log(
      "*********G_FlightChartValue, G_HouseChartValue, G_MobilityChartValue, G_DietChartValue, G_TotalEmissionsChartValue: ",
      flight,
      heating,
      vehicle,
      diet,
      total
    );
    console.log("*********G_SurveySettings: ", state);
    return { flight, heating, vehicle, diet, total };
  }

  // Fix the y-axis high enough that toggling "+1 long-haul flight" never
  // clips the chart — bars stay visually comparable across what-if scenarios.
  function calculateYAxisMax(state) {
    const counterfactualTotal =
      calculateFlightEmissions(state) +
      calculateHeatingEmissions(state) +
      calculateVehicleEmissions(state) +
      calculateDietEmissions(state) +
      ADDITIONAL_FLIGHT_TONNES;
    return Math.ceil(counterfactualTotal + Y_AXIS_HEADROOM_TONNES);
  }

  /* =========================================================================
   * 8. CHART RENDERING  [P5, P6]
   * -------------------------------------------------------------------------
   * Chart.js v2 syntax (xAxes/yAxes arrays, options.title) — requires
   * Chart.js 2.x. A "stacked bar across three columns" is faked with six
   * datasets: the four emission components carry data only in column 0, the
   * global average only in column 1, the 2030 target only in column 2.
   * ========================================================================= */

  // [P6] Dataset positions, named once. The original hard-coded these indices
  // inside each event listener (datasets[2] = flight, etc.) — reorder the
  // datasets there and the toggles silently update the wrong bars.
  const DATASET = { DIET: 0, VEHICLE: 1, FLIGHT: 2, HEATING: 3 };

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
   * ========================================================================= */

  // Check the radio matching the respondent's real situation, so the what-if
  // toggles start from reality. Note the deliberate collapsing: petrol and
  // diesel both display as "petrol"; unrecognized heating defaults to "oil".
  function setInitialToggles(state) {
    $("input:radio[name=flightToggle]").val([
      state.flight.flownStatus ? "currentflight" : "noflight",
    ]);

    const knownHeating = ["oil", "hydro", "gas", "wood", "heatpump"];
    $("input:radio[name=heatingToggle]").val([
      knownHeating.includes(state.heating.heatingType)
        ? state.heating.heatingType
        : "oil",
    ]);

    $("input:radio[name=vehicleToggle]").val([
      state.vehicle.fuelType === "diesel" ? "petrol" : state.vehicle.fuelType,
    ]);

    $("input:radio[name=dietToggle]").val([state.diet.dietType]);
  }

  // Recompute everything and redraw. The original repeated this block in all
  // four listeners, each poking only its own hard-coded dataset index; since
  // a toggle never changes the OTHER components' values, updating all four
  // is equivalent — and survives dataset reordering. [P3]
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
    const toggleActions = {
      // The flight toggle is the study's intervention lever: three states
      // instead of a simple category swap.
      flightToggle: function (value) {
        state.flight.additional = value === "additionalflight";
        state.flight.noFlight = value === "noflight";
      },
      // [Q4] heatingType only — heatingEfficiency intentionally untouched,
      // matching the original.
      heatingToggle: function (value) {
        state.heating.heatingType = value;
      },
      vehicleToggle: function (value) {
        state.vehicle.fuelType = value;
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
   * 10. MAIN  [P5: the whole program in five readable lines]
   * ========================================================================= */
  const state = buildSurveyState(qData);
  const emissions = computeEmissions(state);
  const yAxisMax = calculateYAxisMax(state);
  const chart = createChart(emissions, yAxisMax);
  setInitialToggles(state);
  wireToggles(chart, state, yAxisMax);
});
