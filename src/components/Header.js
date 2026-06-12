'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header({ user = { fullName: 'Guest', role: 'user' } }) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.title}>PLATING HR</h1>

        <div className={styles.userSection}>
          <button
            className={styles.userButton}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className={styles.avatar}>👤</span>
            <div className={styles.userInfo}>
              <div className={styles.name}>{user.fullName}</div>
              <div className={styles.role}>{user.role === 'admin' ? 'Admin' : 'Leader'}</div>
            </div>
            <span className={styles.dropdown}>▼</span>
          </button>

          {showDropdown && (
            <div className={styles.dropdownMenu}>
              <button className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                Đổi mật khẩu
              </button>
              <hr />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
