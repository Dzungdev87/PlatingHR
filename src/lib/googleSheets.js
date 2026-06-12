import { google } from 'googleapis';

// NOTE: In Next.js serverless/edge, module-level cache can be reset between requests.
// We keep the cache but always re-authenticate if the token might be expired.
let sheetsClient = null;
let authClient = null;
let authInitializedAt = null;
const AUTH_TTL_MS = 55 * 60 * 1000; // Re-auth every 55 minutes (token valid 60 min)

// Initialize Google Sheets API client with TTL-based re-auth
async function initializeSheets() {
  const now = Date.now();
  const needsRefresh = !sheetsClient || !authInitializedAt || (now - authInitializedAt > AUTH_TTL_MS);

  if (!needsRefresh) {
    return sheetsClient;
  }

  try {
    // Handle private key: Next.js may read \n as literal or as newline depending on quoting
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!privateKey || !serviceAccountEmail || !spreadsheetId) {
      throw new Error('Missing Google Sheets configuration in environment variables');
    }

    authClient = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Pre-authorize to get token upfront and catch key errors early
    await authClient.authorize();

    sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    authInitializedAt = now;
    return sheetsClient;
  } catch (error) {
    // Reset cache so next request can retry
    sheetsClient = null;
    authClient = null;
    authInitializedAt = null;
    console.error('Error initializing Google Sheets:', error);
    throw error;
  }
}

// Internal helper: call with automatic retry on transient errors
async function withRetry(fn, retries = 2, delayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.response?.status ?? error?.code;
      const isTransient = [429, 500, 502, 503, 504].includes(Number(status));

      if (attempt < retries && isTransient) {
        console.warn(`Google Sheets transient error (status ${status}), retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
        // Force re-auth on next attempt if 401/403
        if ([401, 403].includes(Number(status))) {
          sheetsClient = null;
          authInitializedAt = null;
        }
        continue;
      }
      throw error;
    }
  }
}

// Get data from a specific sheet and range
export async function getSheetData(sheetName, range) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const fullRange = `${sheetName}!${range}`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: fullRange });
    return response.data.values || [];
  });
}

// Get all data from a sheet
export async function getAllSheetData(sheetName) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    return response.data.values || [];
  });
}

// Update data in a specific range
export async function updateSheetData(sheetName, range, values) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const fullRange = `${sheetName}!${range}`;
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: fullRange,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    });
    return response.data;
  });
}

// Append a new row to a sheet
export async function appendSheetData(sheetName, values) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    });
    return response.data;
  });
}

// Delete a row by shifting rows up
export async function deleteSheetRow(sheetName, rowIndex) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find((s) => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
    const sheetId = sheet.properties.sheetId;
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteRange: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
            shiftDimension: 'ROWS',
          },
        }],
      },
    });
    return response.data;
  });
}

// Update a single cell
export async function updateCell(sheetName, cellAddress, value) {
  return updateSheetData(sheetName, cellAddress, [value]);
}

// Get a range of cells
export async function getRange(sheetName, startCell, endCell) {
  return getSheetData(sheetName, `${startCell}:${endCell}`);
}

// Update a range of cells (2D array)
export async function updateRange(sheetName, startCell, values) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  return withRetry(async () => {
    const sheets = await initializeSheets();
    const fullRange = `${sheetName}!${startCell}`;
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: fullRange,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return response.data;
  });
}

// Find row by column value (returns 0-based index, -1 if not found)
export async function findRowByValue(sheetName, columnIndex, value) {
  const data = await getAllSheetData(sheetName);
  return data.findIndex((row) => row[columnIndex] === value);
}

// Get or initialize month-specific sheet (e.g., ChamCong_06_2026)
export async function getOrInitializeAttendanceSheet(month, year) {
  const formattedMonth = String(month).padStart(2, '0');
  const sheetName = `ChamCong_${formattedMonth}_${year}`;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  return withRetry(async () => {
    const sheets = await initializeSheets();
    try {
      // Check if sheet exists
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:C1`,
      });
      return sheetName;
    } catch (error) {
      const status = error?.response?.status ?? error?.code;
      const isNotFoundError = status === 400 || (error.message && error.message.includes('Unable to parse range'));
      
      if (!isNotFoundError) {
        throw error;
      }

      console.log(`Sheet "${sheetName}" not found. Creating and initializing it...`);

      // Get master employee list
      const masterResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ChamCong',
      });
      const masterData = masterResponse.data.values || [];
      const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;
      const activeEmployees = masterData
        .filter((row) => EMP_ID_PATTERN.test((row[1] || '').toString().trim()))
        .map((row) => ({
          empId: row[1].toString().trim(),
          fullName: (row[2] || '').toString().trim(),
        }));

      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // Prepare initial rows
      const days = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
      const header = ['No', 'Emp.No.', 'Full Name', ...days, 'Total'];
      const rows = [header];
      activeEmployees.forEach((emp, idx) => {
        rows.push([idx + 1, emp.empId, emp.fullName, ...Array(31).fill('')]);
      });

      // Write values
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });

      console.log(`Successfully initialized sheet "${sheetName}" with ${activeEmployees.length} employees.`);
      return sheetName;
    }
  });
}
