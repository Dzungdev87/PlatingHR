// API Route: GET /api/admin/users, POST /api/admin/users, etc.
// This file should be placed at: src/api/admin/route.js

import { NextResponse } from 'next/server';
import { getAllSheetData, appendSheetData, updateSheetData, deleteSheetRow } from '../../../lib/googleSheets';
import { verifyToken, hashPassword } from '../../../lib/auth';
import { DEFAULT_PASSWORDS } from '../../../lib/constants';

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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get users from Users sheet
    const usersData = await getAllSheetData('Users');

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Format user data (skip header)
    const users = usersData.slice(1).map((row) => ({
      empId: row[0], // Column A
      fullName: row[1], // Column B
      role: row[3], // Column D
      status: row[11], // Column L
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
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

    const { empId, fullName, role = 'leader' } = await request.json();

    if (!empId || !fullName) {
      return NextResponse.json(
        { error: 'Employee ID and name are required' },
        { status: 400 }
      );
    }

    // Hash default password
    const defaultPassword = role === 'admin' ? DEFAULT_PASSWORDS.ADMIN : DEFAULT_PASSWORDS.LEADER;
    const passwordHash = await hashPassword(defaultPassword);

    // Add new user
    const newUser = [empId, fullName, passwordHash, role, '', '', '', '', 'Plating', '', '', 'active'];
    await appendSheetData('Users', newUser);

    return NextResponse.json({
      message: 'User added successfully',
      user: { empId, fullName, role },
    });
  } catch (error) {
    console.error('Add user error:', error);
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { empId, role, resetPassword = false } = await request.json();

    if (!empId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const usersData = await getAllSheetData('Users');
    const rowIndex = usersData.findIndex((row) => row[0] === empId);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = [...usersData[rowIndex]];

    if (role) {
      userData[3] = role;
    }

    if (resetPassword) {
      const defaultPassword = role === 'admin' ? DEFAULT_PASSWORDS.ADMIN : DEFAULT_PASSWORDS.LEADER;
      userData[2] = await hashPassword(defaultPassword);
    }

    // Update user row
    const cellStart = `A${rowIndex + 1}`;
    await updateSheetData('Users', cellStart, userData);

    return NextResponse.json({
      message: 'User updated successfully',
      empId,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
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

    const { empId } = await request.json();

    if (!empId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const usersData = await getAllSheetData('Users');
    const rowIndex = usersData.findIndex((row) => row[0] === empId);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user row
    await deleteSheetRow('Users', rowIndex + 1);

    return NextResponse.json({
      message: 'User deleted successfully',
      empId,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
