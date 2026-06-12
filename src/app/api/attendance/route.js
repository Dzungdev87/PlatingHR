import { NextResponse } from 'next/server';
import { getAllSheetData, updateCell, getOrInitializeAttendanceSheet, appendSheetData, updateRange } from '@/lib/googleSheets';
import { verifyToken, canEditAttendanceForDate } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ error: 'Tháng và năm là bắt buộc' }, { status: 400 });
    }

    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    // Get or initialize sheet name for the month and year
    const sheetName = await getOrInitializeAttendanceSheet(parsedMonth, parsedYear);
    const data = await getAllSheetData(sheetName);

    if (!data || data.length === 0) {
      return NextResponse.json({ attendance: [] });
    }

    // Filter: only rows where column B looks like a real employee ID (e.g. B4485, NV001)
    // This removes header rows: "Tháng 6", "Mã NV / Emp. No.", "Họ và tên / Full name", etc.
    const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;

    const attendance = data
      .map((row, idx) => ({ row, sheetRowNum: idx + 1 })) // track 1-based sheet row
      .filter(({ row }) => EMP_ID_PATTERN.test((row[1] || '').toString().trim()))
      .map(({ row, sheetRowNum }) => ({
        rowIndex: sheetRowNum,          // actual 1-based row in the sheet
        empId: row[1].toString().trim(),
        fullName: (row[2] || '').toString().trim(),
        days: row.slice(3, 34),         // Columns D-AH (up to 31 days)
      }));

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const { month, year, attendanceData } = await request.json();

    if (!month || !year || !attendanceData) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    // Get or initialize sheet name for the month and year
    const sheetName = await getOrInitializeAttendanceSheet(parsedMonth, parsedYear);

    // Get all data currently in the sheet to find rows
    let data = await getAllSheetData(sheetName);
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu bảng tính' }, { status: 404 });
    }

    const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;

    // 1. Validation & Security check (only for Leaders)
    if (user.role === 'leader') {
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const empId = (row[1] || '').toString().trim();
        if (!EMP_ID_PATTERN.test(empId)) continue;

        for (let day = 1; day <= 31; day++) {
          const key = `${empId}-${day}`;
          const newValue = (attendanceData[key] || '').trim();
          const oldValue = (row[3 + (day - 1)] || '').toString().trim();

          if (newValue !== oldValue) {
            const cellDate = new Date(parsedYear, parsedMonth - 1, day); cellDate.setHours(0,0,0,0);
            const isAllowed = cellDate.getTime() === today.getTime() || cellDate.getTime() === yesterday.getTime();
            if (!isAllowed) {
              return NextResponse.json(
                { error: `Leader chỉ được chấm công cho hôm nay và hôm qua (Ngày ${day} không hợp lệ)` },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // 2. Synchronize newly added employees in master list
    // Check if any employees in attendanceData are NOT in the monthly sheet
    const masterData = await getAllSheetData('ChamCong');
    const masterEmployees = masterData
      .filter((row) => EMP_ID_PATTERN.test((row[1] || '').toString().trim()))
      .map((row) => ({
        empId: row[1].toString().trim(),
        fullName: (row[2] || '').toString().trim(),
      }));

    let sheetUpdated = false;
    for (const emp of masterEmployees) {
      const foundInSheet = data.some((row) => (row[1] || '').toString().trim() === emp.empId);
      if (!foundInSheet) {
        // Append missing employee to the sheet
        const nextNo = data.length;
        const newRow = [nextNo, emp.empId, emp.fullName, ...Array(31).fill('')];
        await appendSheetData(sheetName, newRow);
        sheetUpdated = true;
      }
    }

    // If we appended new rows, reload sheet data
    if (sheetUpdated) {
      data = await getAllSheetData(sheetName);
    }

    // 3. Construct 2D array of values to update (columns D through AH = days 1 to 31)
    const updateRows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const empId = (row[1] || '').toString().trim();

      const dayValues = [];
      if (EMP_ID_PATTERN.test(empId)) {
        for (let day = 1; day <= 31; day++) {
          const key = `${empId}-${day}`;
          dayValues.push(attendanceData[key] || '');
        }
      } else {
        // If not a valid employee row (e.g. empty or footer), keep existing cell values
        for (let colIdx = 3; colIdx < 34; colIdx++) {
          dayValues.push(row[colIdx] || '');
        }
      }
      updateRows.push(dayValues);
    }

    // 4. Update the entire block of days (D2:AH<last row>)
    const startCell = 'D2';
    await updateRange(sheetName, startCell, updateRows);

    return NextResponse.json({
      message: 'Lưu bảng chấm công thành công',
      month: parsedMonth,
      year: parsedYear,
    });
  } catch (error) {
    console.error('Save attendance error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
