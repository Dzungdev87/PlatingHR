'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import StatsCard from '../../components/StatsCard';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [yesterdayAttendanceData, setYesterdayAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayDay = yesterday.getDate();
  const yesterdayMonth = yesterday.getMonth() + 1;
  const yesterdayYear = yesterday.getFullYear();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      router.push('/login');
      return null;
    }
  }, [router]);

  const fetchAttendance = useCallback(async (m, y) => {
    try {
      const res = await fetch(`/api/attendance?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        return data.attendance || [];
      }
    } catch {
      return [];
    }
    return [];
  }, []);

  useEffect(() => {
    const init = async () => {
      const userData = await fetchUser();
      if (!userData) return;
      setUser(userData);
      const att = await fetchAttendance(month, year);
      setAttendanceData(att);
      
      if (yesterdayMonth !== month || yesterdayYear !== year) {
        const yatt = await fetchAttendance(yesterdayMonth, yesterdayYear);
        setYesterdayAttendanceData(yatt);
      } else {
        setYesterdayAttendanceData(att);
      }
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchAttendance, month, year, yesterdayMonth, yesterdayYear]);

  const todayStr = today.getDate();
  const stats = {
    totalEmployees: attendanceData.length,
    presentToday: attendanceData.filter(emp => {
      const val = emp.days?.[todayStr - 1];
      return val && !['AL', 'UP', 'SL', 'WL', 'OL'].includes(val);
    }).length,
    onLeave: attendanceData.filter(emp => {
      const val = emp.days?.[todayStr - 1];
      return ['AL', 'UP', 'SL', 'WL', 'OL'].includes(val);
    }).length,
    absent: attendanceData.filter(emp => {
      const val = emp.days?.[todayStr - 1];
      return !val || val === '';
    }).length,
  };

  // Compute weekly attendance for the last 7 days
  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const weekBarData = last7.map(d => {
    const dayNum = d.getDate();
    const dayName = weekDays[d.getDay()];
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
      return { dayName, percent: 0 };
    }
    const present = attendanceData.filter(emp => {
      const val = emp.days?.[dayNum - 1];
      return val && !['AL', 'UP', 'SL', 'WL', 'OL'].includes(val);
    }).length;
    const percent = stats.totalEmployees > 0
      ? Math.round((present / stats.totalEmployees) * 100)
      : 0;
    return { dayName, percent };
  });

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
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>📊 Dashboard</h1>
              <p className={styles.pageSubtitle}>
                Tháng {month}/{year} — {today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className={styles.statsGrid}>
              <StatsCard icon="👥" label="Tổng nhân viên" value={stats.totalEmployees} color="#2196F3" />
              <StatsCard icon="✅" label="Đi làm hôm nay" value={stats.presentToday} color="#4CAF50" />
              <StatsCard icon="📅" label="Đang nghỉ" value={stats.onLeave} color="#00BCD4" />
              <StatsCard icon="❌" label="Chưa chấm công" value={stats.absent} color="#F44336" />
            </div>

            <div className={styles.chartSection}>
              <h2 className={styles.sectionTitle}>📈 Tỷ lệ chuyên cần 7 ngày qua</h2>
              <div className={styles.chart}>
                {weekBarData.map(({ dayName, percent }, i) => (
                  <div key={i} className={styles.barGroup}>
                    <div className={styles.barLabel}>{percent}%</div>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.chartBar}
                        style={{ height: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                    <div className={styles.dayLabel}>{dayName}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.bottomGrid}>
              <div className={styles.shiftSummary}>
                <h2 className={styles.sectionTitle}>🕐 Phân bố ca làm việc hôm qua</h2>
                {['C1', 'C2', 'C3', 'TS', 'X', 'V'].map(shift => {
                  const count = yesterdayAttendanceData.filter(e => e.days?.[yesterdayDay - 1] === shift).length;
                  const colors = { C1: '#4CAF50', C2: '#2196F3', C3: '#9C27B0', TS: '#FF5722', X: '#FF9800', V: '#00897B' };
                  return (
                    <div key={shift} className={styles.shiftRow}>
                      <span className={styles.shiftBadge} style={{ background: colors[shift] }}>{shift}</span>
                      <div className={styles.shiftBar}>
                        <div
                          className={styles.shiftFill}
                          style={{ width: `${yesterdayAttendanceData.length > 0 ? (count / yesterdayAttendanceData.length) * 100 : 0}%`, background: colors[shift] }}
                        />
                      </div>
                      <span className={styles.shiftCount}>{count} người</span>
                    </div>
                  );
                })}
                {(() => {
                  const standardShifts = ['C1', 'C2', 'C3', 'TS', 'X', 'V'];
                  const leaveTypes = ['AL', 'UP', 'SL', 'WL', 'OL'];
                  const customCount = yesterdayAttendanceData.filter(e => {
                    const val = e.days?.[yesterdayDay - 1];
                    return val && !standardShifts.includes(val) && !leaveTypes.includes(val);
                  }).length;
                  
                  if (customCount === 0) return null;
                  
                  return (
                    <div className={styles.shiftRow}>
                      <span className={styles.shiftBadge} style={{ background: '#3f51b5' }}>Khác</span>
                      <div className={styles.shiftBar}>
                        <div
                          className={styles.shiftFill}
                          style={{ width: `${yesterdayAttendanceData.length > 0 ? (customCount / yesterdayAttendanceData.length) * 100 : 0}%`, background: '#3f51b5' }}
                        />
                      </div>
                      <span className={styles.shiftCount}>{customCount} người</span>
                    </div>
                  );
                })()}
              </div>

              <div className={styles.leaveSummary}>
                <h2 className={styles.sectionTitle}>📋 Nghỉ phép hôm nay</h2>
                {['AL', 'UP', 'SL', 'WL', 'OL'].map(leave => {
                  const leaveLabels = { AL: 'Nghỉ phép', UP: 'Không lương', SL: 'Nghỉ ốm', WL: 'Kết hôn', OL: 'Khác' };
                  const leaveColors = { AL: '#00BCD4', UP: '#607D8B', SL: '#F44336', WL: '#E91E63', OL: '#795548' };
                  const count = attendanceData.filter(e => e.days?.[todayStr - 1] === leave).length;
                  if (count === 0) return null;
                  return (
                    <div key={leave} className={styles.leaveRow}>
                      <span className={styles.shiftBadge} style={{ background: leaveColors[leave] }}>{leave}</span>
                      <span className={styles.leaveName}>{leaveLabels[leave]}</span>
                      <span className={styles.leaveCount}>{count} người</span>
                    </div>
                  );
                })}
                {stats.onLeave === 0 && (
                  <p className={styles.noLeave}>✅ Không có ai nghỉ hôm nay</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
