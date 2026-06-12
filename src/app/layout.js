import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "PLATING HR - Quản lý nhân sự & chấm công",
  description: "Ứng dụng quản lý nhân sự và chấm công cho bộ phận Plating. Hỗ trợ phân quyền Leader/Admin.",
  keywords: ["plating", "HR", "chấm công", "nhân sự", "quản lý"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <div id="__next">
          {children}
        </div>
      </body>
    </html>
  );
}
