/**
 * Script khởi tạo cấu trúc Google Sheets cho Plating HR
 * - Đổi tên "Trang tính1" → "ChamCong"
 * - Tạo sheet "Users" với tài khoản admin mặc định
 * - Tạo sheet "Config"
 * Chạy: node scripts/setupSheets.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  process.env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
});

const { google } = require('googleapis');

async function setupSheets() {
  console.log('\n🚀 Khởi tạo cấu trúc Google Sheets cho PLATING HR...\n');

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const auth = new google.auth.JWT({
    email, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Lấy danh sách sheet hiện tại
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets.map(s => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
  console.log('📋 Sheets hiện tại:', existingSheets.map(s => s.title).join(', '));

  const requests = [];

  // 1. Đổi tên sheet đầu tiên thành "ChamCong" (nếu chưa có sheet ChamCong)
  const hasChamCong = existingSheets.some(s => s.title === 'ChamCong');
  const firstSheet = existingSheets[0];

  if (!hasChamCong) {
    console.log(`\n📝 Đổi tên "${firstSheet.title}" → "ChamCong"...`);
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: firstSheet.sheetId, title: 'ChamCong' },
        fields: 'title',
      },
    });
  } else {
    console.log('\n✅ Sheet "ChamCong" đã tồn tại');
  }

  // 2. Tạo sheet "Users" nếu chưa có
  const hasUsers = existingSheets.some(s => s.title === 'Users');
  if (!hasUsers) {
    console.log('📝 Tạo sheet "Users"...');
    requests.push({ addSheet: { properties: { title: 'Users' } } });
  } else {
    console.log('✅ Sheet "Users" đã tồn tại');
  }

  // 3. Tạo sheet "Config" nếu chưa có
  const hasConfig = existingSheets.some(s => s.title === 'Config');
  if (!hasConfig) {
    console.log('📝 Tạo sheet "Config"...');
    requests.push({ addSheet: { properties: { title: 'Config' } } });
  } else {
    console.log('✅ Sheet "Config" đã tồn tại');
  }

  // Thực hiện các thay đổi cấu trúc
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log('✅ Cập nhật cấu trúc sheet thành công!\n');
  }

  // 4. Thêm header + dữ liệu vào sheet Users
  if (!hasUsers) {
    console.log('👥 Thêm dữ liệu vào sheet Users...');
    
    // Hash mật khẩu
    const adminPwHash = await bcrypt.hash('123456', 10);
    const leaderPwHash = await bcrypt.hash('123', 10);

    const today = new Date().toISOString().split('T')[0];

    const usersData = [
      // Header
      ['empId', 'fullName', 'password', 'role', 'shift', 'team', 'email', 'phone', 'department', 'position', 'joinDate', 'status'],
      // Admin mặc định
      ['ADMIN', 'Quản trị viên', adminPwHash, 'admin', '', '', '', '', 'Plating', 'Admin', today, 'active'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Users!A1',
      valueInputOption: 'RAW',
      requestBody: { values: usersData },
    });
    console.log('  ✅ Đã thêm tài khoản Admin mặc định (ADMIN / 123456)');
  }

  // 5. Thêm dữ liệu vào Config
  if (!hasConfig) {
    console.log('\n⚙️  Thêm cấu hình vào sheet Config...');
    const now = new Date();
    const configData = [
      ['key', 'value', 'description'],
      ['currentMonth', String(now.getMonth() + 1), 'Tháng hiện tại'],
      ['currentYear', String(now.getFullYear()), 'Năm hiện tại'],
      ['defaultShift', 'C1', 'Ca mặc định'],
      ['appVersion', '1.0.0', 'Phiên bản ứng dụng'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Config!A1',
      valueInputOption: 'RAW',
      requestBody: { values: configData },
    });
    console.log('  ✅ Đã thêm cấu hình mặc định');
  }

  // 6. Kiểm tra sheet ChamCong có header chưa
  console.log('\n📅 Kiểm tra sheet ChamCong...');
  const chamCongResp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'ChamCong!A1:C1',
  });
  const firstRow = chamCongResp.data.values?.[0] || [];
  
  if (firstRow.length === 0) {
    console.log('  ⚠️  Sheet ChamCong trống, thêm header...');
    const days = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
    const header = ['No', 'Emp.No.', 'Full Name', ...days, 'Total'];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ChamCong!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
    console.log('  ✅ Đã thêm header cho ChamCong');
  } else {
    console.log('  ✅ Sheet ChamCong đã có dữ liệu:', JSON.stringify(firstRow));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ KHỞI TẠO GOOGLE SHEETS HOÀN THÀNH!');
  console.log('='.repeat(60));
  console.log('\n📌 Thông tin đăng nhập mặc định:');
  console.log('   Mã NV: ADMIN');
  console.log('   Mật khẩu: 123456');
  console.log('   Vai trò: Admin');
  console.log('\n💡 Bây giờ bạn có thể đăng nhập tại: http://localhost:3000\n');
}

setupSheets().catch(err => {
  console.error('\n❌ Lỗi:', err.message);
  process.exit(1);
});
