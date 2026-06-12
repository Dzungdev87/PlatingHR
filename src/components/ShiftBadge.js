import { SHIFT_TYPES, LEAVE_TYPES } from '@/lib/constants';
import styles from './ShiftBadge.module.css';

export default function ShiftBadge({ value, size = 'normal' }) {
  if (!value) return null;

  const shiftInfo = SHIFT_TYPES[value];
  const leaveInfo = LEAVE_TYPES[value];
  const info = shiftInfo || leaveInfo;

  if (!info) {
    // Truncate custom shift text to a maximum of 5 characters
    const displayValue = value.length > 5 ? value.substring(0, 5) : value;
    return (
      <span
        className={`${styles.badge} ${size === 'small' ? styles.small : ''}`}
        style={{
          backgroundColor: '#3f51b5',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
        title={value}
      >
        {displayValue}
      </span>
    );
  }

  const color = info.color;

  return (
    <span
      className={`${styles.badge} ${size === 'small' ? styles.small : ''}`}
      style={{ backgroundColor: color, color: '#fff' }}
      title={info.label}
    >
      {value}
    </span>
  );
}
