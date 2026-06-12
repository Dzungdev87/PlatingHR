/**
 * Script test kết nối Google Sheets
 * Chạy: node scripts/testConnection.js
 */

// Load .env.local
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  const key = trimmed.substring(0, eqIdx).trim();
  const value = trimmed.substring(eqIdx + 1).trim();
  process.env[key] = value;
});

const { google } = require('googleapis');

async function testConnection() {
  console.log('\n🔍 Kiểm tra kết nối Google Sheets...\n');

  // 1. Kiểm tra env vars
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  console.log('📋 Cấu hình:');
  console.log('  Spreadsheet ID:', spreadsheetId ? `✅ ${spreadsheetId}` : '❌ Thiếu!');
  console.log('  Service Account:', email ? `✅ ${email}` : '❌ Thiếu!');
  console.log('  Private Key:', privateKeyRaw ? `✅ Có (${privateKeyRaw.length} ký tự)` : '❌ Thiếu!');
  console.log('');

  if (!spreadsheetId || !email || !privateKeyRaw) {
    console.error('❌ Thiếu thông tin cấu hình trong .env.local');
    process.exit(1);
  }

  // Parse private key (replace \n with actual newlines)
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    // 2. Khởi tạo auth
    console.log('🔐 Khởi tạo xác thực...');
    const auth = new google.auth.JWT({
      email: email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await auth.authorize();
    console.log('  ✅ Xác thực thành công!\n');

    // 3. Kết nối Sheets API
    const sheets = google.sheets({ version: 'v4', auth });

    // 4. Lấy thông tin spreadsheet
    console.log('📊 Đang truy cập Google Sheet...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`  ✅ Sheet: "${spreadsheet.data.properties.title}"`);
    console.log(`  📋 Các sheet có trong file:`);
    spreadsheet.data.sheets.forEach(s => {
      console.log(`     - ${s.properties.title} (${s.properties.gridProperties.rowCount} rows × ${s.properties.gridProperties.columnCount} cols)`);
    });
    console.log('');

    // 5. Đọc dữ liệu từ sheet ChamCong
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    
    if (sheetNames.includes('ChamCong') || sheetNames.some(s => s.includes('CHẤM CÔNG') || s.includes('CHAM CONG'))) {
      const targetSheet = sheetNames.find(s => 
        s === 'ChamCong' || s.includes('CHẤM CÔNG') || s.includes('CHAM CONG')
      );
      console.log(`📅 Đọc dữ liệu từ sheet "${targetSheet}"...`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${targetSheet}!A1:D5`,
      });
      const rows = response.data.values || [];
      console.log(`  ✅ Đọc được ${rows.length} dòng đầu tiên:`);
      rows.forEach((row, i) => console.log(`     Dòng ${i+1}: ${JSON.stringify(row)}`));
      console.log('');
    } else {
      console.log('⚠️  Chưa có sheet "ChamCong". Các sheet hiện tại:', sheetNames);
      console.log('  → Cần tạo sheet "ChamCong", "Users", "Config"\n');
    }

    // 6. Kiểm tra sheet Users
    if (sheetNames.includes('Users')) {
      console.log('👥 Kiểm tra sheet "Users"...');
      const usersResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A1:D5',
      });
      const userRows = usersResp.data.values || [];
      console.log(`  ✅ Sheet Users có ${userRows.length} dòng dữ liệu`);
      if (userRows.length === 0) {
        console.log('  ⚠️  Sheet Users trống — cần thêm tài khoản admin!\n');
      } else {
        userRows.forEach((row, i) => console.log(`     Dòng ${i+1}: ${JSON.stringify(row)}`));
      }
    } else {
      console.log('⚠️  Chưa có sheet "Users" — cần tạo để đăng nhập được!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ KẾT NỐI GOOGLE SHEETS THÀNH CÔNG!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ LỖI KẾT NỐI:');
    console.error('  Message:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.error('\n💡 Nguyên nhân có thể:');
      console.error('  - Private key bị sai định dạng');
      console.error('  - Service account bị vô hiệu hóa');
    } else if (error.message.includes('PERMISSION_DENIED') || error.message.includes('403')) {
      console.error('\n💡 Nguyên nhân có thể:');
      console.error('  - Chưa share Google Sheet với service account email:');
      console.error(`  - ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      console.error('  - Vào Google Sheet → Share → thêm email trên với quyền Editor');
    } else if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
      console.error('\n💡 Nguyên nhân có thể:');
      console.error('  - Spreadsheet ID không đúng:', spreadsheetId);
    }
    process.exit(1);
  }
}

testConnection();
