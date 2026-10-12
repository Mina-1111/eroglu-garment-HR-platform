import { RawDailyRecord, EmployeeOvertimeSummary, SimpleAuditDataset } from '../types/overtime';
import { checkIsFriday } from './biometricParser';

export function processSimpleOvertime(
  records: RawDailyRecord[],
  masterEmployees: Record<string, { name?: string; department?: string }> = {}
): SimpleAuditDataset {
  const datesSet = new Set<string>();
  const empMap = new Map<string, {
    code: string;
    name: string;
    department: string;
    dailyHours: Record<string, number>;
  }>();

  for (const row of records) {
    const code = String(row.code || '').trim();
    if (!code) continue;

    const date = row.date.trim();
    if (date) {
      datesSet.add(date);
    }

    const rawHours = Number(row.hours) || 0;
    // Company minimum overtime is 2 hours (1-hour OT is not counted):
    const hours = rawHours > 0 && rawHours < 2 ? 0 : rawHours;

    if (!empMap.has(code)) {
      const master = masterEmployees[code];
      const fallbackName = (row.name && row.name.trim()) || (master?.name && master.name.trim()) || `Employee (${code})`;
      const fallbackDept = (row.department && row.department.trim()) || (master?.department && master.department.trim()) || 'General';

      empMap.set(code, {
        code,
        name: fallbackName,
        department: fallbackDept,
        dailyHours: {}
      });
    }

    const emp = empMap.get(code)!;

    // Update name if better info is provided
    if (row.name && row.name.trim() && emp.name.startsWith('Employee (')) {
      emp.name = row.name.trim();
    }
    // Update department verbatim from the sheet as requested
    if (row.department && row.department.trim()) {
      const cleanDept = row.department.trim();
      if (!emp.department || emp.department === 'General' || emp.department === 'N/A') {
        emp.department = cleanDept;
      }
    }

    // Add hours for this date
    if (date) {
      emp.dailyHours[date] = Number(((emp.dailyHours[date] || 0) + hours).toFixed(2));
    }
  }

  // Also include any employees from master list even if they had 0 overtime if desired
  for (const [code, info] of Object.entries(masterEmployees)) {
    if (!empMap.has(code)) {
      empMap.set(code, {
        code,
        name: info.name || `Employee (${code})`,
        department: info.department || 'General',
        dailyHours: {}
      });
    }
  }

  // Ensure calendar Fridays within the date range are included in columns even if no file was uploaded for Friday
  const validIsoDates = Array.from(datesSet).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (validIsoDates.length > 0) {
    const minDStr = validIsoDates[0];
    const maxDStr = validIsoDates[validIsoDates.length - 1];
    const [minY, minM, minD] = minDStr.split('-').map(Number);
    const [maxY, maxM, maxD] = maxDStr.split('-').map(Number);

    // Strictly start on the exact first date of the uploaded files and end on the exact last date
    const startDate = new Date(minY, minM - 1, minD);
    const endDate = new Date(maxY, maxM - 1, maxD);

    const cur = new Date(startDate);
    while (cur <= endDate) {
      if (cur.getDay() === 5) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        datesSet.add(`${y}-${m}-${d}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Sort dates chronologically
  const allDates = Array.from(datesSet).sort();

  let grandTotalHours = 0;

  const employees: EmployeeOvertimeSummary[] = [];

  for (const emp of empMap.values()) {
    let totalHours = 0;
    let daysCount = 0;
    let fridayHours = 0;

    for (const d of allDates) {
      const h = emp.dailyHours[d] || 0;
      if (h > 0) {
        totalHours += h;
        daysCount += 1;
        if (checkIsFriday(d)) {
          fridayHours += h;
        }
      }
    }

    totalHours = Number(totalHours.toFixed(2));
    fridayHours = Number(fridayHours.toFixed(2));
    grandTotalHours += totalHours;

    employees.push({
      code: emp.code,
      name: emp.name,
      department: emp.department,
      dailyHours: emp.dailyHours,
      totalHours,
      daysCount,
      fridayHours
    });
  }

  // Sort employees naturally by code
  employees.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.code.localeCompare(b.code, 'en');
  });

  return {
    allDates,
    employees,
    grandTotalHours: Number(grandTotalHours.toFixed(2)),
    totalUniqueEmployees: employees.length
  };
}

/**
 * Sample dataset with realistic corporate departments
 */
export function getSampleSimpleOvertimeData(): {
  records: RawDailyRecord[];
  masterList: Record<string, { name: string; department: string }>;
} {
  const masterList: Record<string, { name: string; department: string }> = {
    '101': { name: 'Ahmed Ibrahim', department: 'Production' },
    '102': { name: 'Mohamed Ali Mahmoud', department: 'Production' },
    '103': { name: 'Mahmoud Hassan', department: 'Maintenance' },
    '104': { name: 'Ibrahim Samy', department: 'Quality Control (QC)' },
    '105': { name: 'Tarek Abdel-Moneim', department: 'Warehouse & Logistics' },
    '106': { name: 'Yasser Farouk', department: 'Production' },
    '107': { name: 'Hossam Mostafa', department: 'Maintenance' },
    '108': { name: 'Karim Adel El-Banna', department: 'Packaging' },
    '109': { name: 'Sayed Ragab Metwally', department: 'Production' },
    '110': { name: 'Omar Sherif', department: 'Safety & HSE' }
  };

  const dates = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10'
  ];

  const records: RawDailyRecord[] = [];

  const assignments: Record<number, Record<string, number>> = {
    101: { '2026-10-01': 2.5, '2026-10-02': 3.0, '2026-10-04': 2.0, '2026-10-06': 3.5, '2026-10-08': 2.0 },
    102: { '2026-10-01': 2.0, '2026-10-03': 2.5, '2026-10-04': 2.0, '2026-10-07': 3.0, '2026-10-09': 2.5 },
    103: { '2026-10-02': 4.0, '2026-10-05': 3.5, '2026-10-06': 4.0, '2026-10-08': 2.5, '2026-10-10': 3.0 },
    104: { '2026-10-01': 2.0, '2026-10-03': 2.0, '2026-10-07': 2.0, '2026-10-09': 2.0 },
    105: { '2026-10-02': 2.5, '2026-10-04': 3.0, '2026-10-05': 2.0, '2026-10-08': 3.0 },
    106: { '2026-10-01': 3.0, '2026-10-03': 3.0, '2026-10-06': 2.5, '2026-10-09': 3.0 },
    107: { '2026-10-02': 3.5, '2026-10-05': 4.0, '2026-10-07': 3.0, '2026-10-10': 3.5 },
    108: { '2026-10-01': 2.0, '2026-10-04': 2.5, '2026-10-06': 2.0, '2026-10-08': 2.5 },
    109: { '2026-10-02': 2.0, '2026-10-03': 2.0, '2026-10-07': 2.5, '2026-10-09': 2.0 },
    110: { '2026-10-05': 2.0, '2026-10-08': 2.0 }
  };

  for (const [codeStr, dayHours] of Object.entries(assignments)) {
    const code = codeStr;
    const master = masterList[code];
    for (const [date, hours] of Object.entries(dayHours)) {
      records.push({
        code,
        name: master.name,
        department: master.department, // Verbatim from sheet
        date,
        hours,
        sourceFile: `overtime_${date}.xlsx`
      });
    }
  }

  return { records, masterList };
}
