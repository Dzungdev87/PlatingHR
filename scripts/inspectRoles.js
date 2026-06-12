const xlsx = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', '.FileExcel', 'Điểm danh mạ.xlsx');
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets['Plating'];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Total rows:', data.length);
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (row && row[2]) {
      console.log(`Row ${i}: Direct/Indirect=${row[0]}, Stt=${row[1]}, EmpNo=${row[2]}, Name=${row[3]}, NumCols=${row.length}`);
    }
  }
} catch (error) {
  console.error(error);
}
