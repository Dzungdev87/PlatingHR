import { SHIFT_TYPES, LEAVE_TYPES } from '@/lib/constants';
import styles from './ShiftBadge.module.css';

export default function ShiftBadge({ value, size = 'normal' }) {
  if (!value) return null;

  const shiftInfo = SHIFT_TYPES[value];
  const leaveInfo = LEAVE_TYPES[value];
  const info = shiftInfo || leaveInfo;

  if (!info) return <span className={styles.badge}>{value}</span>;

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
