import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, decodeJwt } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Hash password using bcrypt
export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password against hash
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export async function generateToken(user) {
  const token = await new SignJWT({
    empId: user.empId,
    fullName: user.fullName,
    role: user.role,
    shift: user.shift || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

// Verify and decode JWT token
export async function verifyToken(token) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}

// Decode token without verification (use with caution)
export function decodeToken(token) {
  try {
    const decoded = decodeJwt(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Check if user can edit attendance for a specific date
export function canEditAttendanceForDate(userRole, targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  if (userRole === 'admin') {
    return true; // Admin can edit any day
  }

  if (userRole === 'leader') {
    // Leader can only edit today and yesterday
    return target.getTime() === today.getTime() || target.getTime() === yesterday.getTime();
  }

  return false;
}
