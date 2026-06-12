import { NextResponse } from 'next/server';
import { getAllSheetData, getOrInitializeAttendanceSheet } from '@/lib/googleSheets';
import { verifyToken } from '@/lib/auth';

// We use require() for xlsx to avoid ESM/CJS conflict in Next.js
const XLSX = require('xlsx');

const LEAVE_CODES = ['AL', 'UP', 'SL', 'WL', 'OL'];
const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;

export async function GET(request) {
  try {
    // Auth check
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });

    // Parse query params
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Fetch data from Google Sheets for the specific month/year
    const sheetName = await getOrInitializeAttendanceSheet(month, year);
    const data = await getAllSheetData(sheetName);
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 404 });
    }

    // Filter valid employees
    const employees = data
      .map((row, idx) => ({ row, sheetRowNum: idx + 1 }))
      .filter(({ row }) => EMP_ID_PATTERN.test((row[1] || '').toString().trim()))
      .map(({ row }) => ({
        empId: row[1].toString().trim(),
        fullName: (row[2] || '').toString().trim(),
        days: row.slice(3, 34), // up to 31 days
      }));

    // Build day info
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const getDayName = (d) => DAY_NAMES[new Date(year, month - 1, d).getDay()];
    const isWeekend = (d) => {
      const w = new Date(year, month - 1, d).getDay();
      return w === 0 || w === 6;
    };

    // ── Build worksheet rows ──────────────────────────────
    const wsData = [];

    // Row 1: Title
    wsData.push([`BẢNG CHẤM CÔNG THÁNG ${month}/${year} - BỘ PHẬN PLATING`]);
    wsData.push([`Tổng số nhân viên: ${employees.length} người`]);
    wsData.push([]); // blank

    // Row 4: Headers
    const headerRow = ['STT', 'Mã NV', 'Họ và tên'];
    days.forEach(d => headerRow.push(`${d}\n${getDayName(d)}`));
    headerRow.push('Tổng công', 'Nghỉ');
    wsData.push(headerRow);

    // Employee rows
    employees.forEach((emp, idx) => {
      let workDays = 0, leaveDays = 0;
      const row = [idx + 1, emp.empId, emp.fullName];

      days.forEach((d, i) => {
        const originalVal = (emp.days[i] || '').toString().trim();
        const val = originalVal.length > 5 ? originalVal.substring(0, 5) : originalVal;
        row.push(val);
        if (originalVal && !LEAVE_CODES.includes(originalVal)) workDays++;
        if (LEAVE_CODES.includes(originalVal)) leaveDays++;
      });

      row.push(workDays, leaveDays);
      wsData.push(row);
    });

    // Blank + signature
    wsData.push([]);
    const totalCols = 3 + daysInMonth + 2;
    const sigRow = Array(totalCols).fill('');
    sigRow[0] = 'Người lập bảng';
    sigRow[Math.floor(totalCols / 2) - 1] = 'Tổ trưởng xác nhận';
    sigRow[totalCols - 2] = `Ngày    tháng ${month} năm ${year}`;
    wsData.push(sigRow);
    wsData.push(Array(totalCols).fill(''));
    wsData.push(Array(totalCols).fill(''));
    const sigNameRow = Array(totalCols).fill('');
    sigNameRow[0] = '(Ký và ghi rõ họ tên)';
    sigNameRow[Math.floor(totalCols / 2) - 1] = '(Ký và ghi rõ họ tên)';
    wsData.push(sigNameRow);

    // ── Create worksheet ──────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge title rows
    const lastCol = 2 + daysInMonth + 1;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ];

    // Column widths
    const colWidths = [{ wch: 5 }, { wch: 9 }, { wch: 24 }];
    days.forEach(() => colWidths.push({ wch: 4.2 }));
    colWidths.push({ wch: 9 }, { wch: 6 });
    ws['!cols'] = colWidths;

    // Row heights
    ws['!rows'] = [
      { hpt: 26 }, { hpt: 16 }, { hpt: 6 }, { hpt: 34 },
      ...employees.map(() => ({ hpt: 17 })),
      { hpt: 6 }, { hpt: 18 }, { hpt: 22 }, { hpt: 22 }, { hpt: 16 },
    ];

    // Page setup: A4 landscape, fit to 1 page wide
    ws['!pageSetup'] = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    ws['!margins'] = { left: 0.39, right: 0.39, top: 0.59, bottom: 0.59, header: 0.2, footer: 0.2 };

    // Legend sheet
    const legendData = [
      ['Ký hiệu chấm công - PLATING HR'],
      [],
      ['Ký hiệu', 'Loại ca / Nghỉ', 'Thời lượng'],
      ['C1', 'Ca ngày', '8h'],
      ['C2', 'Ca ngày', '8h'],
      ['C3', 'Ca đêm', '8h'],
      ['TS', 'Ca đêm', '12h'],
      ['X',  'Ca ngày', '12h'],
      ['V',  'Ca ngày', '8h'],
      [],
      ['AL', 'Nghỉ phép (Annual Leave)', ''],
      ['UP', 'Nghỉ không lương (Unpaid Leave)', ''],
      ['SL', 'Nghỉ ốm (Sick Leave)', ''],
      ['WL', 'Nghỉ kết hôn (Wedding Leave)', ''],
      ['OL', 'Nghỉ khác (Other Leave)', ''],
    ];
    const wsLegend = XLSX.utils.aoa_to_sheet(legendData);
    wsLegend['!cols'] = [{ wch: 9 }, { wch: 32 }, { wch: 12 }];
    wsLegend['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

    // ── Build workbook ────────────────────────────────────
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: `Bảng chấm công tháng ${month}/${year}`,
      Subject: 'Plating HR',
      Author: 'PLATING HR System',
    };
    XLSX.utils.book_append_sheet(wb, ws, `T${month}-${year}`);
    XLSX.utils.book_append_sheet(wb, wsLegend, 'Ký hiệu');

    // ── Write to buffer and return as download ────────────
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const fileName = `ChamCong_T${String(month).padStart(2, '0')}_${year}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('Export Excel error:', err);
    return NextResponse.json({ error: 'Lỗi xuất Excel: ' + err.message }, { status: 500 });
  }
}
