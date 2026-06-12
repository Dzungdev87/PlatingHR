'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import AttendanceGrid from '../../components/AttendanceGrid';
import styles from './attendance.module.css';

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return null; }
      return (await res.json()).user;
    } catch { router.push('/login'); return null; }
  }, [router]);

  const fetchData = useCallback(async (m, y) => {
    try {
      const [empRes, attRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?month=${m}&year=${y}`),
      ]);

      const empData = empRes.ok ? await empRes.json() : { employees: [] };
      const attData = attRes.ok ? await attRes.json() : { attendance: [] };

      setEmployees(empData.employees || []);

      // Convert attendance array to lookup map: { "empId-day": value }
      const attMap = {};
      (attData.attendance || []).forEach(row => {
        (row.days || []).forEach((val, idx) => {
          if (val) attMap[`${row.empId}-${idx + 1}`] = val;
        });
      });
      setAttendanceData(attMap);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const userData = await fetchUser();
      if (!userData) return;
      setUser(userData);
      await fetchData(month, year);
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchData, month, year]);

  const handleAttendanceUpdate = (empId, day, value) => {
    const key = `${empId}-${day}`;
    setAttendanceData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, attendanceData }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Lỗi khi lưu bảng chấm công');
        await fetchData(month, year);
      } else {
        setHasChanges(false);
        alert('Lưu dữ liệu chấm công thành công!');
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleMonthChange = (newMonth) => {
    if (hasChanges) {
      const confirmLeave = window.confirm('Bạn có thay đổi chưa lưu. Bạn có muốn đổi tháng mà không lưu không?');
      if (!confirmLeave) return;
    }
    setMonth(newMonth);
    setHasChanges(false);
  };

  const handleYearChange = (newYear) => {
    if (hasChanges) {
      const confirmLeave = window.confirm('Bạn có thay đổi chưa lưu. Bạn có muốn đổi năm mà không lưu không?');
      if (!confirmLeave) return;
    }
    setYear(newYear);
    setHasChanges(false);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Call server-side export API — returns the .xlsx file as a download
      const url = `/api/attendance/export?month=${month}&year=${year}`;

      // Use fetch to check if the request succeeds first
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Lỗi xuất Excel: ' + (err.error || res.statusText));
        return;
      }

      // Get the binary blob and trigger browser download
      const blob = await res.blob();
      const fileName = `ChamCong_T${String(month).padStart(2, '0')}_${year}.xlsx`;
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('Lỗi kết nối khi xuất Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <div>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar userRole={user?.role} />
      <div className={styles.content}>
        <Header user={user} />

        <main className={styles.main}>
          <div className={styles.container}>

            {/* ── Page Header ── */}
            <div className={styles.pageHeader}>
              <div className={styles.titleRow}>
                <h1 className={styles.pageTitle}>📅 Chấm công</h1>
                {saving && <span className={styles.savingBadge}>💾 Đang lưu...</span>}
              </div>

              <div className={styles.headerRight}>
                {/* Month / Year controls */}
                <div className={styles.controls}>
                  <label className={styles.controlLabel}>
                    <span>Tháng:</span>
                    <select
                      value={month}
                      onChange={(e) => handleMonthChange(Number(e.target.value))}
                      className={styles.select}
                    >
                      {monthNames.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{name}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.controlLabel}>
                    <span>Năm:</span>
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className={styles.select}
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Save button */}
                <button
                  id="save-attendance-btn"
                  className={[styles.saveBtn, hasChanges ? styles.hasChanges : ''].join(' ')}
                  onClick={handleSaveAttendance}
                  disabled={saving || employees.length === 0}
                  title="Lưu toàn bộ thay đổi chấm công hiện tại vào Google Sheets"
                >
                  <span className={styles.saveIcon}>{saving ? '⏳' : '💾'}</span>
                  <span className={styles.saveText}>
                    {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
                  </span>
                </button>

                {/* Export button */}
                <button
                  id="export-excel-btn"
                  className={styles.exportBtn}
                  onClick={handleExportExcel}
                  disabled={exporting || employees.length === 0}
                  title={`Xuất bảng chấm công tháng ${month}/${year} ra file Excel`}
                >
                  {exporting ? (
                    <span className={styles.exportSpinner}>⏳</span>
                  ) : (
                    <span className={styles.exportIcon}>📊</span>
                  )}
                  <span className={styles.exportText}>
                    {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                  </span>
                  <span className={styles.exportBadge}>A4</span>
                </button>
              </div>
            </div>

            {/* ── Legend ── */}
            <div className={styles.legend}>
              {[
                { code: 'C1', label: 'Ca 1 (8h)', color: '#4CAF50' },
                { code: 'C2', label: 'Ca 2 (8h)', color: '#2196F3' },
                { code: 'C3', label: 'Ca 3 đêm (8h)', color: '#9C27B0' },
                { code: 'TS', label: 'Ca đêm (12h)', color: '#FF5722' },
                { code: 'X',  label: 'Ca ngày (12h)', color: '#FF9800' },
                { code: 'V',  label: 'Ca V (8h)', color: '#00897B' },
                { code: 'AL', label: 'Nghỉ phép', color: '#00BCD4' },
                { code: 'UP', label: 'Không lương', color: '#607D8B' },
                { code: 'SL', label: 'Nghỉ ốm', color: '#F44336' },
                { code: 'WL', label: 'Kết hôn', color: '#E91E63' },
                { code: 'OL', label: 'Khác', color: '#795548' },
              ].map(({ code, label, color }) => (
                <div key={code} className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: color }} />
                  <span className={styles.legendCode}>{code}</span>
                  <span className={styles.legendLabel}>{label}</span>
                </div>
              ))}
            </div>

            {/* ── Attendance Grid ── */}
            <AttendanceGrid
              month={month}
              year={year}
              userRole={user?.role}
              employees={employees}
              attendanceData={attendanceData}
              onUpdate={handleAttendanceUpdate}
            />

            {/* ── Help + Export hint ── */}
            <div className={styles.helpBox}>
              <p>💡 <strong>Hướng dẫn:</strong></p>
              <ul>
                <li>Click vào ô để chấm công hoặc chọn loại nghỉ</li>
                {user?.role === 'leader'
                  ? <li>Leader chỉ có thể chấm công cho hôm nay và hôm qua</li>
                  : <li>Admin có thể chấm công cho bất kỳ ngày nào</li>
                }
                <li>Ô có khóa 🔒 là ô không được phép chỉnh sửa</li>
                <li>
                  Nhấn <strong>📊 Xuất Excel</strong> để tải file <code>.xlsx</code> —
                  mở Excel rồi in ra <strong>giấy A4 nằm ngang</strong>, scale tự động vừa trang
                </li>
              </ul>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
