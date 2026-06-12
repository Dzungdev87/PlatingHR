'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

const iconMap = {
  dashboard: '📊',
  employees: '👥',
  attendance: '📅',
  admin: '⚙️',
  logout: '🚪',
};

export default function Sidebar({ userRole = 'leader' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('dashboard')) setCurrentPage('dashboard');
    else if (path.includes('employees')) setCurrentPage('employees');
    else if (path.includes('attendance')) setCurrentPage('attendance');
    else if (path.includes('admin')) setCurrentPage('admin');
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard', visible: true },
    { id: 'attendance', label: 'Chấm công', icon: 'attendance', path: '/attendance', visible: true },
    { id: 'employees', label: 'Nhân viên', icon: 'employees', path: '/employees', visible: true },
    { id: 'admin', label: 'Quản lý', icon: 'admin', path: '/admin', visible: userRole === 'admin' },
  ];

  const handleNavigation = (path) => {
    router.push(path);
    setCurrentPage(path.replace('/', ''));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/login');
    }
  };

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
      <button className={styles.toggleBtn} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '☰' : '≡'}
      </button>

      <div className={styles.logo}>{isOpen && '🏭 PLATING HR'}</div>

      <nav className={styles.menu}>
        {menuItems
          .filter((item) => item.visible)
          .map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${currentPage === item.id ? styles.active : ''}`}
              onClick={() => handleNavigation(item.path)}
              title={item.label}
            >
              <span className={styles.icon}>{iconMap[item.icon]}</span>
              {isOpen && <span className={styles.label}>{item.label}</span>}
            </button>
          ))}
      </nav>

      <button className={`${styles.menuItem} ${styles.logout}`} onClick={handleLogout} title="Đăng xuất">
        <span className={styles.icon}>{iconMap.logout}</span>
        {isOpen && <span className={styles.label}>Đăng xuất</span>}
      </button>
    </aside>
  );
}
