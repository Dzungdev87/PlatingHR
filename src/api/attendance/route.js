// API Route: GET /api/attendance, PUT /api/attendance
// This file should be placed at: src/api/attendance/route.js

import { NextResponse } from 'next/server';
import { getAllSheetData, updateCell } from '../../../lib/googleSheets';
import { verifyToken, canEditAttendanceForDate } from '../../../lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { month, year } = Object.fromEntries(new URL(request.url).searchParams);

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Get attendance data from ChamCong sheet
    const data = await getAllSheetData('ChamCong');

    if (!data || data.length === 0) {
      return NextResponse.json({ attendance: [] });
    }

    // Format attendance data
    const attendance = data.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      empId: row[1], // Column B
      fullName: row[2], // Column C
      days: row.slice(3, 33), // Columns D-AG (30 days)
    }));

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { empId, day, month, year, value } = await request.json();

    if (!empId || !day || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has permission to edit this date
    const targetDate = new Date(year, month - 1, day);
    if (!canEditAttendanceForDate(user.role, targetDate)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this date' },
        { status: 403 }
      );
    }

    // Get all data to find the correct row and column
    const data = await getAllSheetData('ChamCong');
    const rowIndex = data.findIndex((row) => row[1] === empId);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate column: D = day 1, E = day 2, ... AG = day 30
    const col = String.fromCharCode(68 + (day - 1)); // 68 = 'D'
    const cellAddress = `${col}${rowIndex + 1}`;

    // Update the cell
    await updateCell('ChamCong', cellAddress, value);

    return NextResponse.json({
      message: 'Attendance updated successfully',
      empId,
      day,
      value,
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
