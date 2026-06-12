# PLATING HR - Quản lý Nhân Sự & Chấm Công

A modern web application for managing employees and attendance in the Plating Department, built with Next.js 14 and Google Sheets API.

## 🎯 Features

### Authentication & Authorization
- Login with Employee ID & Password
- Role-based access control (Leader/Admin)
- JWT token authentication with secure httpOnly cookies
- Auto-logout on token expiration

### Dashboard
- Department statistics (total employees, present, on leave, absent)
- Weekly attendance charts
- Activity feed showing recent changes
- Role-specific dashboards

### Employee Management
- View employee list with detailed information
- Search and filter by name/ID and status
- Admin: Add/Edit/Delete employees
- Employee cards with shift assignments

### Attendance Management
- Interactive attendance grid (30 days per month)
- Color-coded shift and leave types
- Leader: Edit today & yesterday (own shift employees)
- Admin: Edit any date for any employee
- Dropdown selector for shift/leave types
- Clear/remove attendance entries

### Admin Panel
- User account management
- Password reset functionality
- Role assignment and modification
- System configuration options

## 🚀 Quick Start

### 1. Setup Project
```bash
# Create directories and organize files
npm run setup
```

### 2. Verify Project Structure
```bash
npm run verify
```

### 3. Configure Environment
Edit `.env.local` with your Google Sheets credentials:
```env
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
JWT_SECRET=your_secret_key_here
```

### 4. Create Google Sheets Structure
Create three sheets in your Google Spreadsheet:

**Sheet 1: "ChamCong"** (Attendance)
- A: STT (Number)
- B: Mã NV (Employee ID)
- C: Họ tên (Full Name)
- D-AG: Days 1-30 (shift codes or leave types)

**Sheet 2: "Users"** (User Management)
- A: empId
- B: fullName
- C: password (hashed)
- D: role (admin/leader)
- E: shift
- F: team
- G: email
- H: phone
- I: department
- J: position
- K: joinDate
- L: status (active/inactive)

**Sheet 3: "Config"** (System Configuration)
- A: key (configuration name)
- B: value (configuration value)

### 5. Install Dependencies
```bash
npm install
```

### 6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Default Credentials

| Role | Employee ID | Password |
|------|-------------|----------|
| Leader | Any in Users sheet | 123 |
| Admin | Any in Users sheet | 123456 |

> ⚠️ Change these passwords after initial login!

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Home/redirect
│   ├── globals.css            # Global styles
│   ├── login/                 # Login page
│   ├── dashboard/             # Dashboard page
│   ├── employees/             # Employee list
│   ├── attendance/            # Attendance grid
│   └── admin/                 # Admin panel
├── api/
│   ├── auth/                  # Auth endpoints
│   ├── employees/             # Employee API
│   ├── attendance/            # Attendance API
│   └── admin/                 # Admin API
├── components/                # Reusable components
│   ├── Sidebar.js
│   ├── Header.js
│   ├── Modal.js
│   ├── AttendanceGrid.js
│   └── ...
└── lib/                       # Utilities
    ├── constants.js
    ├── auth.js
    └── googleSheets.js
```

## 🎨 Design Features

- **Dark Mode**: Sleek dark theme with blue accents (#2196F3)
- **Glassmorphism**: Modern frosted glass effects on cards
- **Responsive**: Mobile, tablet, and desktop support
- **Smooth Animations**: Fade, slide, and hover effects
- **Accessible**: Color-coded badges for shift types
- **User-Friendly**: Clear navigation and intuitive controls

## 📊 Shift & Leave Types

### Shift Types
| Code | Description | Hours |
|------|-------------|-------|
| C1 | Ca ngày (Day shift) | 8h |
| C2 | Ca ngày (Day shift) | 8h |
| C3 | Ca đêm (Night shift) | 8h |
| TS | Ca đêm (Night shift) | 12h |
| X | Ca ngày (Day shift) | 12h |

### Leave Types
| Code | Description |
|------|-------------|
| AL | Nghỉ phép (Annual Leave) |
| UP | Nghỉ không lương (Unpaid Leave) |
| SL | Nghỉ ốm (Sick Leave) |
| WL | Nghỉ kết hôn (Wedding Leave) |
| OL | Nghỉ khác (Other Leave) |

## 🔑 Permission Model

### Leader Permissions
- View dashboard (own shift statistics)
- View employee list
- View attendance grid
- **Edit attendance**: Today & yesterday only
- **Edit employees**: Only those in own shift
- Cannot access admin panel

### Admin Permissions
- View full dashboard with all statistics
- Manage employee list (add/edit/delete)
- **Edit attendance**: Any date, any employee
- **Manage users**: Add/edit/delete accounts
- Reset user passwords
- System configuration
- Full access to admin panel

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - Login with empId & password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Check authentication status

### Employees
- `GET /api/employees` - Fetch employee list
- `POST /api/employees` - Add new employee (admin only)

### Attendance
- `GET /api/attendance` - Fetch attendance records
- `PUT /api/attendance` - Update attendance (with permission checks)

### Admin
- `GET /api/admin` - Get user list (admin only)
- `POST /api/admin` - Create new user (admin only)
- `PUT /api/admin` - Update user (admin only)
- `DELETE /api/admin` - Delete user (admin only)

## 🔒 Security

- ✅ Password hashing with bcryptjs
- ✅ JWT authentication with secure tokens
- ✅ HTTP-only cookies (no XSS vulnerability)
- ✅ Role-based access control
- ✅ Date-based permission checking
- ✅ Environment variable protection

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) |
| **Styling** | CSS Modules + Vanilla CSS |
| **State** | React Hooks (useState, useEffect) |
| **Auth** | JWT (jose) + bcryptjs |
| **Database** | Google Sheets API v4 |
| **Server** | Node.js |
| **Font** | Inter (Google Fonts) |

## 🚀 Deployment

### Deploy to Vercel (Recommended)
```bash
npm run build
# Connect to Vercel and push to GitHub
```

### Environment Variables in Vercel
Add these to your Vercel project settings:
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `JWT_SECRET`

### Deploy to Other Platforms
```bash
npm run build
npm start
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | Create directories & organize files |
| `npm run verify` | Verify project structure |
| `npm run dev` | Run development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## 🐛 Troubleshooting

### Directory Creation Issues
If directories don't create properly:
```bash
node setup-dirs.js
node full-organize.js
```

### Google Sheets API Errors
1. Verify service account has Sheets API enabled
2. Check GOOGLE_SHEETS_ID matches your spreadsheet
3. Ensure private key is correctly formatted (with \n for newlines)

### Import Errors After Organization
Run the complete organization script:
```bash
node full-organize.js
```

### Login Issues
1. Check "Users" sheet exists and has correct structure
2. Verify password is hashed (or matches default passwords)
3. Check JWT_SECRET is configured in .env.local

## 📚 Documentation

- **[BUILD_COMPLETE.md](BUILD_COMPLETE.md)** - Build status and features
- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[plan.md](plan.md)** - Original specification

## 📧 Contact & Support

For issues or questions:
1. Check the troubleshooting section
2. Review the documentation files
3. Check Google Sheets API documentation

## 📄 License

This project is proprietary and designed for the Plating Department.

---

**Built with ❤️ using Next.js 14**

Last Updated: 2024

