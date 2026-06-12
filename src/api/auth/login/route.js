// API Route: POST /api/auth/login
// This file should be placed at: src/api/auth/login/route.js

import { NextResponse } from 'next/server';
import { getAllSheetData } from '../../../lib/googleSheets';
import { verifyPassword, generateToken } from '../../../lib/auth';

export async function POST(request) {
  try {
    const { empId, password } = await request.json();

    if (!empId || !password) {
      return NextResponse.json(
        { error: 'Employee ID and password are required' },
        { status: 400 }
      );
    }

    // Get users from Google Sheets - Users sheet
    const usersData = await getAllSheetData('Users');

    if (!usersData || usersData.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Find user by empId (column A = index 0)
    const userRow = usersData.find((row) => row[0] === empId);

    if (!userRow) {
      return NextResponse.json(
        { error: 'Invalid employee ID' },
        { status: 401 }
      );
    }

    // Verify password (column C = index 2)
    const passwordHash = userRow[2];
    const isPasswordValid = await verifyPassword(password, passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const user = {
      empId: userRow[0],
      fullName: userRow[1],
      role: userRow[3], // column D = index 3
      shift: userRow[4] || null, // column E = index 4
    };

    const token = await generateToken(user);

    // Set httpOnly cookie
    const response = NextResponse.json({
      token,
      user: {
        empId: user.empId,
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
