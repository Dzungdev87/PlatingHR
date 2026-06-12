/**
 * exportAttendanceExcel.js
 * Xuất bảng chấm công ra file Excel (.xlsx) với định dạng in A4 chuẩn
 * Sử dụng XLSX.write() + Blob download để đảm bảo hoạt động trên mọi browser
 */
import * as XLSX from 'xlsx';

const LEAVE_CODES = ['AL', 'UP', 'SL', 'WL', 'OL'];

/**
 * Build and download the Excel file
 * @param {object} params
 * @param {number} params.month
 * @param {number} params.year
 * @param {Array}  params.employees  — [{ empId, fullName }]
 * @param {object} params.attendanceData — { "empId-day": value }
 */
export function exportAttendanceExcel({ month, year, employees, attendanceData }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const getDayName = (d) => DAY_NAMES[new Date(year, month - 1, d).getDay()];

  // ── 1. Build worksheet rows ──────────────────────────────
  const wsData = [];

  // Row 1: Main title (merged later)
  wsData.push([`BẢNG CHẤM CÔNG - THÁNG ${month}/${year}`, ...Array(2 + daysInMonth + 1).fill('')]);

  // Row 2: Company / dept info
  wsData.push([`Bộ phận: PLATING`, ...Array(2 + daysInMonth + 1).fill('')]);

  // Row 3: blank
  wsData.push([]);

  // Row 4: Column headers
  const headerRow = ['STT', 'Mã NV', 'Họ và tên'];
  days.forEach(d => headerRow.push(`${d}\r\n${getDayName(d)}`));
  headerRow.push('Tổng công', 'Nghỉ');
  wsData.push(headerRow);

  // Rows 5+: Employee data
  employees.forEach((emp, idx) => {
    let workDays = 0, leaveDays = 0;
    const row = [idx + 1, emp.empId, emp.fullName];
    days.forEach(d => {
      const val = (attendanceData[`${emp.empId}-${d}`] || '').trim();
      row.push(val);
      if (val && !LEAVE_CODES.includes(val)) workDays++;
      if (LEAVE_CODES.includes(val)) leaveDays++;
    });
    row.push(workDays, leaveDays);
    wsData.push(row);
  });

  // Blank row
  wsData.push([]);

  // Signature row
  const totalCols = 3 + daysInMonth + 2;
  const sigRow = Array(totalCols).fill('');
  sigRow[0] = `Người lập bảng`;
  sigRow[Math.floor(totalCols / 2) - 1] = `Tổ trưởng xác nhận`;
  sigRow[totalCols - 2] = `Ngày    tháng ${month} năm ${year}`;
  wsData.push(sigRow);

  // Blank for signature space
  wsData.push(Array(totalCols).fill(''));
  wsData.push(Array(totalCols).fill(''));

  const sigNameRow = Array(totalCols).fill('');
  sigNameRow[0] = `(Ký và ghi rõ họ tên)`;
  sigNameRow[Math.floor(totalCols / 2) - 1] = `(Ký và ghi rõ họ tên)`;
  wsData.push(sigNameRow);

  // ── 2. Create worksheet ──────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── 3. Merge cells ────────────────────────────────────────
  const lastCol = 2 + daysInMonth + 1; // 0-indexed
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // title
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // dept
  ];

  // ── 4. Column widths ──────────────────────────────────────
  const colWidths = [
    { wch: 5 },  // STT
    { wch: 9 },  // Mã NV
    { wch: 24 }, // Họ tên
  ];
  days.forEach(() => colWidths.push({ wch: 4.2 })); // day cols
  colWidths.push({ wch: 8 }, { wch: 6 }); // Tổng công, Nghỉ
  ws['!cols'] = colWidths;

  // ── 5. Row heights ────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 26 }, // title
    { hpt: 18 }, // dept
    { hpt: 6 },  // blank
    { hpt: 34 }, // header (2-line day names)
    ...employees.map(() => ({ hpt: 17 })),
    { hpt: 6 },  // blank
    { hpt: 18 }, // sig line
    { hpt: 22 }, // sig space 1
    { hpt: 22 }, // sig space 2
    { hpt: 16 }, // sig name
  ];

  // ── 6. Page setup for A4 printing ────────────────────────
  ws['!pageSetup'] = {
    paperSize: 9,          // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,         // All columns on 1 page
    fitToHeight: 0,
  };

  ws['!margins'] = {
    left: 0.39, right: 0.39,
    top: 0.59, bottom: 0.59,
    header: 0.2, footer: 0.2,
  };

  // ── 7. Legend sheet ───────────────────────────────────────
  const legendData = [
    ['Ký hiệu chấm công', ''],
    ['', ''],
    ['Ký hiệu', 'Loại ca / Nghỉ', 'Thời lượng'],
    ['C1', 'Ca ngày', '8h'],
    ['C2', 'Ca ngày', '8h'],
    ['C3', 'Ca đêm', '8h'],
    ['TS', 'Ca đêm', '12h'],
    ['X', 'Ca ngày', '12h'],
    ['V', 'Ca ngày', '8h'],
    ['', '', ''],
    ['AL', 'Nghỉ phép (Annual Leave)', ''],
    ['UP', 'Nghỉ không lương (Unpaid Leave)', ''],
    ['SL', 'Nghỉ ốm (Sick Leave)', ''],
    ['WL', 'Nghỉ kết hôn (Wedding Leave)', ''],
    ['OL', 'Nghỉ khác (Other Leave)', ''],
  ];
  const wsLegend = XLSX.utils.aoa_to_sheet(legendData);
  wsLegend['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }];
  wsLegend['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // ── 8. Build workbook ─────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `T${month}-${year}`);
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Ký hiệu');

  // ── 9. Write to ArrayBuffer then download via Blob ────────
  // This approach works reliably in all browsers including Next.js
  const wbArray = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',       // returns Uint8Array
    compression: true,
  });

  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const fileName = `ChamCong_T${String(month).padStart(2, '0')}_${year}.xlsx`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);

  return fileName;
}
