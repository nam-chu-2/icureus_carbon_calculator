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
    // Car Access: {Yes: 1, No: 2}
    q1: "${q://QID123/SelectedChoicesRecode}", 
    // Type of car: {Car: 0, suv: 1, truck: 2}
    q2: "${q://QID2/SelectedChoicesRecode}",
    // 
    q3: "${q://QID3/SelectedChoicesRecode}",

}
})
