import { NextResponse } from 'next/server';
import { getAllSheetData } from '@/lib/googleSheets';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { empId, password } = await request.json();

    if (!empId || !password) {
      return NextResponse.json(
        { error: 'Mã nhân viên và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Get users from Google Sheets - Users sheet
    const usersData = await getAllSheetData('Users');

    if (!usersData || usersData.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 401 }
      );
    }

    // Find user by empId (column A = index 0), skip header row
    const dataRows = usersData[0][0] === 'empId' ? usersData.slice(1) : usersData;
    const userRow = dataRows.find((row) => row[0] === empId);

    if (!userRow) {
      return NextResponse.json(
        { error: 'Mã nhân viên không tồn tại' },
        { status: 401 }
      );
    }

    // Verify password (column C = index 2)
    const passwordHash = userRow[2];
    const isPasswordValid = await verifyPassword(password, passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Mật khẩu không đúng' },
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
        shift: user.shift,
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
      { error: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}
