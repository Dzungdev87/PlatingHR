'use client';

import { useEffect } from 'react';
import styles from './Modal.module.css';

export default function Modal({ isOpen, title, onClose, onSubmit, children }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>{children}</div>
        {onSubmit && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>Huỷ</button>
            <button className={styles.submitBtn} onClick={onSubmit}>Lưu</button>
          </div>
        )}
      </div>
    </div>
  );
}
