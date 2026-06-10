Qualtrics.SurveyEngine.addOnReady(function () {
  console.log(" =-= GHG Chart script started =-=");


  /*
   * -----------------------------------------
   * Survey answers from piped text
   * -----------------------------------------
   */
  let qData = {
    q1: "${q://QID123/SelectedChoicesRecode}", // Do you have access to a car?
    q2: "${q://QID2/SelectedChoicesRecode}", // What type of car do you drive?
    q3: "${q://QID3/SelectedChoicesRecode}", // What size is your car?
    q4: "${q://QID4/ChoiceNumericEntryValue/1}", // How many KILOMETERS do you drive per year?
    q5: "${q://QID5/SelectedChoicesRecode}", // Public transport usage
    q6: "${q://QID201/ChoiceTextEntryValue}", // How many kilometers do you drive per year by public transport?
    q7: "${q://QID10/SelectedChoicesRecode}", // Do you expect to fly in 2025?
    q8: "${q://QID12/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (ONTARIO)
    q9: "${q://QID13/ChoiceTextEntryValue}", // How many medium-haul flights do you expect to take in 2025? (CANADA)
    q10: "${q://QID14/ChoiceTextEntryValue}", // How many long-haul flights do you expect to take in 2025? (CANADA)
    q11: "${q://QID21/SelectedChoicesRecode}", // What is your diet?
    q12: "${q://QID35/SelectedChoicesRecode}", // Type of residence
    q13: "${q://QID23/SelectedChoicesRecode}", // What is the building standard of your residence?
    q14: "${q://QID24/SelectedChoicesRecode}", // How many people live in your household?
    q15: "${q://QID25/ChoiceTextEntryValue}", // What is the size of your house in square meters?
    q16: "${q://QID26/SelectedChoicesRecode}", // What type of heating do you use?
    q17: "${q://QID262/SelectedChoicesRecode}", // Which Country?
    q18: "${q://QID1720071882/SelectedChoicesRecode}", // Which CANADA Province?
    q19: "${q://QID1720071883/SelectedChoicesRecode}", // Which USA Province?
    q20: "${q://QID302/ChoiceNumericEntryValue/1}", // How many MILES do you drive per year? (USA only)
    q21: "${q://QID273/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (QUEBEC)
    q22: "${q://QID276/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (ALBERTA)
    q23: "${q://QID278/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (BC)
    q24: "${q://QID280/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (NEW YORK)
    q25: "${q://QID282/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (MICHIGAN)
    q26: "${q://QID284/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (MONTANA)
    q27: "${q://QID286/ChoiceTextEntryValue}", // How many short-haul flights do you expect to take in 2025? (WASHINGTON)
    q28: "${q://QID288/ChoiceTextEntryValue}", // How many medium-haul flights do you expect to take in 2025? (USA)
    q29: "${q://QID290/ChoiceTextEntryValue}", // How many long-haul flights do you expect to take in 2025? (USA)
    q30: "${q://QID343/ChoiceTextEntryValue}", // how many people do you drive with?
  };
  console.log(qData)
  /*
   * -----------------------------------------
   * Init Global Variables
   * -----------------------------------------
   */
  let G_ChartObj;
  let G_GlobalAverage = 6.5;
  let G_SustainableTarget = 2.5;
  let G_SurveySettings = {
    flight: {
      short: {
        personal: 0,
        business: 0,
      },
      medium: {
        personal: 0,
        business: 0,
      },
      long: {
        personal: 0,
        business: 0,
      },
      flownStatus: false,
      additional: false,
      noFlight: false,
    },
    heating: {
      houseSize: 0,
      buildingStandard: "new",
      heatingType: "gas",
      heatingEfficiency: "gas",
      householdSize: 1,
    },
    vehicle: {
      fuelType: "novehicle",
      vehicleSize: "car",
      passengers: 1,
      mileage: 0,
    },
    diet: {
      dietType: "omnivore",
    },
  };
  let G_FlightChartValue = 1;
  let G_HouseChartValue = 1;
  let G_MobilityChartValue = 1;
  let G_DietChartValue = 1;
  let G_TotalEmissionsChartValue = 1;
  let G_CountryName = "CANADA";
  let G_GetProvince = "ON";
  let G_MileageType = "KM";

  /*
   * -----------------------------------------
   * Parser Functions
   * -----------------------------------------
   */
  function parseIntOrZero(answer) {
    let parsed = parseInt(answer);
    return isNaN(parsed) ? 0 : parsed;
  }


  /**
   * Taking the string from Qualtrics, returns an array containing the indices of all selected answers (or an int if only 1 answer).
   * The function only works with at most 10 options.
   * @param {str} answer : The string returned by default qualtrics option. '${q://QIDx/SelectedChoicesRecode}'
   * @param {boolean} (optional, default false) forceReturnArray : If true, always returns an array (even if only 1 element)
   * @returns {array<int> or int} : array if more than one option selected
   */
  function extractSelectedChoices(answer, forceReturnArray = false) {
    let NO_ANSWER = 0;
    var indices = [];
    if (answer == "") {
      indices.push(NO_ANSWER);
    } else {
      while (answer.includes(",")) {
        // read number
        indices.push(parseInt(answer.charAt(0)));
        // delete the read number and ", "
        answer = answer.substring(3);
      }
      // last one
      indices.push(parseInt(answer.charAt(0)));
    }

    if (indices.length == 1 && !forceReturnArray) {
      return indices[0];
    } else {
      return indices;
    }
  }

  function getFlownStatus(val) {
    // string with selected values (1,2)
    return extractSelectedChoices(val) == 1;
  }

  function getHouseSize(val) {
    let size = parseIntOrZero(val);
    return size < 1 ? 1 : size;
  }

  function getHouseHoldSize(val) {
    // 1-based index (1,2,3,4,5,6,7,8,9,10)
    let size = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let choice = extractSelectedChoices(val);
    return size[choice];
  }

  function getBuildingStandard(val) {
    // 1-based index (1,2,3,4)
    let standard = ["", "old", "mid", "new"];
    let choice = extractSelectedChoices(val);
    return standard[choice];
  }

  function getHeatingType(val) {
    // 1-based index (1,2,3,4,5,6,7)
    let heating = ["", "oil", "gas", "hydro", "heatpump", "wood", "unknown"];
    let choice = extractSelectedChoices(val);
    return heating[choice];
  }

  function getCarAccess(val) {
    // string with selected values (1,2)
    return extractSelectedChoices(val) == 1;
  }

  function getCarPassenger(val){
    let size = parseIntOrZero(val);
    return size < 1 ? 1 : size;
  }

  function getFuelType(val) {
    // 1-based index (1,2,3,4,5)
    let fuels = ["", "petrol", "diesel", "battery", "hybrid", "PHEV"];
    let choice = extractSelectedChoices(val);
    return fuels[choice];
  }


  // Changing this to car, suv, and truck
  function getCarSize(val) {
    // 1-based index (1,2,3,4)
    let size = ["", "car", "suv", "truck"];
    let choice = extractSelectedChoices(val);
    return size[choice];
  }


  function getDiet(val) {
    // 1-based index (1,2,3,4)
    let diet = ["", "omnivore", "flexitarian", "vegetarian", "vegan"];
    let choice = extractSelectedChoices(val);
    return diet[choice];
  }


  function checkCountryCanada(val) {
    // string with selected values (1,2)
    return extractSelectedChoices(val) == 1;
  }


  function getCanadaProvince(val) {
    // 1-based index (1,2,3,4)
    let size = ["", "ON", "QC", "AB", "BC"];
    let choice = extractSelectedChoices(val);
    return size[choice];
  }


  function getUSAProvince(val) {
    // 1-based index (1,2,3,4)
    let size = ["", "WA", "MT", "MI", "NY"];
    let choice = extractSelectedChoices(val);
    return size[choice];
  }


  /*
   * -----------------------------------------
   * Configure Weights of Entity Types
   * -----------------------------------------
   */
  // FLIGHT
  const flightTypeWeights = {
    short: 0.181154,
    medium: 0.746467,
    long: 2.991917,
    default: 0,
  };


  // HEATING
  const heatingTypeWeights = {
    oil: 70.271,
    gas: 50.149,
    hydro: {
      BC: 4.167,
      AB: 136.111,
      ON: 10.556, 
      QC: 0.472,
      WA: 36.791,
      MT: 142.000,
      MI: 114.910,
      NY: 65.771
    },
    // hydro (should be labeled electric) varies by province: 
    // BC	AB	ON	QC	WA	MT	MI	NY
    // 4.167	136.111	10.556	0.472	36.791	142.000	114.910	65.771
    heatpump: {
      BC: 4.167,
      AB: 136.111,
      ON: 10.556, 
      QC: 0.472,
      WA: 36.791,
      MT: 142.000,
      MI: 114.910,
      NY: 65.771
    },
    wood: 0.001,
    unknown: 50.149,
    "": 50.149,
  };
  const heatingEfficiencyWeight = {
    oil: 0.81,
    gas: 0.8725,
    hydro: 1.0,
    heatpump: 2.74,
    wood: 0.78,
    unknown: 0.9,
    "": 0.9,
  };


/* VH: we need to update buildingStandardWeight with province and state-specific weights, also allow for blank responses, as follows:
	    QC	(ON/NY/MI/MT)	AB	(BC/WA)
old:	  0.62	0.62	0.76	0.57
mid:	  0.55	0.54	0.74	0.53
new:	  0.52	0.46	0.61	0.49
blank:  0.56	0.54	0.70	0.58
*/
  const buildingStandardWeight = {
    QC: {
      old: 0.62,
      mid: 0.55,
      new: 0.52,
      "": 0.56
    },
    ON: {
      old: 0.62,
      mid: 0.54,
      new: 0.46,
      blank: 0.54
    },
    NY: {
      old: 0.62,
      mid: 0.54,
      new: 0.46,
      blank: 0.54
    },
    MI: {
      old: 0.62,
      mid: 0.54,
      new: 0.46,
      blank: 0.54
    },
    MT: {
      old: 0.62,
      mid: 0.54,
      new: 0.46,
      blank: 0.54
    },
    AB: {
      old: 0.76,
      mid: 0.74,
      new: 0.61,
      blank: 0.70
    },
    BC: {
      old: 0.57,
      mid: 0.53,
      new: 0.49,
      blank: 0.58
    },
    WA: {
      old: 0.57,
      mid: 0.53,
      new: 0.49,
      blank: 0.58
    }
  };

  // updated Feb 4, 2026
  const vehicleTypeWeights = {
  WA: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.128, car: 0.086, suv: 0.128 },
    battery: { truck: 0.081, car: 0.050, suv: 0.081 },
  },

  MT: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.128, car: 0.086, suv: 0.128 },
    battery: { truck: 0.081, car: 0.050, suv: 0.081 },
  },

  MI: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.144, car: 0.098, suv: 0.144 },
    battery: { truck: 0.124, car: 0.077, suv: 0.124 },
  },

  NY: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.122, car: 0.081, suv: 0.122 },
    battery: { truck: 0.064, car: 0.040, suv: 0.064 },
  },

  BC: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.122, car: 0.081, suv: 0.122 },
    battery: { truck: 0.065, car: 0.040, suv: 0.065 },
  },

  AB: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.128, car: 0.086, suv: 0.128 },
    battery: { truck: 0.080, car: 0.050, suv: 0.080 },
  },

  ON: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.122, car: 0.081, suv: 0.122 },
    battery: { truck: 0.065, car: 0.040, suv: 0.065 },
  },

  QC: {
    petrol:  { truck: 0.315, car: 0.215, suv: 0.315 },
    diesel:  { truck: 0.266, car: 0.181, suv: 0.266 },
    hybrid:  { truck: 0.219, car: 0.144, suv: 0.219 },
    phev:    { truck: 0.122, car: 0.081, suv: 0.122 },
    battery: { truck: 0.064, car: 0.040, suv: 0.064 },
  },
};

  // DIET
  // VH: I have revised these, assuming "" means they didn't answer the question I am setting this to the value for omnivore.
  const dietTypeWeights = {
    omnivore: 1.6279,
    flexitarian: 1.23735,
    vegetarian: 0.8468,
    vegan: 0.5037,
    "": 1.6279,
  };

  /*
   * -----------------------------------------
   * Define Calculation Functions
   * -----------------------------------------
   */
  function calculateFlightEmissions() {
    let flightEmissionValue = 0;


    const numShortFlights =
      G_SurveySettings.flight.short.personal +
      G_SurveySettings.flight.short.business;
    const numMediumFlights =
      G_SurveySettings.flight.medium.personal +
      G_SurveySettings.flight.medium.business;
    const numLongFlights =
      G_SurveySettings.flight.long.personal +
      G_SurveySettings.flight.long.business;


    flightEmissionValue =
      numShortFlights * flightTypeWeights.short +
      numMediumFlights * flightTypeWeights.medium +
      numLongFlights * flightTypeWeights.long;


    if (G_SurveySettings.flight.additional) {
      flightEmissionValue += 3;
    }


    if (G_SurveySettings.flight.noFlight === true) {
      flightEmissionValue = 0;
    }


    return Number(flightEmissionValue.toFixed(1));
  }


   function calculateHeatingEmissions() {
    let heatingEmissionValue = 0;


    // retrieves the province or state
    const region = G_GetProvince;


    // gets the house size
    const houseSize = G_SurveySettings.heating.houseSize;


    // gets the building standard (old, new, newish)
    const buildingStandard = G_SurveySettings.heating.buildingStandard;
    
    // gets the heating type (heat pump, hydro etc.)
    const heatingType = G_SurveySettings.heating.heatingType;


    // gets the heating efficiency 
    const heatingEfficiency = G_SurveySettings.heating.heatingEfficiency;


    // gets household size (1 - 10+)
    const householdSize = G_SurveySettings.heating.householdSize;


    let heatingFactor = 0;


    if (heatingType === "hydro" || heatingType === "heatpump"){
      heatingFactor = heatingTypeWeights[heatingType][region];
    } else{
      heatingFactor = heatingTypeWeights[heatingType]
    }


    heatingEmissionValue =
    // VH: we get feet squared from survey, need to convert to meters squared (divide value by 10.7639)
      ((houseSize/10.7639) *
        buildingStandardWeight[region][buildingStandard] *
        (heatingFactor /
          heatingEfficiencyWeight[heatingEfficiency]) / 1000) /
      householdSize;
      
    return Number(heatingEmissionValue.toFixed(1));
  }


  function calculateVehicleEmissions() {
    const fuelType = G_SurveySettings.vehicle.fuelType; // go into survey settings object and retrieve the fuel type from the vehicle
    const vehicleSize = G_SurveySettings.vehicle.vehicleSize; // get the vehicle size (car, suv/truck)
    let mileage = G_SurveySettings.vehicle.mileage; // retrieves the mileage
    const passengerSize = G_SurveySettings.vehicle.passengers; // retrieves the number of passengers


    // If the global variable is "MILES", convert mileage to miles. 
    if (G_MileageType === "MILES") { 
      mileage = mileage * 1.60934; 
    }

    const region = G_GetProvince; // initializes region to the state / province


    /* initializes regionWeights with the associated weights
    ! Eg: region = AB, vehicleTypeWeights[AB] == {petrol: {car: 0..., truck: ...}}
    */
    const regionWeights = vehicleTypeWeights[region]; 


    /* initializes fuelWeights with the associated fuel weights. Otherwise set car, truck, and suv to 0. 
    ! Eg: region = AB, regionWeights[petrol] == {car: 0..., truck: ..., sub: ...}
    */
    const fuelWeights = regionWeights[fuelType] || {car: 0, truck: 0, suv: 0}; 
    
    /* initializes fuelWeights with the associated fuel weights. Otherwise set car and truck to 0. 
    ! Eg: region = AB, regionWeights[petrol] == {car: 0..., truck: ...}
    */
    const factor = fuelWeights[vehicleSize] / 1000;
   
    return Number((factor * mileage)/passengerSize.toFixed(1));
  }


  function calculateDietEmissions() {
    let dietEmissionValue = 0;
    dietEmissionValue = dietTypeWeights[G_SurveySettings.diet.dietType];
    return Number(dietEmissionValue.toFixed(1));
  }


  function calculateTotalEmissions() {
    G_FlightChartValue = calculateFlightEmissions();
    G_HouseChartValue = calculateHeatingEmissions();
    G_MobilityChartValue = calculateVehicleEmissions();
    G_DietChartValue = calculateDietEmissions();
    let tmp =
      G_FlightChartValue +
      G_HouseChartValue +
      G_MobilityChartValue +
      G_DietChartValue;
    tmp = parseFloat(tmp.toFixed(1));
    console.log(
      "*********G_FlightChartValue, G_HouseChartValue, G_MobilityChartValue, G_DietChartValue, G_TotalEmissionsChartValue: ",
      G_FlightChartValue,
      G_HouseChartValue,
      G_MobilityChartValue,
      G_DietChartValue,
      tmp
    );
    console.log("*********G_SurveySettings: ", G_SurveySettings);
    return tmp;
  }


  /*
   * -----------------------------------------
   * Populate Survey Results in Variables
   * -----------------------------------------
   */


  // ** COUNTRY **
  if (checkCountryCanada(qData.q17)) {
    G_MileageType = "KM";
    G_CountryName = "CANADA";
  } else {
    G_MileageType = "MILES";
    G_CountryName = "USA";
  }


  // ** PROVINCE **
  if (G_CountryName === "CANADA") {
    G_GetProvince = getCanadaProvince(qData.q18);
  } else {
    G_GetProvince = getUSAProvince(qData.q19);
  }


  // ** FLIGHT **
  if (getFlownStatus(qData.q7)) {
    if (G_CountryName === "CANADA") {
      if (G_GetProvince === "ON") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q8);
      } else if (G_GetProvince === "QC") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q21);
      } else if (G_GetProvince === "AB") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q22);
      } else if (G_GetProvince === "BC") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q23);
      } else {
        G_SurveySettings.flight.short.personal = 0;
      }
      G_SurveySettings.flight.medium.personal = parseIntOrZero(qData.q9);
      G_SurveySettings.flight.long.personal = parseIntOrZero(qData.q10);
    } else {
      if (G_GetProvince === "NY") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q24);
      } else if (G_GetProvince === "MI") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q25);
      } else if (G_GetProvince === "MT") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q26);
      } else if (G_GetProvince === "WA") {
        G_SurveySettings.flight.short.personal = parseIntOrZero(qData.q27);
      } else {
        G_SurveySettings.flight.short.personal = 0;
      }
      G_SurveySettings.flight.medium.personal = parseIntOrZero(qData.q28);
      G_SurveySettings.flight.long.personal = parseIntOrZero(qData.q29);
    }
    G_SurveySettings.flight.short.business = 0;
    G_SurveySettings.flight.medium.business = 0;
    G_SurveySettings.flight.long.business = 0;
    G_SurveySettings.flight.flownStatus = true;
    G_SurveySettings.flight.additional = false;
  } else {
    G_SurveySettings.flight.short.personal = 0;
    G_SurveySettings.flight.medium.personal = 0;
    G_SurveySettings.flight.long.personal = 0;
    G_SurveySettings.flight.short.business = 0;
    G_SurveySettings.flight.medium.business = 0;
    G_SurveySettings.flight.long.business = 0;
    G_SurveySettings.flight.flownStatus = false;
    G_SurveySettings.flight.additional = false;
  }


  // ** HOUSE **
  G_SurveySettings.heating.houseSize = getHouseSize(qData.q15);
  G_SurveySettings.heating.householdSize = getHouseHoldSize(qData.q14);
  G_SurveySettings.heating.buildingStandard = getBuildingStandard(qData.q13);
  G_SurveySettings.heating.heatingType = getHeatingType(qData.q16);
  G_SurveySettings.heating.heatingEfficiency = getHeatingType(qData.q16);


  // ** CAR **
  if (getCarAccess(qData.q1)) {
    G_SurveySettings.vehicle.fuelType = getFuelType(qData.q2);
    G_SurveySettings.vehicle.vehicleSize = getCarSize(qData.q3);
    G_SurveySettings.vehicle.passengers = getCarPassenger(qData.q30);
    if (G_MileageType === "KM") {
      G_SurveySettings.vehicle.mileage = parseIntOrZero(qData.q4);
    } else {
      G_SurveySettings.vehicle.mileage = parseIntOrZero(qData.q20);
    }
  } else {
    G_SurveySettings.vehicle.fuelType = "novehicle";
    G_SurveySettings.vehicle.mileage = 0;
  }


  // ** DIET **
  G_SurveySettings.diet.dietType = getDiet(qData.q11);

