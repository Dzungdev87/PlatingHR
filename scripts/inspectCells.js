const xlsx = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', '.FileExcel', 'Điểm danh mạ.xlsx');
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets['Plating'];
  
  // Show cell range
  console.log('Range:', worksheet['!ref']);
  
  // Let's print cells from D5 to AG10
  // In xlsx, A1 is the top-left cell. Let's see some cell values.
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG'];
  
  for (let r = 6; r <= 10; r++) { // Row 6 is index 5 in 0-indexed, which is Excel Row 6
    let rowText = '';
    for (let c of cols) {
      const cellRef = `${c}${r}`;
      const cell = worksheet[cellRef];
      rowText += `${c}:${cell ? cell.v : 'empty'} | `;
    }
    console.log(`Excel Row ${r}:`, rowText);
  }
} catch (error) {
  console.error(error);
}
