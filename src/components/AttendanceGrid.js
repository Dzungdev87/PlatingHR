'use client';

import React, { useState } from 'react';
import styles from './AttendanceGrid.module.css';
import ShiftBadge from './ShiftBadge';

// Shift + Leave groups for the editor popup
const SHIFT_OPTIONS = [
  { code: 'C1', label: 'Ca ngày', sub: '8h', color: '#4CAF50' },
  { code: 'C2', label: 'Ca ngày', sub: '8h', color: '#2196F3' },
  { code: 'C3', label: 'Ca đêm', sub: '8h', color: '#9C27B0' },
  { code: 'TS', label: 'Ca đêm', sub: '12h', color: '#FF5722' },
  { code: 'X',  label: 'Ca ngày', sub: '12h', color: '#FF9800' },
  { code: 'V',  label: 'Ca ngày', sub: '8h', color: '#00897B' },
];

const LEAVE_OPTIONS = [
  { code: 'AL', label: 'Nghỉ phép', color: '#00BCD4' },
  { code: 'UP', label: 'Không lương', color: '#607D8B' },
  { code: 'SL', label: 'Nghỉ ốm', color: '#F44336' },
  { code: 'WL', label: 'Kết hôn', color: '#E91E63' },
  { code: 'OL', label: 'Khác', color: '#795548' },
];

const LEAVE_CODES = LEAVE_OPTIONS.map(l => l.code);

