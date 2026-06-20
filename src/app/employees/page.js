'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import styles from './employees.module.css';

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ empId: '', fullName: '', joinDate: '' });
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Join date edit state
  const [editJoinDate, setEditJoinDate] = useState(null); // { empId, joinDate }
  const [savingJoinDate, setSavingJoinDate] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return null; }
      return (await res.json()).user;
    } catch { router.push('/login'); return null; }
  }, [router]);

  const fetchEmployees = useCallback(async (year) => {
    try {
      const res = await fetch(`/api/employees?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        return data.employees || [];
      }
    } catch {}
    return [];
  }, []);

  // Init: fetch user once on mount
  useEffect(() => {
    const init = async () => {
      const userData = await fetchUser();
      if (!userData) return;
      setUser(userData);
      const emps = await fetchEmployees(selectedYear);
      setEmployees(emps);
      setFiltered(emps);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only on mount

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.empId?.toLowerCase().includes(q) ||
      e.fullName?.toLowerCase().includes(q)
    ));
  }, [search, employees]);

  const handleYearChange = async (year) => {
    if (year === selectedYear) return; // no-op
    setSelectedYear(year);
    setLoading(true);
    const emps = await fetchEmployees(year);
    setEmployees(emps);
    setFiltered(emps);
    setLoading(false);
  };

  const handleAddEmployee = async () => {
    if (!newEmp.empId || !newEmp.fullName) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp),
      });
      if (res.ok) {
        const emps = await fetchEmployees(selectedYear);
        setEmployees(emps);
        setFiltered(emps);
        setShowAddModal(false);
        setNewEmp({ empId: '', fullName: '', joinDate: '' });
        alert('Thêm nhân viên thành công!');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi thêm nhân viên');
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJoinDate = async () => {
    if (!editJoinDate) return;
    setSavingJoinDate(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: editJoinDate.empId, joinDate: editJoinDate.joinDate }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e =>
          e.empId === editJoinDate.empId ? { ...e, joinDate: editJoinDate.joinDate } : e
        ));
        setFiltered(prev => prev.map(e =>
          e.empId === editJoinDate.empId ? { ...e, joinDate: editJoinDate.joinDate } : e
        ));
        setEditJoinDate(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật ngày vào');
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSavingJoinDate(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!confirm(`Xác nhận xóa nhân viên "${emp.fullName}" (${emp.empId}) khỏi danh sách chấm công?\n\n⚠️ Hành động này sẽ xóa toàn bộ dữ liệu chấm công của nhân viên này.`)) return;
    try {
      const res = await fetch('/api/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: emp.empId }),
      });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.empId !== emp.empId));
        setFiltered(prev => prev.filter(e => e.empId !== emp.empId));
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa nhân viên');
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    // Try parsing common formats
    const d = new Date(dateStr);
    if (!isNaN(d)) {
      return d.toLocaleDateString('vi-VN');
    }
    return dateStr;
  };

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
              <div>
                <h1 className={styles.pageTitle}>👥 Nhân viên</h1>
                <p className={styles.pageSubtitle}>{filtered.length} / {employees.length} nhân viên</p>
              </div>
              <div className={styles.actions}>
                <input
                  type="text"
                  placeholder="🔍 Tìm theo mã NV hoặc tên..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={styles.searchInput}
                  id="employee-search"
                />
                <div className={styles.yearSelector}>
                  <span className={styles.yearLabel}>📅 Năm:</span>
                  <select
                    className={styles.yearSelect}
                    value={selectedYear}
                    onChange={e => handleYearChange(Number(e.target.value))}
                    id="year-select"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {user?.role === 'admin' && (
                  <button
                    className={styles.addBtn}
                    onClick={() => setShowAddModal(true)}
                    id="add-employee-btn"
                  >
                    + Thêm nhân viên
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#00BCD4' }}></span>
                <span>AL – Nghỉ phép</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#607D8B' }}></span>
                <span>UP – Nghỉ không lương</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#F44336' }}></span>
                <span>SL – Nghỉ ốm</span>
              </div>
              <span className={styles.legendNote}>Tổng ngày nghỉ năm {selectedYear}</span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>STT</th>
                    <th className={styles.th}>Mã NV</th>
                    <th className={styles.th}>Họ và tên</th>
                    <th className={styles.th}>Ngày vào làm</th>
                    <th className={`${styles.th} ${styles.thLeave}`}>AL</th>
                    <th className={`${styles.th} ${styles.thLeave}`}>UP</th>
                    <th className={`${styles.th} ${styles.thLeave}`}>SL</th>
                    {user?.role === 'admin' && (
                      <th className={`${styles.th} ${styles.thDelete}`}>Xoá</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? 8 : 7} className={styles.emptyRow}>
                        Không tìm thấy nhân viên nào
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp, idx) => (
                      <tr key={emp.empId} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td className={styles.td}>{emp.no || idx + 1}</td>
                        <td className={styles.td}>
                          <span className={styles.empIdBadge}>{emp.empId}</span>
                        </td>
                        <td className={styles.td}>{emp.fullName}</td>
                        <td className={styles.td}>
                          <div className={styles.joinDateCell}>
                            <span className={emp.joinDate ? styles.joinDateText : styles.joinDateEmpty}>
                              {formatDate(emp.joinDate)}
                            </span>
                            {user?.role === 'admin' && (
                              <button
                                className={styles.editDateBtn}
                                onClick={() => setEditJoinDate({ empId: emp.empId, joinDate: emp.joinDate || '' })}
                                title="Cập nhật ngày vào"
                                id={`edit-join-${emp.empId}`}
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.leaveBadge} ${styles.leaveBadgeAL}`}>
                            {emp.totalAL ?? 0}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.leaveBadge} ${styles.leaveBadgeUP}`}>
                            {emp.totalUP ?? 0}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.leaveBadge} ${styles.leaveBadgeSL}`}>
                            {emp.totalSL ?? 0}
                          </span>
                        </td>
                        {user?.role === 'admin' && (
                          <td className={`${styles.td} ${styles.tdDelete}`}>
                            <button
                              className={styles.deleteEmpBtn}
                              onClick={() => handleDeleteEmployee(emp)}
                              title={`Xóa ${emp.fullName} khỏi danh sách`}
                              id={`delete-emp-${emp.empId}`}
                            >
                              ×
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className={styles.overlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Thêm nhân viên mới</h2>
            <div className={styles.formGroup}>
              <label>Mã nhân viên</label>
              <input
                type="text"
                placeholder="VD: B5800"
                value={newEmp.empId}
                onChange={e => setNewEmp(p => ({ ...p, empId: e.target.value.toUpperCase() }))}
                className={styles.input}
                id="new-emp-id"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Họ và tên</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={newEmp.fullName}
                onChange={e => setNewEmp(p => ({ ...p, fullName: e.target.value }))}
                className={styles.input}
                id="new-emp-name"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Ngày vào làm</label>
              <input
                type="date"
                value={newEmp.joinDate}
                onChange={e => setNewEmp(p => ({ ...p, joinDate: e.target.value }))}
                className={styles.input}
                id="new-emp-joindate"
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                Huỷ
              </button>
              <button className={styles.saveBtn} onClick={handleAddEmployee} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Thêm nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Join Date Modal */}
      {editJoinDate && (
        <div className={styles.overlay} onClick={() => setEditJoinDate(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>📅 Cập nhật ngày vào làm</h2>
            <p className={styles.modalSubtitle}>
              Nhân viên: <strong className={styles.empHighlight}>{editJoinDate.empId}</strong>
            </p>
            <div className={styles.formGroup}>
              <label>Ngày vào làm</label>
              <input
                type="date"
                value={editJoinDate.joinDate}
                onChange={e => setEditJoinDate(p => ({ ...p, joinDate: e.target.value }))}
                className={styles.input}
                id="edit-join-date-input"
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditJoinDate(null)}>
                Huỷ
              </button>
              <button className={styles.saveBtn} onClick={handleSaveJoinDate} disabled={savingJoinDate}>
                {savingJoinDate ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
