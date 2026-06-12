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
