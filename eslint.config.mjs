import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/app/API_*.js",
      "src/app/AdminPage.js",
      "src/app/AdminPage.module.css",
      "src/app/AttendanceGrid.js",
      "src/app/AttendanceGrid.module.css",
      "src/app/AttendancePage.js",
      "src/app/AttendancePage.module.css",
      "src/app/DashboardPage.js",
      "src/app/DashboardPage.module.css",
      "src/app/EmployeeCard.js",
      "src/app/EmployeeCard.module.css",
      "src/app/EmployeesPage.js",
      "src/app/EmployeesPage.module.css",
      "src/app/Header.js",
      "src/app/Header.module.css",
      "src/app/LoginPage.js",
      "src/app/LoginPage.module.css",
      "src/app/Modal.js",
      "src/app/Modal.module.css",
      "src/app/ShiftBadge.js",
      "src/app/ShiftBadge.module.css",
      "src/app/Sidebar.js",
      "src/app/Sidebar.module.css",
      "src/app/StatsCard.js",
      "src/app/StatsCard.module.css",
      "src/app/auth.js",
      "src/app/googleSheets.js",
      "src/app/constants.js",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;

