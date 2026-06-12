const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function testExport() {
  // Step 1: Login
  const loginBody = JSON.stringify({ empId: 'ADMIN', password: '123456' });
  const loginResp = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(loginBody);
    req.end();
  });

  console.log('Login status:', loginResp.status);
  if (loginResp.status !== 200) {
    console.error('Login failed:', loginResp.body);
    process.exit(1);
  }

  // Extract token cookie
  const setCookie = loginResp.headers['set-cookie'] || [];
  const tokenCookie = setCookie.find(c => c.startsWith('token='));
  if (!tokenCookie) {
    console.error('No token cookie found. Cookies:', setCookie);
    process.exit(1);
  }
  const token = tokenCookie.split(';')[0]; // "token=xxxxx"
  console.log('Got token cookie');

  // Step 2: Export Excel
  const exportResp = await new Promise((resolve, reject) => {
    const chunks = [];
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/attendance/export?month=6&year=2026',
      method: 'GET',
      headers: { 'Cookie': token },
    }, (res) => {
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('Export status:', exportResp.status);
  console.log('Content-Type:', exportResp.headers['content-type']);
  console.log('Content-Disposition:', exportResp.headers['content-disposition']);
  console.log('Body size:', exportResp.body.length, 'bytes');

  if (exportResp.status === 200) {
    const outPath = path.join(process.env.USERPROFILE, 'Downloads', 'ChamCong_T06_2026.xlsx');
    fs.writeFileSync(outPath, exportResp.body);
    console.log('✅ File saved to:', outPath);
  } else {
    console.error('❌ Export failed:', exportResp.body.toString());
  }
}

testExport().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
