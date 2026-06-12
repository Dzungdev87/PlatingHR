import { NextResponse } from 'next/server';
import { getAllSheetData, updateCell } from '@/lib/googleSheets';
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

    // Get attendance data from ChamCong sheet
    const data = await getAllSheetData('ChamCong');

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

    const { empId, day, month, year, value } = await request.json();

    if (!empId || !day || !month || !year) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Check if user has permission to edit this date
    const targetDate = new Date(year, month - 1, day);
    if (!canEditAttendanceForDate(user.role, targetDate)) {
      return NextResponse.json(
        { error: 'Chỉ được chấm công cho hôm nay và hôm qua' },
        { status: 403 }
      );
    }

    // Get all data to find the correct row and column
    const data = await getAllSheetData('ChamCong');
    const rowIndex = data.findIndex((row) => row[1] === empId);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // Calculate column: D = day 1, E = day 2, ... AG = day 30
    let col;
    if (day <= 23) {
      col = String.fromCharCode(68 + (day - 1)); // D to Z
    } else {
      // AA, AB, AC, AD, AE, AF, AG for days 24-30
      const extraDays = day - 24;
      col = 'A' + String.fromCharCode(65 + extraDays);
    }
    const cellAddress = `${col}${rowIndex + 1}`;

    // Update the cell
    await updateCell('ChamCong', cellAddress, value || '');

    return NextResponse.json({
      message: 'Cập nhật chấm công thành công',
      empId,
      day,
      value,
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
