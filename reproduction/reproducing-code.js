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
    q6: "${q://QID343/ChoiceTextEntryValue}",// How many people do you drive with? (Numeric)
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
}; console.log(qData)
// Constants

// Chart Benchmarks (tonnes C02e per person per year)
const GLOBAL_AVERAGE_TONNES = 3.8;
const SUSTAINABLE_TARGET_TONNES = 2.5;
const ADDITIONAL_FLIGHT_TONNES = 3.0;

// Average annual driving distance (km) used by the Avg_Gas_CF counterfactual.
const AVG_GAS_CF_DISTANCE_KM = 17000;

const SQFT_PER_SQM = 10.7639;
const KM_PER_MILE = 1.60934;
const KG_PER_TONNE = 1000;

const Y_AXIS_HEADROOM_TONNES = 0.5;

const DIET_FACTOR_TONNES = {
    omnivore: 1.6279,
    flexitarian: 1.23735,
    vegetarian: 0.8468,
    vegan: 0.5037,
    "": 1.6279, // blank answer defaults to omnivore
};

const FLIGHT_FACTOR_TONNES = {
    short: 0.181154,
    medium: 0.746467,
    long: 2.991917,
    default: 0,
};

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

const HEATING_FACTOR = {
    oil: 70.271,
    gas: 50.149,
    hydro: GRID_INTENSITY,
    heatpump: GRID_INTENSITY,
    wood: 0.001,
    unknown: 50.149,
    "": 50.149,
};

const HEATING_EFFICIENCY = {
    oil: 0.81,
    gas: 0.8725,
    hydro: 1.0,
    heatpump: 2.74,
    wood: 0.78,
    unknown: 0.9,
    "": 0.9,
};

const BUILDING_STANDARD_QC = {old: 0.62, mid: 0.55, new: 0.52, "": 0.56}; // [Q2] QC keys blank as "" (others use "blank")
const BUILDING_STANDARD_ON = {old: 0.62, mid: 0.54, new: 0.46, blank: 0.54};
const BUILDING_STANDARD_AB = {old: 0.76, mid: 0.74, new: 0.61, blank: 0.70};
const BUILDING_STANDARD_BC = {old: 0.57, mid: 0.53, new: 0.49, blank: 0.58};

const BUILDING_STANDARD_BY_REGION = {
    QC: BUILDING_STANDARD_QC,
    ON: BUILDING_STANDARD_ON,
    AB: BUILDING_STANDARD_AB,
    BC: BUILDING_STANDARD_BC,
    WA: BUILDING_STANDARD_BC,
    MI: BUILDING_STANDARD_ON,
    CO: BUILDING_STANDARD_ON,
    NY: BUILDING_STANDARD_ON,
};

const COMBUSTION = {
    petrol : {car: 0.215, truck: 0.315, suv: 0.315}, 
    diesel : {car: 0.181, truck: 0.266, suv: 0.266},
    hybrid : {car: 0.144, truck: 0.219, suv: 0.219},
};

const VEHICLE_FACTOR_BY_REGION = {
    WA: {...COMBUSTION, 
        phev: {car: 0.086, truck: 0.128, suv: 0.128}, 
        battery: {car: 0.05, truck: 0.081, suv: 0.081}},
    CO: {...COMBUSTION, 
        phev: {car: 0.086, truck: 0.128, suv: 0.128},
        battery: {car: 0.05, truck: 0.081, suv: 0.081}},
    MI: {...COMBUSTION,
        phev: {car: 0.098, truck: 0.144, suv: 0.144},
        battery: {car: 0.077, truck: 0.124, suv: 0.124}},
    NY: {...COMBUSTION, 
        phev: {car: 0.081, truck: 0.122, suv: 0.122}, 
        battery: {car: 0.04, truck: 0.064, suv: 0.064}},
    BC: {...COMBUSTION, 
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.065, suv: 0.065}},
    AB: {...COMBUSTION,
        phev: {car: 0.086, truck: 0.128, suv: 0.128},
        battery: {car: 0.05, truck: 0.08, suv: 0.08}},
    ON: {...COMBUSTION,
        phev: {car: 0.081, truck: 0.122, suv: 0.122},
        battery: {car: 0.04, truck: 0.065, suv: 0.065}},
    QC: {...COMBUSTION, 
        phev: {car: 0.081, truck: 0.122, suv: 0.122}, 
        battery: {car: 0.04, truck: 0.064, suv: 0.064}},
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
    fuelType: ["", "petrol", "diesel", "hybrid", "phev", "battery"],
    carSize: ["", "car", "truck", "suv"],
    diet: ["", "omnivore", "flexitarian", "vegetarian", "vegan"],
    canadaProvince: ["", "ON", "QC", "AB", "BC"],
    usaState: ["", "WA", "CO", "MI", "NY"],
    householdSize: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // index 0 (blank) -> 1 person
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
        houseSize: atLeastOne(qData.q35),
        householdSize: choiceFromTable(qData.q34, OPTIONS.householdSize),
        buildingStandard: choiceFromTable(qData.q33, OPTIONS.buildingStandard),
        heatingType: choiceFromTable(qData.q36, OPTIONS.heatingType),
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

    const diet = {dietType: choiceFromTable(qData.q32, OPTIONS.diet)};

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

function calculateHeatingEmissions(state){
    const heating = state.heating;
    const region = state.region;

    const factor = 
        heating.heatingType === "hydro" || heating.heatingType === "heatpump"
            ? HEATING_FACTOR[heating.heatingType][region]
            : HEATING_FACTOR[heating.heatingType];
    
    const houseSizeSqm = heating.houseSize / SQFT_PER_SQM;

    const tonnes = 
        ((houseSizeSqm * BUILDING_STANDARD_BY_REGION[region][heating.buildingStandard] * 
        (factor / HEATING_EFFICIENCY[heating.heatingType])) / 
        KG_PER_TONNE) / 
        heating.householdSize;

    return Number(tonnes.toFixed(1));
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
    return Number(DIET_FACTOR_TONNES[state.diet.dietType].toFixed(1));
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
    return calculateHeatingEmissions(withPatch(state, "heating", { heatingType: "heatpump" }));
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
      // [Q4 FIXED] heatingType is the single source of truth; efficiency is
      // derived from it at calc time, so the counterfactual now uses the
      // toggled system's real efficiency/COP.
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