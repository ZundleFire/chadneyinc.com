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
// NOTE: Every time you edit this script you must Deploy → New deployment
//       (not "Manage existing") to get an updated URL that reflects changes.

var SPREADSHEET_ID = '1E6whZ2iGbZsWw6nch67CJZJ9HBwV6tAP3vQi1MTERoU';
var SHEET_GID      = 2005197912;
var NOTIFY_EMAIL   = 'zundlefire@gmail.com';

function getLeadSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === SHEET_GID) return sheets[i];
  }
  // Fallback: if gid somehow changes, use the first sheet
  return ss.getSheets()[0];
}

function doPost(e) {
  try {
    var sheet = getLeadSheet();

    // Write header row the very first time
    if (sheet.getLastRow() === 0) {
      var header = sheet.getRange(1, 1, 1, 4);
      header.setValues([['Timestamp', 'Name', 'Email', 'Phone']]);
      header.setFontWeight('bold');
    }

    var name  = e.parameter.name  || '';
    var email = e.parameter.email || '';
    var phone = e.parameter.phone || '';
    var ts    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([ts, name, email, phone]);

    MailApp.sendEmail({
      to:       NOTIFY_EMAIL,
      subject:  '🎁 New Knoxville Lead — ' + name,
      htmlBody: '<h2 style="font-family:sans-serif">New lead from CrunchyChadPad</h2>'
              + '<table style="font-family:sans-serif;border-collapse:collapse">'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Name</td><td style="padding:6px 12px">'  + name  + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">' + email + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Phone</td><td style="padding:6px 12px">' + (phone || 'Not provided') + '</td></tr>'
              + '<tr><td style="padding:6px 12px;font-weight:bold">Time</td><td style="padding:6px 12px">'  + ts    + '</td></tr>'
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

// Visit the Web App URL in a browser to confirm it's deployed correctly
function doGet() {
  return ContentService.createTextOutput('CrunchyChadPad lead form is live.');
}
