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

Qualtrics.SurveyEngine.addOnLoad(function(){
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
    q36: "${q://QID26/SelectedChoicesRecode}", // Main type of heating {Oil: 1, Gas: 2, Electric: 3, Heat pump: 4, Wood: 6, I don't know: 7}
    q37: "${q://QID262/SelectedChoicesRecode}", // What is your country: {Canada: 1, USA: 2}
    q38: "${q://QID1720071882/SelectedChoicesRecode}", // Which province? {Ontario: 1, Quebec: 2, Alberta: 3, British Columbia: 4}
    q39: "${q://QID1720071883/SelectedChoicesRecode}", // Which state? {Washington: 1, Colorado: 2, Michigan: 3, New York: 4}
}; console.log(qData)
// Constants

// Chart Benchmarks (tonnes C02e per person per year)
const GLOBAL_AVERAGE_TONNES = 3.8;
const SUSTAINABLE_TARGET_TONNES = 2.5;
const ADDITIONAL_FLIGHT_TONNES = 3.0;

const SQFT_PER_SQM = 10.7639; 
const KM_PER_MILE = 1.60934;
const KG_PER_TONNE = 1000;

const Y_AXIS_HEADROOM_TONNES = 0.5;
})

const FLIGHT_FACTOR_TONNES = {
    short: 0.181154,
    medium: 0.746467,
    long: 2.9911917,
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

const BUILDING_STANDARD_QC = {old: 0.62, mid: 0.55, new: 0.52, blank: 0.56};

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


