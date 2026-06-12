// API Route: GET /api/employees, POST /api/employees
// This file should be placed at: src/api/employees/route.js

import { NextResponse } from 'next/server';
import { getAllSheetData, appendSheetData, updateSheetData } from '../../../lib/googleSheets';
import { verifyToken } from '../../../lib/auth';

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

    // Get employees from the main ChamCong sheet
    const data = await getAllSheetData('ChamCong');

    if (!data || data.length === 0) {
      return NextResponse.json({ employees: [] });
    }

    // Format employee data (skip header row)
    const employees = data.slice(1).map((row) => ({
      no: row[0], // Column A
      empId: row[1], // Column B
      fullName: row[2], // Column C
    }));

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { empId, fullName } = await request.json();

    if (!empId || !fullName) {
      return NextResponse.json(
        { error: 'Employee ID and name are required' },
        { status: 400 }
      );
    }

    // Add new employee to ChamCong sheet
    const newRow = [data.length, empId, fullName, ...Array(30).fill('')];
    await appendSheetData('ChamCong', newRow);

    return NextResponse.json({
      message: 'Employee added successfully',
      employee: { empId, fullName },
    });
  } catch (error) {
    console.error('Add employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
