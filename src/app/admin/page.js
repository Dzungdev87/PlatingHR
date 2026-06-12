'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({ empId: '', fullName: '', role: 'leader', shift: '' });
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return null; }
      const data = await res.json();
      if (data.user?.role !== 'admin') { router.push('/dashboard'); return null; }
      return data.user;
    } catch { router.push('/login'); return null; }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin');
      if (res.ok) return (await res.json()).users || [];
    } catch {}
    return [];
  }, []);

  useEffect(() => {
    const init = async () => {
      const userData = await fetchUser();
      if (!userData) return;
      setUser(userData);
      setUsers(await fetchUsers());
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchUsers]);

  const handleAddUser = async () => {
    if (!newUser.empId || !newUser.fullName) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setUsers(await fetchUsers());
        setShowModal(false);
        setNewUser({ empId: '', fullName: '', role: 'leader', shift: '' });
        alert('Thêm tài khoản thành công!');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi thêm tài khoản');
      }
    } catch { alert('Lỗi kết nối máy chủ'); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async (empId, role) => {
    if (!confirm(`Reset mật khẩu của ${empId}?`)) return;
    setActionLoading(empId);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId, resetPassword: true, role }),
      });
      if (res.ok) {
        alert(`Đã reset mật khẩu về mặc định cho ${empId}. Vui lòng thông báo cho người dùng.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi reset mật khẩu');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (empId) => {
    if (!confirm(`Xoá tài khoản ${empId}? Hành động này không thể hoàn tác.`)) return;
    setActionLoading(empId);
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.empId !== empId));
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xoá tài khoản');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setActionLoading(null); }
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
                <h1 className={styles.pageTitle}>⚙️ Quản lý tài khoản</h1>
                <p className={styles.pageSubtitle}>{users.length} tài khoản trong hệ thống</p>
              </div>
              <button className={styles.addBtn} onClick={() => setShowModal(true)} id="add-user-btn">
                + Thêm tài khoản
              </button>
            </div>


            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Mã NV</th>
                    <th className={styles.th}>Họ tên</th>
                    <th className={styles.th}>Vai trò</th>
                    <th className={styles.th}>Ca</th>
                    <th className={styles.th}>Trạng thái</th>
                    <th className={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyRow}>Chưa có tài khoản nào</td></tr>
                  ) : (
                    users.map((u, idx) => (
                      <tr key={u.empId} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td className={styles.td}>
                          <span className={styles.empIdBadge}>{u.empId}</span>
                        </td>
                        <td className={styles.td}>{u.fullName}</td>
                        <td className={styles.td}>
                          <span className={u.role === 'admin' ? styles.adminBadge : styles.leaderBadge}>
                            {u.role === 'admin' ? '👑 Admin' : '👤 Leader'}
                          </span>
                        </td>
                        <td className={styles.td}>{u.shift || '—'}</td>
                        <td className={styles.td}>
                          <span className={u.status === 'active' ? styles.activeBadge : styles.inactiveBadge}>
                            {u.status === 'active' ? '✅ Hoạt động' : '🔴 Vô hiệu'}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.resetBtn}
                              onClick={() => handleResetPassword(u.empId, u.role)}
                              disabled={actionLoading === u.empId}
                              title="Reset mật khẩu về mặc định"
                            >
                              🔄 Reset MK
                            </button>
                            {u.empId !== user?.empId && (
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteUser(u.empId)}
                                disabled={actionLoading === u.empId}
                                title="Xoá tài khoản"
                              >
                                🗑 Xoá
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Thêm tài khoản mới</h2>
            {[
              { id: 'new-user-empid', label: 'Mã nhân viên', key: 'empId', placeholder: 'VD: B5800', transform: v => v.toUpperCase() },
              { id: 'new-user-name', label: 'Họ và tên', key: 'fullName', placeholder: 'Nguyễn Văn A' },
              { id: 'new-user-shift', label: 'Ca làm việc', key: 'shift', placeholder: 'VD: C1, C2...' },
            ].map(({ id, label, key, placeholder, transform }) => (
              <div key={key} className={styles.formGroup}>
                <label>{label}</label>
                <input
                  id={id}
                  type="text"
                  placeholder={placeholder}
                  value={newUser[key]}
                  onChange={e => setNewUser(p => ({ ...p, [key]: transform ? transform(e.target.value) : e.target.value }))}
                  className={styles.input}
                />
              </div>
            ))}
            <div className={styles.formGroup}>
              <label>Vai trò</label>
              <select
                id="new-user-role"
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className={styles.select}
              >
                <option value="leader">👤 Leader (Tổ trưởng)</option>
                <option value="admin">👑 Admin (Quản trị viên)</option>
              </select>
            </div>
            <p className={styles.defaultPwHint}>
              Mật khẩu mặc định sẽ được đặt tự động. Vui lòng đổi sau lần đăng nhập đầu tiên.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Huỷ</button>
              <button className={styles.saveBtn} onClick={handleAddUser} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Thêm tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
