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

}
})
