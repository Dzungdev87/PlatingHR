import styles from './StatsCard.module.css';

export default function StatsCard({ icon, label, value, color = '#2196F3', subtitle }) {
  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <div className={styles.value} style={{ color }}>{value}</div>
        <div className={styles.label}>{label}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      <div className={styles.bar} style={{ backgroundColor: color }} />
    </div>
  );
}
