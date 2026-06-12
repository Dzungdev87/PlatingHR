import { NextResponse } from 'next/server';
import { getAllSheetData, appendSheetData, updateSheetData, deleteSheetRow } from '@/lib/googleSheets';
import { verifyToken, hashPassword } from '@/lib/auth';
import { DEFAULT_PASSWORDS } from '@/lib/constants';

export async function GET(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    // Get users from Users sheet
    const usersData = await getAllSheetData('Users');

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Format user data (skip header if present)
    const dataRows = usersData[0][0] === 'empId' ? usersData.slice(1) : usersData;
    const users = dataRows
      .filter(row => row[0])
      .map((row) => ({
        empId: row[0],    // Column A
        fullName: row[1], // Column B
        role: row[3],     // Column D
        shift: row[4] || '',
        status: row[11] || 'active', // Column L
      }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId, fullName, role = 'leader', shift = '' } = await request.json();

    if (!empId || !fullName) {
      return NextResponse.json({ error: 'Mã NV và tên là bắt buộc' }, { status: 400 });
    }

    // Hash default password
    const defaultPassword = role === 'admin' ? DEFAULT_PASSWORDS.ADMIN : DEFAULT_PASSWORDS.LEADER;
    const passwordHash = await hashPassword(defaultPassword);

    // Add new user: empId, fullName, password, role, shift, team, email, phone, department, position, joinDate, status
    const newUser = [empId, fullName, passwordHash, role, shift, '', '', '', 'Plating', '', new Date().toISOString().split('T')[0], 'active'];
    await appendSheetData('Users', newUser);

    return NextResponse.json({
      message: 'Thêm tài khoản thành công',
      user: { empId, fullName, role },
    });
  } catch (error) {
    console.error('Add user error:', error);
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId, role, status, resetPassword = false } = await request.json();

    if (!empId) {
      return NextResponse.json({ error: 'Mã NV là bắt buộc' }, { status: 400 });
    }

    const usersData = await getAllSheetData('Users');
    const dataRows = usersData[0][0] === 'empId' ? usersData.slice(1) : usersData;
    const rowIndex = dataRows.findIndex((row) => row[0] === empId);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const userData = [...dataRows[rowIndex]];

    if (role) userData[3] = role;
    if (status) userData[11] = status;

    if (resetPassword) {
      const newRole = role || userData[3];
      const defaultPassword = newRole === 'admin' ? DEFAULT_PASSWORDS.ADMIN : DEFAULT_PASSWORDS.LEADER;
      userData[2] = await hashPassword(defaultPassword);
    }

    // Update user row (account for header offset)
    const headerOffset = usersData[0][0] === 'empId' ? 2 : 1;
    const cellStart = `A${rowIndex + headerOffset}`;
    await updateSheetData('Users', cellStart, userData);

    return NextResponse.json({ message: 'Cập nhật tài khoản thành công', empId });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yêu cầu quyền Admin' }, { status: 403 });
    }

    const { empId } = await request.json();

    if (!empId) {
      return NextResponse.json({ error: 'Mã NV là bắt buộc' }, { status: 400 });
    }

    const usersData = await getAllSheetData('Users');
    const dataRows = usersData[0][0] === 'empId' ? usersData.slice(1) : usersData;
    const rowIndex = dataRows.findIndex((row) => row[0] === empId);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const headerOffset = usersData[0][0] === 'empId' ? 2 : 1;
    await deleteSheetRow('Users', rowIndex + headerOffset);

    return NextResponse.json({ message: 'Xóa tài khoản thành công', empId });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
