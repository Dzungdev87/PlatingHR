// Shift Types - Loại ca làm việc
export const SHIFT_TYPES = {
  C1: { label: 'Ca ngày 8h', hours: 8, type: 'day', color: '#4CAF50' },
  C2: { label: 'Ca ngày 8h', hours: 8, type: 'day', color: '#2196F3' },
  C3: { label: 'Ca đêm 8h', hours: 8, type: 'night', color: '#9C27B0' },
  TS: { label: 'Ca đêm 12h', hours: 12, type: 'night', color: '#FF5722' },
  X:  { label: 'Ca ngày 12h', hours: 12, type: 'day', color: '#FF9800' },
  V:  { label: 'Ca ngày 8h', hours: 8, type: 'day', color: '#00897B' },
};

// Leave Types - Loại nghỉ
export const LEAVE_TYPES = {
  AL: { label: 'Nghỉ phép', color: '#00BCD4' },
  UP: { label: 'Nghỉ không lương', color: '#607D8B' },
  SL: { label: 'Nghỉ ốm', color: '#F44336' },
  WL: { label: 'Nghỉ kết hôn', color: '#E91E63' },
  OL: { label: 'Nghỉ khác', color: '#795548' },
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  LEADER: 'leader',
};

// Default Passwords
export const DEFAULT_PASSWORDS = {
  LEADER: '123',
  ADMIN: '123456',
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  ON_LEAVE: 'leave',
};

// Google Sheets Configuration
export const SHEETS_CONFIG = {
  MAIN_SHEET: 'ChamCong',
  USERS_SHEET: 'Users',
  CONFIG_SHEET: 'Config',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
};

// Column Mappings
export const COLUMN_MAP = {
  CHAMCONG: {
    NO: 'A',
    EMP_ID: 'B',
    FULL_NAME: 'C',
    DATES_START: 'D', // Column D starts with day 1
  },
  USERS: {
    EMP_ID: 'A',
    FULL_NAME: 'B',
    PASSWORD: 'C',
    ROLE: 'D',
    SHIFT: 'E',
    TEAM: 'F',
    EMAIL: 'G',
    PHONE: 'H',
    DEPARTMENT: 'I',
    POSITION: 'J',
    JOIN_DATE: 'K',
    STATUS: 'L',
  },
};

// Permissions
export const PERMISSIONS = {
  LEADER: {
    canViewDashboard: true,
    canViewAttendance: true,
    canViewEmployees: true,
    canEditAttendanceToday: true,
    canEditAttendanceAnyDay: false,
    canEditAttendanceAnyEmployee: true,
    canManageEmployees: false,
    canManageUsers: false,
    canViewReports: false,
    canAccessAdmin: false,
  },
  ADMIN: {
    canViewDashboard: true,
    canViewAttendance: true,
    canViewEmployees: true,
    canEditAttendanceToday: true,
    canEditAttendanceAnyDay: true,
    canEditAttendanceAnyEmployee: true,
    canManageEmployees: true,
    canManageUsers: true,
    canViewReports: true,
    canAccessAdmin: true,
  },
};