export default function AttendanceGrid({
  month = 6,
  year = 2026,
  userRole = 'leader',
  employees = [],
  attendanceData = {},
  onUpdate = null,
}) {
  const [localData, setLocalData] = useState(attendanceData);
  const [selectedCell, setSelectedCell] = useState(null);
  const [customShiftText, setCustomShiftText] = useState('');

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayLabel = (day) => {
    const date = new Date(year, month - 1, day);
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
  };

  const isWeekend = (day) => {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
  };

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() + 1 === month && t.getDate() === day;
  };

  const canEditCell = (empId, day) => {
    if (userRole === 'admin') return true;
    if (userRole === 'leader') {
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const cellDate = new Date(year, month - 1, day); cellDate.setHours(0,0,0,0);
      return cellDate.getTime() === today.getTime() || cellDate.getTime() === yesterday.getTime();
    }
    return false;
  };

  const handleCellClick = (empId, day) => {
    if (canEditCell(empId, day)) {
      setSelectedCell({ empId, day });
      const currentVal = getCellValue(empId, day);
      const isStandard = [...SHIFT_OPTIONS.map(s => s.code), ...LEAVE_CODES].includes(currentVal);
      setCustomShiftText(isStandard ? '' : currentVal);
    }
  };

  const handleCellChange = (value) => {
    if (!selectedCell) return;
    const key = `${selectedCell.empId}-${selectedCell.day}`;
    setLocalData(prev => ({ ...prev, [key]: value }));
    if (onUpdate) onUpdate(selectedCell.empId, selectedCell.day, value);
    setSelectedCell(null);
  };

  const getCellValue = (empId, day) => localData[`${empId}-${day}`] || '';

  const getRowSummary = (empId) => {
    let workDays = 0, leaveDays = 0;
    days.forEach(day => {
      const val = getCellValue(empId, day);
      if (val && !LEAVE_CODES.includes(val)) workDays++;
      if (LEAVE_CODES.includes(val)) leaveDays++;
    });
    return { workDays, leaveDays };
  };

  // Find the selected employee name for popup
  const selectedEmp = selectedCell
    ? employees.find(e => e.empId === selectedCell.empId)
    : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.gridWrapper}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.stickyCol} ${styles.colEmpId}`}>Mã NV</th>
              <th className={`${styles.th} ${styles.stickyColName} ${styles.colName}`}>Họ và tên</th>
              {days.map(day => (
                <th
                  key={day}
                  className={[
                    styles.th,
                    styles.dayHeader,
                    isWeekend(day) ? styles.weekend : '',
                    isToday(day) ? styles.today : '',
                  ].join(' ')}
                >
                  <div className={styles.dayNum}>{day}</div>
                  <div className={styles.dayName}>{getDayLabel(day)}</div>
                </th>
              ))}
              <th className={`${styles.th} ${styles.summaryCol}`}>Công</th>
              <th className={`${styles.th} ${styles.summaryCol}`}>Nghỉ</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const { workDays, leaveDays } = getRowSummary(emp.empId);
              return (
                <tr key={emp.empId} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td className={`${styles.td} ${styles.stickyCol} ${styles.colEmpId}`}>
                    {emp.empId}
                  </td>
                  <td className={`${styles.td} ${styles.stickyColName} ${styles.colName}`}>
                    <span className={styles.empName}>{emp.fullName}</span>
                  </td>
                  {days.map(day => {
                    const value = getCellValue(emp.empId, day);
                    const canEdit = canEditCell(emp.empId, day);
                    const isSelected = selectedCell?.empId === emp.empId && selectedCell?.day === day;

                    return (
                      <td
                        key={day}
                        className={[
                          styles.td, styles.cell,
                          canEdit ? styles.editable : styles.disabled,
                          isSelected ? styles.selected : '',
                          isWeekend(day) ? styles.weekendCell : '',
                          isToday(day) ? styles.todayCell : '',
                        ].join(' ')}
                        onClick={() => handleCellClick(emp.empId, day)}
                        title={canEdit ? (value || 'Click để chấm công') : 'Không được phép chỉnh sửa'}
                      >
                        {value
                          ? <ShiftBadge value={value} size="small" />
                          : (canEdit
                              ? <span className={styles.emptyDot} />
                              : <span className={styles.lockIcon}>🔒</span>
                            )
                        }
                      </td>
                    );
                  })}
                  <td className={`${styles.td} ${styles.summaryCell} ${styles.summaryWork}`}>{workDays}</td>
                  <td className={`${styles.td} ${styles.summaryCell} ${styles.summaryLeave}`}>{leaveDays}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cell Editor Popup */}
      {selectedCell && (
        <div className={styles.overlay} onClick={() => setSelectedCell(null)}>
          <div className={styles.cellEditor} onClick={e => e.stopPropagation()}>

            <div className={styles.editorHeader}>
              <div>
                <h3 className={styles.editorTitle}>✏️ Chấm công</h3>
                <p className={styles.editorSub}>
                  <span className={styles.editorEmpId}>{selectedCell.empId}</span>
                  {selectedEmp && <span className={styles.editorEmpName}> — {selectedEmp.fullName}</span>}
                  <br />
                  <span className={styles.editorDate}>Ngày {selectedCell.day}/{month}/{year}</span>
                </p>
              </div>
              <button className={styles.editorClose} onClick={() => setSelectedCell(null)} title="Đóng">✕</button>
            </div>

            <div className={styles.editorGroups}>
              {/* Shifts */}
              <div className={styles.editorGroup}>
                <div className={styles.groupLabel}>🕐 Ca làm việc</div>
                <div className={styles.shiftOptions}>
                  {SHIFT_OPTIONS.map(({ code, label, sub, color }) => (
                    <button
                      key={code}
                      className={styles.shiftBtn}
                      style={{ '--btn-color': color }}
                      onClick={() => handleCellChange(code)}
                      title={`${label} ${sub}`}
                    >
                      <span className={styles.shiftCode}>{code}</span>
                      <span className={styles.shiftMeta}>{label}<br />{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave */}
              <div className={styles.editorGroup}>
                <div className={styles.groupLabel}>📋 Loại nghỉ</div>
                <div className={styles.leaveOptions}>
                  {LEAVE_OPTIONS.map(({ code, label, color }) => (
                    <button
                      key={code}
                      className={styles.leaveBtn}
                      style={{ '--btn-color': color }}
                      onClick={() => handleCellChange(code)}
                    >
                      <span className={styles.leaveCode}>{code}</span>
                      <span className={styles.leaveLabel}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ca đặc biệt */}
              <div className={styles.editorGroup}>
                <div className={styles.groupLabel}>⭐ Ca đặc biệt (Nhập tự do)</div>
                <div className={styles.customShiftInputRow}>
                  <input
                    type="text"
                    placeholder="VD: Ca1-1, Ca2-2..."
                    maxLength={20}
                    value={customShiftText}
                    onChange={(e) => setCustomShiftText(e.target.value)}
                    className={styles.customInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customShiftText.trim()) {
                        handleCellChange(customShiftText.trim());
                      }
                    }}
                  />
                  <button
                    className={styles.saveCustomBtn}
                    onClick={() => {
                      if (customShiftText.trim()) {
                        handleCellChange(customShiftText.trim());
                      }
                    }}
                    disabled={!customShiftText.trim()}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.editorFooter}>
              <button className={styles.clearBtn} onClick={() => handleCellChange('')}>
                🗑 Xoá dữ liệu
              </button>
              <button className={styles.closeBtn} onClick={() => setSelectedCell(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
