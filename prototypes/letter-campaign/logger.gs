/**
 * Letter-campaign event logger — Google Apps Script web app.
 *
 * Receives POSTs from index.html's logEvent() and appends one row per event
 * to the bound Google Sheet:  [server time, prolific ID, country, event, client time]
 *
 * The payload NEVER contains the respondent's name, postal/ZIP code, or
 * Qualtrics ResponseID — do not add columns for them.
 *
 * Deployment (~5 minutes):
 *   1. Create a new Google Sheet (this becomes the event log).
 *   2. Extensions → Apps Script → paste this file, save.
 *   3. Deploy → New deployment → type "Web app"
 *        - Execute as: Me
 *        - Who has access: Anyone        (required — respondents are anonymous)
 *   4. Copy the web-app URL (https://script.google.com/macros/s/…/exec)
 *      into LOG_ENDPOINT at the top of index.html.
 *
 * After editing this script, use Deploy → Manage deployments → Edit →
 * "New version" — otherwise the /exec URL keeps serving the old code.
 */

var SHEET_NAME = "events";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["server_time", "prolific_pid", "country", "event", "client_time"]);
    }
    sheet.appendRow([
      new Date(),
      String(data.pid || ""),
      String(data.country || ""),
      String(data.event || ""),
      String(data.ts || "")
    ]);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    // Never fail loudly — the client fires-and-forgets anyway.
    return ContentService.createTextOutput("error");
  }
}

/** Sanity check: visiting the /exec URL in a browser should show this. */
function doGet() {
  return ContentService.createTextOutput("letter-campaign logger is running");
}
