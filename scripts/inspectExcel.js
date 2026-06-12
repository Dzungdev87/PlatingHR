const xlsx = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', '.FileExcel', 'Điểm danh mạ.xlsx');
  console.log('Loading file:', filePath);
  const workbook = xlsx.readFile(filePath);
  console.log('Sheets in workbook:', workbook.SheetNames);
  
  // Inspect the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Read raw data as JSON
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('--- Row 2 Headers ---', data[2]);
  console.log('--- Row 3 Date Serial Numbers ---', data[3]);
  console.log('--- Row 4 Days ---', data[4]);
  console.log('--- Row 5 Employee 1 Details & Attendance ---', data[5]);
  console.log('--- Row 6 Employee 2 Details & Attendance ---', data[6]);
} catch (error) {
  console.error('Error reading excel file:', error);
}
