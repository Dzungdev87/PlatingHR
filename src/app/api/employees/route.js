import { NextResponse } from 'next/server';
import { getAllSheetData, appendSheetData, updateSheetData, deleteSheetRow } from '@/lib/googleSheets';
import { verifyToken } from '@/lib/auth';

// Helper: count occurrences of a leave type in an array of day values
function countLeave(days, leaveCode) {
  return days.filter((v) => {
    const val = (v || '').toString().trim().toUpperCase();
    return val === leaveCode;
  }).length;
}

// Helper: get column letter for a day number (1-31)
// Day 1 → D (col index 3), Day 24 → AA, etc.
function dayToCol(day) {
  if (day <= 23) {
    return String.fromCharCode(68 + (day - 1)); // D=68
  }
  // Day 24 → AA (extra = 0 → A), 25 → AB, ...
  const extraDays = day - 24;
  return 'A' + String.fromCharCode(65 + extraDays);
}

export async function GET(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // 1. Get employees from ChamCong master sheet (employee list only)
    const chamCongData = await getAllSheetData('ChamCong');
    if (!chamCongData || chamCongData.length === 0) {
      return NextResponse.json({ employees: [] });
    }

    const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;
    const dataRows = chamCongData.filter((row) => {
      const empId = (row[1] || '').toString().trim();
      return EMP_ID_PATTERN.test(empId);
    });

    // 2. Get Users sheet for joinDate
    let usersData = [];
    try {
      usersData = await getAllSheetData('Users');
    } catch {
      usersData = [];
    }

    // Build joinDate map: empId → joinDate (column K = index 10)
    const joinDateMap = {};
    for (const row of usersData) {
      const empId = (row[0] || '').toString().trim();
      if (EMP_ID_PATTERN.test(empId)) {
        joinDateMap[empId] = (row[10] || '').toString().trim(); // column K
      }
    }

    // 3. Aggregate AL/UP/SL across ALL 12 monthly sheets for the requested year.
    //    Sheet naming convention: ChamCong_MM_YYYY (e.g. ChamCong_06_2026)
    //    Read all months in parallel; ignore sheets that don't exist yet.
    const leaveMap = {}; // empId → { AL, UP, SL }

    const monthPromises = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const sheetName = `ChamCong_${mm}_${year}`;
      return getAllSheetData(sheetName).catch(() => null); // null if sheet doesn't exist
    });

    const monthlyResults = await Promise.all(monthPromises);

    for (const monthData of monthlyResults) {
      if (!monthData || monthData.length === 0) continue;
      for (const row of monthData) {
        const empId = (row[1] || '').toString().trim();
        if (!EMP_ID_PATTERN.test(empId)) continue;
        if (!leaveMap[empId]) leaveMap[empId] = { AL: 0, UP: 0, SL: 0 };
        const days = row.slice(3, 34); // columns D..AH (up to 31 days)
        leaveMap[empId].AL += countLeave(days, 'AL');
        leaveMap[empId].UP += countLeave(days, 'UP');
        leaveMap[empId].SL += countLeave(days, 'SL');
      }
    }

    const employees = dataRows.map((row) => {
      const empId = row[1].toString().trim();
      const leave = leaveMap[empId] || { AL: 0, UP: 0, SL: 0 };
      return {
        no: row[0],
        empId,
        fullName: (row[2] || '').toString().trim(),
        joinDate: joinDateMap[empId] || '',
        totalAL: leave.AL,
        totalUP: leave.UP,
        totalSL: leave.SL,
      };
    });

    // Deduplicate by empId (keep first occurrence)
    const seen = new Map();
    const uniqueEmployees = [];
    for (const emp of employees) {
      if (!seen.has(emp.empId)) {
        seen.set(emp.empId, emp);
        uniqueEmployees.push(emp);
      }
    }

    return NextResponse.json({ employees: uniqueEmployees, year });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId, fullName, joinDate } = await request.json();
    if (!empId || !fullName) {
      return NextResponse.json({ error: 'Mã NV và tên là bắt buộc' }, { status: 400 });
    }

    const existingData = await getAllSheetData('ChamCong');
    const nextNo = existingData ? existingData.length : 1;

    const newRow = [nextNo, empId, fullName, ...Array(30).fill('')];
    await appendSheetData('ChamCong', newRow);

    // If joinDate is provided, also add to Users sheet with role 'user'
    if (joinDate) {
      const newUserRow = [empId, fullName, '', 'user', '', '', '', '', 'Plating', '', joinDate, 'active'];
      await appendSheetData('Users', newUserRow);
    }

    return NextResponse.json({
      message: 'Thêm nhân viên thành công',
      employee: { empId, fullName, joinDate },
    });
  } catch (error) {
    console.error('Add employee error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

// PATCH: Update joinDate for an employee (Admin only)
export async function PATCH(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId, joinDate } = await request.json();
    if (!empId) return NextResponse.json({ error: 'Thiếu mã NV' }, { status: 400 });

    const targetEmpId = empId.toString().trim().toUpperCase();

    // Find the employee row in Users sheet
    const usersData = await getAllSheetData('Users');
    const EMP_ID_PATTERN = /^[A-Za-z]+\d+$/;

    const rowIndex = usersData.findIndex(
      (row) => (row[0] || '').toString().trim().toUpperCase() === targetEmpId
    );

    if (rowIndex === -1) {
      // Employee not in Users sheet yet — need to append a minimal row
      // Find employee in ChamCong to get full name
      const chamCongData = await getAllSheetData('ChamCong');
      const empRow = chamCongData.find(
        (row) => EMP_ID_PATTERN.test((row[1] || '').toString().trim()) &&
          row[1].toString().trim().toUpperCase() === targetEmpId
      );
      const fullName = empRow ? (empRow[2] || '').toString().trim() : '';

      // Append new row: [empId, fullName, '', 'user', '', '', '', '', '', '', joinDate, 'active']
      const newUserRow = [targetEmpId, fullName, '', 'user', '', '', '', '', '', '', joinDate || '', 'active'];
      await appendSheetData('Users', newUserRow);
    } else {
      // Update column K (index 10) of the existing row
      const sheetRowNum = rowIndex + 1; // 1-based
      const colK = 'K';
      await updateSheetData('Users', `${colK}${sheetRowNum}`, [joinDate || '']);
    }

    return NextResponse.json({ message: 'Cập nhật ngày vào thành công', empId, joinDate });
  } catch (error) {
    console.error('Update joinDate error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

// DELETE: Remove an employee row from ChamCong sheet (Admin only)
export async function DELETE(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId } = await request.json();
    if (!empId) return NextResponse.json({ error: 'Thiếu mã NV' }, { status: 400 });

    // Find the row index in ChamCong (1-based)
    const data = await getAllSheetData('ChamCong');
    const rowIndex = data.findIndex(
      (row) => (row[1] || '').toString().trim() === empId
    );

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // rowIndex is 0-based; deleteSheetRow expects 1-based
    await deleteSheetRow('ChamCong', rowIndex + 1);

    return NextResponse.json({ message: 'Đã xoá nhân viên khỏi danh sách', empId });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
