const XLSX = require('xlsx');
const path = require('path');
const os = require('os');

try {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Test Header', 'Value'],
    ['B4485', 'Nguyễn Văn A'],
    ['B4626', 'Trần Thị B'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'ChamCong');

  // Write to buffer (same as browser code uses 'array')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  
  const outPath = path.join(os.homedir(), 'Downloads', 'test_ChamCong.xlsx');
  require('fs').writeFileSync(outPath, buf);
  
  console.log('✅ XLSX library works correctly!');
  console.log('   Buffer size:', buf.length, 'bytes');
  console.log('   File saved to:', outPath);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
