import styles from './EmployeeCard.module.css';

export default function EmployeeCard({ employee, onEdit, onDelete }) {
  const shiftColors = {
    C1: '#4CAF50',
    C2: '#2196F3',
    C3: '#9C27B0',
    TS: '#FF5722',
    X: '#FF9800',
  };

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {employee.fullName?.charAt(0) || '?'}
      </div>
      <div className={styles.info}>
        <div className={styles.empId}>{employee.empId}</div>
        <div className={styles.name}>{employee.fullName}</div>
        {employee.shift && (
          <span
            className={styles.shift}
            style={{ backgroundColor: shiftColors[employee.shift] || '#666' }}
          >
            {employee.shift}
          </span>
        )}
        <span className={`${styles.status} ${employee.status === 'active' ? styles.active : styles.inactive}`}>
          {employee.status === 'active' ? '● Đang làm' : '● Đã nghỉ'}
        </span>
      </div>
      {(onEdit || onDelete) && (
        <div className={styles.actions}>
          {onEdit && (
            <button className={styles.editBtn} onClick={() => onEdit(employee)}>
              ✏️ Sửa
            </button>
          )}
          {onDelete && (
            <button className={styles.deleteBtn} onClick={() => onDelete(employee)}>
              🗑️ Xoá
            </button>
          )}
        </div>
      )}
    </div>
  );
}
