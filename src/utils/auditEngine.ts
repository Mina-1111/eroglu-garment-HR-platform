import {
  RawAttendanceRow,
  RawOvertimeRow,
  EmployeeAuditSummary,
  EmployeeDailyAuditEntry,
  AuditFlag
} from '../types/audit';

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getEnglishDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return ENGLISH_DAYS[d.getDay()];
  } catch {
    return '';
  }
}

export function consolidateAuditData(
  attendanceRows: RawAttendanceRow[],
  overtimeRows: RawOvertimeRow[],
  manualNotes: Record<string, string> = {},
  auditedCodes: Set<string> = new Set()
): EmployeeAuditSummary[] {
  // Collect all unique employee codes
  const employeeMap = new Map<
    string,
    {
      name: string;
      department: string;
      attendanceByDate: Map<string, RawAttendanceRow>;
      overtimeByDate: Map<string, { totalHours: number; sources: string[]; reasons: string[] }>;
    }
  >();

  // 1. Process Attendance
  for (const row of attendanceRows) {
    const code = row.code.trim();
    if (!code) continue;

    if (!employeeMap.has(code)) {
      employeeMap.set(code, {
        name: row.name || `Employee (${code})`,
        department: row.department || 'General',
        attendanceByDate: new Map(),
        overtimeByDate: new Map()
      });
    }

    const emp = employeeMap.get(code)!;
    if (row.name && emp.name.startsWith('Employee (')) {
      emp.name = row.name;
    }
    if (row.department && emp.department === 'General') {
      emp.department = row.department;
    }

    emp.attendanceByDate.set(row.date, row);
  }

  // 2. Process Overtime Rows
  for (const ot of overtimeRows) {
    const code = ot.code.trim();
    if (!code) continue;

    if (!employeeMap.has(code)) {
      employeeMap.set(code, {
        name: ot.name || `Employee (${code})`,
        department: ot.department || 'General',
        attendanceByDate: new Map(),
        overtimeByDate: new Map()
      });
    }

    const emp = employeeMap.get(code)!;
    if (ot.name && emp.name.startsWith('Employee (')) {
      emp.name = ot.name;
    }
    if (ot.department && emp.department === 'General') {
      emp.department = ot.department;
    }

    if (!emp.overtimeByDate.has(ot.date)) {
      emp.overtimeByDate.set(ot.date, { totalHours: 0, sources: [], reasons: [] });
    }
    const entry = emp.overtimeByDate.get(ot.date)!;
    entry.totalHours += ot.hours;
    if (ot.sourceFile && !entry.sources.includes(ot.sourceFile)) {
      entry.sources.push(ot.sourceFile);
    }
    if (ot.reason && !entry.reasons.includes(ot.reason)) {
      entry.reasons.push(ot.reason);
    }
  }

  // 3. Build Employee Summaries & Anomaly Detection
  const summaries: EmployeeAuditSummary[] = [];

  for (const [code, empData] of employeeMap.entries()) {
    let presentDays = 0;
    let absentDays = 0;
    let restDays = 0;
    let leaveDays = 0;
    let totalOvertimeHours = 0;
    let overtimeDaysCount = 0;
    let maxSingleDayOvertime = 0;
    const flags: AuditFlag[] = [];

    // Check if employee has zero attendance records
    if (empData.attendanceByDate.size === 0 && empData.overtimeByDate.size > 0) {
      flags.push({
        id: `flag-no-att-${code}`,
        type: 'danger',
        title: 'Employee Code Not in Master Attendance Sheet',
        description: `Overtime hours are recorded for this employee, but there are no attendance logs in the master sheet!`
      });
    }

    const dailyEntries: EmployeeDailyAuditEntry[] = [];
    const empDatesSet = new Set<string>();
    empData.attendanceByDate.forEach((_, d) => empDatesSet.add(d));
    empData.overtimeByDate.forEach((_, d) => empDatesSet.add(d));
    const sortedEmpDates = Array.from(empDatesSet).sort();

    for (const date of sortedEmpDates) {
      const att = empData.attendanceByDate.get(date);
      const ot = empData.overtimeByDate.get(date);

      const status = att ? att.status : 'unknown';
      const otHours = ot ? ot.totalHours : 0;

      if (status === 'present') presentDays++;
      else if (status === 'absent') absentDays++;
      else if (status === 'rest_day') restDays++;
      else if (status === 'leave' || status === 'sick' || status === 'holiday') leaveDays++;

      if (otHours > 0) {
        totalOvertimeHours += otHours;
        overtimeDaysCount++;
        if (otHours > maxSingleDayOvertime) {
          maxSingleDayOvertime = otHours;
        }

        // Daily limit check
        if (otHours > 3.5) {
          flags.push({
            id: `flag-high-ot-${code}-${date}`,
            type: 'warning',
            title: `Daily Overtime Limit Exceeded (${otHours} hrs)`,
            description: `Employee recorded ${otHours} overtime hours on ${date}, which may exceed maximum daily operational limits.`,
            date
          });
        }
      }

      // Check conflict: Overtime recorded when marked absent / sick
      let isConflict = false;
      let conflictReason: string | undefined;

      if (otHours > 0 && status === 'absent') {
        isConflict = true;
        conflictReason = `${otHours} hrs overtime recorded on an unexcused absence day!`;
        flags.push({
          id: `conflict-absent-${code}-${date}`,
          type: 'danger',
          title: `Critical Conflict: Overtime on Absent Day! (${date})`,
          description: `Employee is marked "Absent" in the master attendance sheet, but has ${otHours} hours of overtime recorded on the same date!`,
          date
        });
      } else if (otHours > 0 && status === 'sick') {
        isConflict = true;
        conflictReason = `${otHours} hrs overtime recorded during approved sick leave!`;
        flags.push({
          id: `conflict-sick-${code}-${date}`,
          type: 'danger',
          title: `Conflict: Overtime During Sick Leave (${date})`,
          description: `Employee is on approved medical leave but has overtime recorded.`,
          date
        });
      }

      dailyEntries.push({
        date,
        dayName: getEnglishDayName(date),
        attendanceStatus: status,
        overtimeHours: otHours,
        overtimeSourceFiles: ot?.sources || [],
        checkIn: att?.checkIn,
        checkOut: att?.checkOut,
        notes: [att?.notes, ot?.reasons?.join(', ')].filter(Boolean).join(' | ') || undefined,
        isConflict,
        conflictReason
      });
    }

    // High total overtime warning (> 45h/month)
    if (totalOvertimeHours > 45) {
      flags.push({
        id: `flag-monthly-ot-${code}`,
        type: 'warning',
        title: `High Monthly Overtime (${totalOvertimeHours} hrs)`,
        description: `Total overtime approaches or exceeds the standard monthly legal threshold.`
      });
    }

    // High absence rate warning
    if (absentDays >= 3) {
      flags.push({
        id: `flag-absent-rate-${code}`,
        type: 'warning',
        title: `High Absenteeism Rate (${absentDays} days)`,
        description: `Frequent absences require verification of medical certificates or approved permits.`
      });
    }

    const recordedWorkingDays = presentDays + absentDays;
    const attendanceRate = recordedWorkingDays > 0 ? Math.round((presentDays / recordedWorkingDays) * 100) : 100;
    const avgDailyOvertime = overtimeDaysCount > 0 ? Number((totalOvertimeHours / overtimeDaysCount).toFixed(1)) : 0;

    summaries.push({
      code,
      name: empData.name,
      department: empData.department,
      presentDays,
      absentDays,
      restDays,
      leaveDays,
      totalRecordedDays: dailyEntries.length,
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
      overtimeDaysCount,
      avgDailyOvertime,
      maxSingleDayOvertime: Number(maxSingleDayOvertime.toFixed(1)),
      attendanceRate,
      flags,
      dailyEntries,
      manualNote: manualNotes[code],
      isAudited: auditedCodes.has(code)
    });
  }

  // Sort by code naturally
  return summaries.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.code.localeCompare(b.code);
  });
}