function calculateYAxisMaxCounterfactual() {
  // Calculate the y-axis max without mutating any globals.
  // Simply take the current total and add one extra long-haul flight (3t) + headroom.
  const currentTotal =
    calculateFlightEmissions() +
    calculateHeatingEmissions() +
    calculateVehicleEmissions() +
    calculateDietEmissions();
  const counterfactualTotal = currentTotal + 3.0;
  return Math.ceil(counterfactualTotal + 0.5);
}
  /*
   * -----------------------------------------
   * Chart
   * -----------------------------------------
   */
  G_TotalEmissionsChartValue = calculateTotalEmissions();
  const G_ChartYMax = calculateYAxisMaxCounterfactual();


  const ctx = document.getElementById("myChart").getContext("2d");
  G_ChartObj = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Your Emissions", "Global Average", "2030 Target"],
      datasets: [
        {
          label: "Diet",
          data: [G_DietChartValue, 0, 0],
          backgroundColor: "rgba(217,155,253,0.8)",
        },
        {
          label: "Ground Transport",
          data: [G_MobilityChartValue, 0, 0],
          backgroundColor: "rgba(158,195,255,0.8)",
        },
        {
          label: "Flight",
          data: [G_FlightChartValue, 0, 0],
          backgroundColor: "rgba(255,205,86,0.8)",
        },
        {
          label: "Home Heating",
          data: [G_HouseChartValue, 0, 0],
          backgroundColor: "rgba(112,128,144,0.8)",
        },
        {
          label: "Global Average",
          data: [0, G_GlobalAverage, 0],
          backgroundColor: "#4caf50",
        },
        {
          label: "2030 Target",
          data: [0, 0, G_SustainableTarget],
          backgroundColor: "#8bc34a",
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
              max: G_ChartYMax,
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
        onClick: function () {},
        labels: { fontColor: "#333" },
      },
     title: {
       display: true,
       text: "Your Emissions:  " + G_TotalEmissionsChartValue + " t CO₂e/year",
       padding: 30,
       fontSize: 24,
       fontFamily: "Arial",
       fontColor: "#333",
       fontStyle: "bold",
     },
    },
  });


  /*
   * -----------------------------------------
   * JQuery Set Radio Button
   * -----------------------------------------
   */


  // Flight Radio Button
  if (G_SurveySettings.flight.flownStatus) {
    $("input:radio[name=flightToggle]").val(["currentflight"]);
  } else {
    $("input:radio[name=flightToggle]").val(["noflight"]);
  }


  // Heating Radio Button
  if (
    G_SurveySettings.heating.heatingType === "oil" ||
    G_SurveySettings.heating.heatingType === "hydro" ||
    G_SurveySettings.heating.heatingType === "gas" ||
    G_SurveySettings.heating.heatingType === "wood" ||
    G_SurveySettings.heating.heatingType === "heatpump"
  ) {
    $("input:radio[name=heatingToggle]").val([
      G_SurveySettings.heating.heatingType,
    ]);
  } else {
    $("input:radio[name=heatingToggle]").val(["oil"]);
  }
  // Vehicle Radio Button
  if (
    G_SurveySettings.vehicle.fuelType === "petrol" ||
    G_SurveySettings.vehicle.fuelType === "diesel"
  ) {
    $("input:radio[name=vehicleToggle]").val(["petrol"]);
  } else {
    $("input:radio[name=vehicleToggle]").val([
      G_SurveySettings.vehicle.fuelType,
    ]);
  }

  // Diet Radio Button
  $("input:radio[name=dietToggle]").val([G_SurveySettings.diet.dietType]);

  /*
   * -----------------------------------------
   * JQuery Event Listeners
   * -----------------------------------------
   */
  // JQuery Radio Listener: For the Flight toggle
  $("input[type=radio][name=flightToggle]").on("change", function () {
    switch ($(this).val()) {
      case "currentflight":
        G_SurveySettings.flight.additional = false;
        G_SurveySettings.flight.noFlight = false;
        break;
      case "additionalflight":
        G_SurveySettings.flight.additional = true;
        G_SurveySettings.flight.noFlight = false;
        break;
      case "noflight":
        G_SurveySettings.flight.additional = false;
        G_SurveySettings.flight.noFlight = true;
        break;
    }
    G_FlightChartValue = calculateFlightEmissions();
    G_TotalEmissionsChartValue = calculateTotalEmissions();
    G_ChartObj.data.datasets[2].data[0] = G_FlightChartValue;
    G_ChartObj.options.title.text =
      "Your Emissions: " + G_TotalEmissionsChartValue + " t CO₂e/year";
    G_ChartObj.options.scales.yAxes[0].ticks.max = G_ChartYMax;
    G_ChartObj.update();
  });


  // JQuery Radio Listener: For the Heating toggle
  $("input[type=radio][name=heatingToggle]").on("change", function () {
    switch ($(this).val()) {
      case "oil":
        G_SurveySettings.heating.heatingType = "oil";
        break;
      case "gas":
        G_SurveySettings.heating.heatingType = "gas";
        break;
      case "hydro":
        G_SurveySettings.heating.heatingType = "hydro";
        break;
      case "wood":
        G_SurveySettings.heating.heatingType = "wood";
        break;
      case "heatpump":
        G_SurveySettings.heating.heatingType = "heatpump";
        break;
    }
    G_HouseChartValue = calculateHeatingEmissions();
    G_TotalEmissionsChartValue = calculateTotalEmissions();
    G_ChartObj.data.datasets[3].data[0] = G_HouseChartValue;
    G_ChartObj.options.title.text =
      "Your Emissions: " + G_TotalEmissionsChartValue + " t CO₂e/year";
    G_ChartObj.options.scales.yAxes[0].ticks.max = G_ChartYMax;
    G_ChartObj.update();
  });


  // JQuery Radio Listener: For the Vehicle toggle
  $("input[type=radio][name=vehicleToggle]").on("change", function () {
    switch ($(this).val()) {
      case "petrol":
        G_SurveySettings.vehicle.fuelType = "petrol";
        break;
      case "diesel":
        G_SurveySettings.vehicle.fuelType = "diesel";
        break;
      case "hybrid":
        G_SurveySettings.vehicle.fuelType = "hybrid";
        break;
      case "battery":
        G_SurveySettings.vehicle.fuelType = "battery";
        break;
      case "novehicle":
        G_SurveySettings.vehicle.fuelType = "novehicle";
        break;
    }
    G_MobilityChartValue = calculateVehicleEmissions();
    G_TotalEmissionsChartValue = calculateTotalEmissions();
    G_ChartObj.data.datasets[1].data[0] = G_MobilityChartValue;
    G_ChartObj.options.title.text =
      "Your Emissions: " + G_TotalEmissionsChartValue + " t CO₂e/year";
    G_ChartObj.options.scales.yAxes[0].ticks.max = G_ChartYMax;
    G_ChartObj.update();
  });


  // JQuery Radio Listener: For the Diet toggle
  $("input[type=radio][name=dietToggle]").on("change", function () {
    switch ($(this).val()) {
      case "omnivore":
        G_SurveySettings.diet.dietType = "omnivore";
        break;
      case "flexitarian":
        G_SurveySettings.diet.dietType = "flexitarian";
        break;
      case "vegetarian":
        G_SurveySettings.diet.dietType = "vegetarian";
        break;
      case "vegan":
        G_SurveySettings.diet.dietType = "vegan";
        break;
    }
    G_DietChartValue = calculateDietEmissions();
    G_TotalEmissionsChartValue = calculateTotalEmissions();
    G_ChartObj.data.datasets[0].data[0] = G_DietChartValue;
    G_ChartObj.options.title.text =
      "Your Emissions: " + G_TotalEmissionsChartValue + " t CO₂e/year";
        G_ChartObj.options.scales.yAxes[0].ticks.max = G_ChartYMax;
    G_ChartObj.update();
  });
});
