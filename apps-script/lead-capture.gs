// Google Apps Script — CrunchyChadPad Lead Capture
// Writes to the "WEBSITE TRACKER" spreadsheet and emails Moriyah on each submission.
//
// SETUP INSTRUCTIONS (one-time):
//  1. Go to https://script.google.com and click "New project"
//  2. Delete any existing code and paste this entire file
//  3. Click Save (floppy disk icon), name it "CrunchyChadPad Lead Capture"
//  4. Click Deploy → New deployment
//     - Type: Web App
//     - Execute as: Me (zundlefire@gmail.com)
//     - Who has access: Anyone
//  5. Click Deploy → Authorize access → Allow
//  6. Copy the Web App URL — it looks like:
//     https://script.google.com/macros/s/ABC.../exec
//  7. In script.js, replace 'YOUR_APPS_SCRIPT_URL_HERE' with that URL
//  8. Commit and push to GitHub
//
// IMPORTANT: After editing this script you must Deploy → New deployment
//            (not "Manage existing") and update the URL in script.js.

var SPREADSHEET_ID = '1E6whZ2iGbZsWw6nch67CJZJ9HBwV6tAP3vQi1MTERoU';
var SHEET_GID      = 2005197912;
var NOTIFY_EMAIL   = 'zundlefire@gmail.com';

// Column layout:
// A: Date | B: Lead Name | C: Phone Number | D: Email | E: Lead Source | F: Next Step
var HEADERS = ['Date', 'Lead Name', 'Phone Number', 'Email', 'Lead Source', 'Next Step'];

function getLeadSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === SHEET_GID) return sheets[i];
  }
  return ss.getSheets()[0];
}

function ensureHeaders(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var hasHeaders = firstRow[0] === HEADERS[0];
  if (!hasHeaders) {
    sheet.insertRowBefore(1);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#3c2726');
    headerRange.setFontColor('#f6f0d7');
  }
}

function doPost(e) {
  try {
    var sheet = getLeadSheet();
    ensureHeaders(sheet);

    var name  = e.parameter.name  || '';
    var email = e.parameter.email || '';
    var phone = e.parameter.phone || '';
    var date  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy');

    sheet.appendRow([date, name, phone, email, 'Website Form', 'Follow Up']);

    // Sort all data rows (skip header) by date descending so newest is at top
    var lastRow = sheet.getLastRow();
    if (lastRow > 2) {
      sheet.getRange(2, 1, lastRow - 1, HEADERS.length)
           .sort({ column: 1, ascending: false });
    }

    MailApp.sendEmail({
      to:       NOTIFY_EMAIL,
      subject:  '🎁 New Knoxville Lead — ' + name,
      htmlBody: '<h2 style="font-family:sans-serif">New lead from CrunchyChadPad</h2>'
              + '<table style="font-family:sans-serif;border-collapse:collapse">'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Name</td><td style="padding:6px 12px">'   + name  + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Phone</td><td style="padding:6px 12px">'  + phone + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">'  + (email || 'Not provided') + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Date</td><td style="padding:6px 12px">'   + date  + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Source</td><td style="padding:6px 12px">Website Form</td></tr>'
              + '</table>'
    });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('CrunchyChadPad lead form is live.');
}
