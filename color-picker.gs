const COLOR_COLUMN = 6; // Column F (colors go here)

let lastEditedRow = null;

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎨 Color Tools')
    .addItem('Pick Color for Current Row', 'openColorPicker')
    .addToUi();
}

function onEdit(e) {
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();

  // Check if edit is in the Color column (skip header row)
  if (col === COLOR_COLUMN && row > 1) {
    lastEditedRow = row;
    // Clear the cell
    range.clearContent();
    // Open color picker for this row
    openColorPickerForEdit(row, col);
  }
}

function openColorPicker() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();
  const col = range.getColumn();

  openColorPickerForEdit(row, col);
}

function openColorPickerForEdit(row, col) {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            text-align: center;
          }
          input[type="color"] {
            width: 100px;
            height: 100px;
            border: none;
            cursor: pointer;
          }
          .hex-display {
            margin-top: 15px;
            font-size: 14px;
            font-family: monospace;
          }
          button {
            margin-top: 15px;
            padding: 8px 16px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background: #3367d6;
          }
        </style>
      </head>
      <body>
        <h3>Pick a Color</h3>
        <input type="color" id="colorPicker" value="#6496ff" onchange="updateHex()">
        <div class="hex-display" id="hexDisplay">#6496ff</div>
        <button onclick="applyColor()">Apply</button>
        <button onclick="google.script.host.close()">Cancel</button>

        <script>
          function updateHex() {
            const color = document.getElementById('colorPicker').value;
            document.getElementById('hexDisplay').textContent = color.toUpperCase();
          }

          function applyColor() {
            const color = document.getElementById('colorPicker').value;
            google.script.run.insertColorToSheetAtPosition(color, ${row}, ${col});
            google.script.host.close();
          }
        </script>
      </body>
    </html>
  `)
  .setWidth(250)
  .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Color Picker');
}

function insertColorToSheetAtPosition(hexColor, row, col) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(row, col);
  range.setValue(hexColor);
  range.setBackground(hexColor);
}
