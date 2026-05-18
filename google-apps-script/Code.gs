/**
 * Miso & Dough — Google Apps Script Webhook
 *
 * Deploy this as a Web App (Execute as: Me, Who has access: Anyone)
 * and paste the deployment URL into your .env as VITE_GOOGLE_APPS_SCRIPT_URL
 *
 * Expected Google Sheet column order (Row 1 must be these exact headers):
 * OrderDate | Name | Phone | Email | <item columns...> | PickUpDate | Status | TotalCost | ActualPayment
 *
 * The item columns are inserted dynamically based on whatever items are in the
 * order. Run setupHeaders() once manually to create the header row.
 */

// Run this once manually from the Apps Script editor to create the header row.
// Update ITEM_NAMES to match your current menu items.
var ITEM_NAMES = [
  'Classic Sourdough Batard',
  'Cheddar Jalapeño Batard',
  'Cheddar Batard',
  'Sesame Focaccia',
  'Cinnamon Roll Focaccia Square w/ Cream Cheese Glaze',
];

function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var itemCols = ITEM_NAMES.map(function (name) { return name + ' (qty)'; });
  var headers = ['OrderDate', 'Name', 'Phone', 'Email']
    .concat(itemCols)
    .concat(['PickUpDate', 'Status', 'TotalCost', 'ActualPayment']);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Build a map of header → column index (1-based) from row 1
    var lastCol = sheet.getLastColumn();
    var headerRow = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : [];

    function colFor(header) {
      var idx = headerRow.indexOf(header);
      return idx >= 0 ? idx : -1; // 0-based index into row array
    }

    // Build the new row matching existing headers
    var rowData = new Array(headerRow.length).fill('');

    function set(header, value) {
      var idx = colFor(header);
      if (idx >= 0) rowData[idx] = value;
    }

    set('OrderDate',     data.orderDate || '');
    set('Name',          data.name || '');
    set('Phone',         data.phone || '');
    set('Email',         data.email || '');
    set('PickUpDate',    data.pickUpDate || '');
    set('Status',        data.status || 'In Progress');
    set('TotalCost',     data.totalCost || 0);
    set('ActualPayment', ''); // filled in manually

    // Fill in per-item quantities
    if (Array.isArray(data.items)) {
      data.items.forEach(function (item) {
        set(item.name + ' (qty)', item.qty || 0);
      });
    }

    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: GET endpoint for health check
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
