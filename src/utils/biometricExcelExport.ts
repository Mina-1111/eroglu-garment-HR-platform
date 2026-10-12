import * as XLSX from 'xlsx';
import { BiometricPunchRecord, BiometricEmployeeMonthlySummary } from '../types/biometric';

export function getExcelColumnLetter(colIndex: number): string {
  let temp: number;
  let letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    colIndex = Math.floor((colIndex - temp) / 26);
  }
  return letter;
}

export function exportBiometricPunchesExcel(
  punches: BiometricPunchRecord[],
  employees: BiometricEmployeeMonthlySummary[],
  filename: string = 'Biometric_Overtime_Audit_Report'
) {
  const wb = XLSX.utils.book_new();

  // 1. Monthly Employee Totals Summary Sheet (With dynamic formulas)
  const summaryHeader = [
    '#',
    'Employee Code',
    'Employee Name',
    'Department',
    'Present Days',
    'Normal Days (8h)',
    'Friday Worked',
    'Total Worked Hours',
    'Total Overtime Hours',
    '1.35 Total Hours',
    '1.7 Total Hours',
    '2.0x (Fri/Hol) Hours',
    'Base Salary (EGP)',
    'Hourly Rate (EGP/h)',
    '1.35x Pay (EGP)',
    '1.70x Pay (EGP)',
    '2.0x Pay (EGP)',
    'Total OT Pay (EGP)',
    'Gross Total Salary (EGP)'
  ];

  const summaryAoa: any[][] = [summaryHeader];

  employees.forEach((e, idx) => {
    const r = idx + 2; // Excel 1-based row number
    const baseSal = e.baseSalary || 0;
    const hourlyRate = e.hourlyRate || (baseSal > 0 ? Number((baseSal / 240).toFixed(2)) : 0);

    summaryAoa.push([
      idx + 1,
      e.code,
      e.name,
      e.department,
      e.presentDaysCount,
      e.normalDaysCount,
      e.fridayWorkedCount,
      e.totalWorkedHours,
      // Total OT Hours as dynamic sum of 1.35 + 1.70 + 2.0 tiers:
      { t: 'n', f: `ROUND(J${r} + K${r} + L${r}, 2)`, v: e.totalOtHours },
      e.totalRate135Hours,
      e.totalRate170Hours,
      e.totalRate200Hours,
      baseSal,
      // Dynamic live formulas for compensation:
      { t: 'n', f: `IF(M${r}>0, ROUND(M${r}/240, 2), 0)`, v: hourlyRate },
      { t: 'n', f: `ROUND(J${r} * N${r} * 1.35, 2)`, v: e.otAmount135 || 0 },
      { t: 'n', f: `ROUND(K${r} * N${r} * 1.70, 2)`, v: e.otAmount170 || 0 },
      { t: 'n', f: `ROUND(L${r} * N${r} * 2.0, 2)`, v: e.otAmount200 || 0 },
      { t: 'n', f: `ROUND(O${r} + P${r} + Q${r}, 2)`, v: e.totalOtAmount || 0 },
      { t: 'n', f: `ROUND(M${r} + R${r}, 2)`, v: e.grossSalary || baseSal }
    ]);
  });

  const lastEmpRow = employees.length + 1;
  const footerRow = lastEmpRow + 1;

  // Grand Total row with live SUM formulas:
  if (employees.length > 0) {
    summaryAoa.push([
      '-',
      'Grand Total',
      '-',
      '-',
      { t: 'n', f: `SUM(E2:E${lastEmpRow})`, v: employees.reduce((s, e) => s + e.presentDaysCount, 0) },
      { t: 'n', f: `SUM(F2:F${lastEmpRow})`, v: employees.reduce((s, e) => s + e.normalDaysCount, 0) },
      { t: 'n', f: `SUM(G2:G${lastEmpRow})`, v: employees.reduce((s, e) => s + e.fridayWorkedCount, 0) },
      { t: 'n', f: `SUM(H2:H${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + e.totalWorkedHours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(I2:I${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + e.totalOtHours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(J2:J${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + e.totalRate135Hours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(K2:K${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + e.totalRate170Hours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(L2:L${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + e.totalRate200Hours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(M2:M${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.baseSalary || 0), 0).toFixed(2)) },
      '-',
      { t: 'n', f: `SUM(O2:O${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.otAmount135 || 0), 0).toFixed(2)) },
      { t: 'n', f: `SUM(P2:P${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.otAmount170 || 0), 0).toFixed(2)) },
      { t: 'n', f: `SUM(Q2:Q${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.otAmount200 || 0), 0).toFixed(2)) },
      { t: 'n', f: `SUM(R2:R${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.totalOtAmount || 0), 0).toFixed(2)) },
      { t: 'n', f: `SUM(S2:S${lastEmpRow})`, v: Number(employees.reduce((s, e) => s + (e.grossSalary || 0), 0).toFixed(2)) }
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [
    { wch: 6 },  // #
    { wch: 16 }, // Code
    { wch: 28 }, // Name
    { wch: 22 }, // Dept
    { wch: 14 }, // Present Days
    { wch: 16 }, // Normal Days
    { wch: 14 }, // Friday Worked
    { wch: 18 }, // Total Worked Hours
    { wch: 18 }, // Total OT Hours
    { wch: 16 }, // 1.35 Hours
    { wch: 16 }, // 1.7 Hours
    { wch: 18 }, // 2.0x Hours
    { wch: 18 }, // Base Salary
    { wch: 18 }, // Hourly Rate
    { wch: 18 }, // 1.35x Pay
    { wch: 18 }, // 1.70x Pay
    { wch: 18 }, // 2.0x Pay
    { wch: 20 }, // Total OT Pay
    { wch: 24 }  // Gross Total Salary
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Monthly_Employee_Totals');

  // 2. Detailed Punch Log Sheet (With live SUM formulas)
  const punchHeader = [
    '#',
    'Employee Code',
    'Employee Name',
    'Department',
    'Date',
    'Day of Week',
    'Check In',
    'Check Out',
    'Total Worked Hours',
    'OT Hours (>8h)',
    '1.35',
    '1.7',
    '2.0x (Fri/Hol)',
    'Status',
    'Remark'
  ];

  const punchAoa: any[][] = [punchHeader];

  punches.forEach((p, idx) => {
    const r = idx + 2;
    const isBlankFri = p.isFriday && (!p.otHours || p.otHours <= 0) && (!p.checkIn || p.checkIn === '-');
    const isSpecialDay = p.isFriday || Boolean(p.isOfficialHoliday);
    const outDisplay = p.isSingleSwipe ? 'Missing Out' : (isBlankFri ? '' : p.checkOut);
    const remarkDisplay = p.isSingleSwipe 
      ? 'Single Swipe (No OT)' 
      : p.isOfficialHoliday 
      ? (p.rate200Hours > 0 ? 'G.Holiday (Worked 2x)' : 'G.Holiday (Paid)')
      : (p.remark || (p.isFriday ? 'W.Holiday' : ''));

    // Dynamic formulas for daily punch log
    const workedCell = isBlankFri || p.isSingleSwipe ? 0 : p.totalWorkedHours;
    const otCell = isBlankFri || p.isSingleSwipe
      ? 0
      : (isSpecialDay
          ? { t: 'n', f: `I${r}`, v: p.otHours > 0 ? p.otHours : 0 }
          : { t: 'n', f: `IF(I${r}>8, ROUND(I${r}-8, 2), 0)`, v: p.otHours > 0 ? p.otHours : 0 });

    const cell135 = isBlankFri || p.isSingleSwipe || isSpecialDay
      ? 0
      : { t: 'n', f: `IF(J${r}>0, MIN(2, J${r}), 0)`, v: p.rate135Hours > 0 ? p.rate135Hours : 0 };

    const cell170 = isBlankFri || p.isSingleSwipe || isSpecialDay
      ? 0
      : { t: 'n', f: `IF(J${r}>2, J${r}-2, 0)`, v: p.rate170Hours > 0 ? p.rate170Hours : 0 };

    const cell200 = isBlankFri || p.isSingleSwipe
      ? 0
      : (isSpecialDay
          ? { t: 'n', f: `IF(J${r}>0, J${r}, 0)`, v: p.rate200Hours > 0 ? p.rate200Hours : 0 }
          : 0);

    punchAoa.push([
      idx + 1,
      p.code,
      p.name,
      p.department,
      p.date,
      p.dayName,
      isBlankFri ? '' : p.checkIn,
      outDisplay,
      workedCell,
      otCell,
      cell135,
      cell170,
      cell200,
      p.status || '',
      remarkDisplay
    ]);
  });

  const lastPunchRow = punches.length + 1;
  const punchFooterRow = lastPunchRow + 1;

  const totalWorked = punches.reduce((s, p) => s + (p.isSingleSwipe ? 0 : p.totalWorkedHours), 0);
  const totalOt = punches.reduce((s, p) => s + (p.isSingleSwipe ? 0 : p.otHours), 0);
  const total135 = punches.reduce((s, p) => s + (p.isSingleSwipe ? 0 : p.rate135Hours), 0);
  const total170 = punches.reduce((s, p) => s + (p.isSingleSwipe ? 0 : p.rate170Hours), 0);
  const total200 = punches.reduce((s, p) => s + (p.isSingleSwipe ? 0 : p.rate200Hours), 0);

  if (punches.length > 0) {
    punchAoa.push([
      '-',
      'Grand Total',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      { t: 'n', f: `SUM(I2:I${lastPunchRow})`, v: Number(totalWorked.toFixed(2)) },
      { t: 'n', f: `SUM(J2:J${lastPunchRow})`, v: Number(totalOt.toFixed(2)) },
      { t: 'n', f: `SUM(K2:K${lastPunchRow})`, v: Number(total135.toFixed(2)) },
      { t: 'n', f: `SUM(L2:L${lastPunchRow})`, v: Number(total170.toFixed(2)) },
      { t: 'n', f: `SUM(M2:M${lastPunchRow})`, v: Number(total200.toFixed(2)) },
      '-',
      `${punches.length} records`
    ]);
  }

  const wsPunches = XLSX.utils.aoa_to_sheet(punchAoa);
  wsPunches['!cols'] = [
    { wch: 6 },  // #
    { wch: 16 }, // Code
    { wch: 28 }, // Name
    { wch: 22 }, // Dept
    { wch: 14 }, // Date
    { wch: 14 }, // Day
    { wch: 14 }, // In
    { wch: 16 }, // Out
    { wch: 18 }, // Total Worked
    { wch: 16 }, // OT
    { wch: 12 }, // 1.35
    { wch: 12 }, // 1.7
    { wch: 16 }, // 2.0x (Fri/Hol)
    { wch: 10 }, // Status
    { wch: 28 }  // Remark
  ];
  XLSX.utils.book_append_sheet(wb, wsPunches, 'Biometric_Daily_Log');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${todayStr}.xlsx`);
}

export function exportSingleBiometricEmployeeExcel(emp: BiometricEmployeeMonthlySummary) {
  const wb = XLSX.utils.book_new();

  // Create an exact 1:1 replica of the Official Attendance Slip table as printed with live formulas
  const rows: any[][] = [];

  // Top header with Company branding
  rows.push(['EROĞLU GARMENTS - MONTHLY ATTENDANCE STATEMENT']);
  rows.push([]);

  // 1. Top Employee Metadata Block
  rows.push(['Cardno:', emp.code, '', 'Designation :', emp.designation || 'Staff', '', '', '', '']);
  rows.push(['Name :', emp.name, '', 'Section :', emp.department, '', '', '', '']);
  rows.push([]); // blank separator row (Excel Row 5)

  // 2. Attendance Table Header (Excel Row 6)
  rows.push(['SL', 'Date', 'Week Day', 'In Time', 'Out Time', 'OV Total', '1.35x', '1.70x', '2.0x', 'Status', 'Remarks']);

  const startRow = 7;
  const numPunches = emp.punches.length;
  const endRow = startRow + numPunches - 1;

  // 3. Daily Rows (Every day of the month)
  emp.punches.forEach((p, idx) => {
    const curRow = startRow + idx;
    const isFri = p.isFriday;
    const isOffHol = Boolean(p.isOfficialHoliday);
    const isBlankFri = isFri && (!p.otHours || p.otHours <= 0) && !isOffHol;

    const inTimeVal = isBlankFri ? '' : (p.inTime || '');
    const outTimeVal = isBlankFri ? '' : (p.outTime || '');
    const otVal = isBlankFri ? '' : (p.otHours > 0 ? p.otHours : 0);
    const statusVal = isOffHol ? 'P' : (isBlankFri ? '' : (p.status || ''));
    const remarksVal = isOffHol 
      ? (p.rate200Hours > 0 || p.otHours > 0 ? 'G.Holiday (Worked 2x)' : 'G.Holiday (Paid)')
      : (p.remarks || (isFri ? 'W.Holiday' : ''));

    // Dynamic Formulas for 1.35x, 1.70x, and 2.0x tiers:
    const cell135 = isBlankFri || isFri || isOffHol 
      ? (isBlankFri ? '' : 0)
      : { t: 'n', f: `IF(F${curRow}>0, MIN(2, F${curRow}), 0)`, v: p.rate135Hours || 0 };

    const cell170 = isBlankFri || isFri || isOffHol
      ? (isBlankFri ? '' : 0)
      : { t: 'n', f: `IF(F${curRow}>2, F${curRow}-2, 0)`, v: p.rate170Hours || 0 };

    const cell200 = isBlankFri
      ? ''
      : (isFri || isOffHol
          ? { t: 'n', f: `IF(F${curRow}>0, F${curRow}, 0)`, v: p.rate200Hours || 0 }
          : 0);

    rows.push([
      idx + 1,
      p.formattedDate,
      p.weekDay + (isOffHol ? ' • Holiday' : ''),
      inTimeVal,
      outTimeVal,
      otVal,
      cell135,
      cell170,
      cell200,
      statusVal,
      remarksVal
    ]);
  });

  const footerRow = endRow + 1;

  // 4. Total OT Hours and Week End row inside table footer (Dynamic formulas)
  rows.push([
    '',
    '',
    '',
    '',
    'OV Total :',
    { t: 'n', f: `SUM(F${startRow}:F${endRow})`, v: emp.totalOtHours },
    { t: 'n', f: `SUM(G${startRow}:G${endRow})`, v: emp.totalRate135Hours },
    { t: 'n', f: `SUM(H${startRow}:H${endRow})`, v: emp.totalRate170Hours },
    { t: 'n', f: `SUM(I${startRow}:I${endRow})`, v: emp.totalRate200Hours },
    'Week End :',
    { t: 'n', f: `COUNTIF(C${startRow}:C${endRow}, "*Friday*")`, v: emp.weekEndDaysCount }
  ]);

  rows.push([]); // blank separator row (footerRow + 1)

  const otReportHeaderRow = footerRow + 2;
  const otReportDataRow = otReportHeaderRow + 1;

  // 5. Overtime Tier Breakdown Report (Dynamic formulas linked to table totals)
  rows.push(['Overtime Tiers Report (Detailed Analysis):']);
  rows.push([
    'Total Overtime (OV Total) :',
    { t: 'n', f: `F${footerRow}`, v: emp.totalOtHours },
    'Tier 1.35x (First 2 Hours) :',
    { t: 'n', f: `G${footerRow}`, v: emp.totalRate135Hours },
    'Tier 1.70x (Excess Hours) :',
    { t: 'n', f: `H${footerRow}`, v: emp.totalRate170Hours },
    'Tier 2.0x (Friday Double) :',
    { t: 'n', f: `I${footerRow}`, v: emp.totalRate200Hours }
  ]);

  rows.push([]); // blank separator row (otReportDataRow + 1)

  const summaryHeaderRow = otReportDataRow + 2;
  const summaryDataRow = summaryHeaderRow + 1;

  // 6. Summary Block (Dynamic count formulas)
  rows.push(['Summary :']);
  rows.push([
    'Days Of Month :',
    { t: 'n', f: `COUNTA(B${startRow}:B${endRow})`, v: emp.daysOfMonth },
    'Present :',
    { t: 'n', f: `COUNTIF(J${startRow}:J${endRow}, "P")`, v: emp.presentDaysCount },
    'Absent :',
    { t: 'n', f: `COUNTIF(J${startRow}:J${endRow}, "A")`, v: emp.absentDaysCount }
  ]);

  rows.push([]); // blank separator row

  const wageHeaderRow = summaryDataRow + 2;
  const wageBaseRow = wageHeaderRow + 1;
  const wageTiersRow = wageBaseRow + 1;
  const wageTotalRow = wageTiersRow + 1;

  // 7. Wage & Overtime Compensation Statement (Fully dynamic formulas!)
  // If user changes Base Salary in Cell B(wageBaseRow), everything auto-calculates!
  rows.push(['Wage & Overtime Compensation Statement (Auto-Calculates Live on Base Salary Change):']);
  rows.push([
    'Monthly Base Salary (EGP) :',
    emp.baseSalary || 0,
    '',
    'Labor Hourly Rate (EGP/h) :',
    { t: 'n', f: `IF(B${wageBaseRow}>0, ROUND(B${wageBaseRow}/240, 2), 0)`, v: emp.hourlyRate || 0 },
    '',
    '',
    '',
    ''
  ]);
  rows.push([
    '1.35x OT Pay (EGP) :',
    { t: 'n', f: `ROUND(G${footerRow} * E${wageBaseRow} * 1.35, 2)`, v: emp.otAmount135 || 0 },
    '1.70x OT Pay (EGP) :',
    { t: 'n', f: `ROUND(H${footerRow} * E${wageBaseRow} * 1.70, 2)`, v: emp.otAmount170 || 0 },
    '2.0x OT Pay (EGP) :',
    { t: 'n', f: `ROUND(I${footerRow} * E${wageBaseRow} * 2.0, 2)`, v: emp.otAmount200 || 0 },
    '',
    '',
    ''
  ]);
  rows.push([
    'Total Overtime Pay (EGP) :',
    { t: 'n', f: `ROUND(B${wageTiersRow} + D${wageTiersRow} + F${wageTiersRow}, 2)`, v: emp.totalOtAmount || 0 },
    '',
    'Gross Total Salary (EGP) :',
    { t: 'n', f: `ROUND(B${wageBaseRow} + B${wageTotalRow}, 2)`, v: emp.grossSalary || (emp.baseSalary || 0) },
    '',
    '',
    '',
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths matching the paper layout
  ws['!cols'] = [
    { wch: 6 },  // SL
    { wch: 14 }, // Date
    { wch: 16 }, // Week Day
    { wch: 14 }, // In Time
    { wch: 14 }, // Out Time
    { wch: 12 }, // OV Total
    { wch: 10 }, // 1.35x
    { wch: 10 }, // 1.70x
    { wch: 10 }, // 2.0x
    { wch: 10 }, // Status
    { wch: 24 }  // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Slip');

  const cleanName = emp.name.replace(/[^\w\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `Attendance_Slip_${emp.code}_${cleanName}.xlsx`);
}

export function exportProductionCostAnalyticsExcel(
  deptStats: Array<{
    department: string;
    workerCount: number;
    totalBaseSalary: number;
    totalOtCost: number;
    grossPayroll: number;
    otBudgetShare: number;
    otHours135: number;
    otHours170: number;
    otHours200: number;
    totalOtHours: number;
    avgOtCostPerWorker: number;
  }>,
  lineStats: Array<{
    line: string;
    department: string;
    workerCount: number;
    totalOtHours: number;
    totalOtCost: number;
    avgOtHoursPerWorker: number;
    rootCause: string;
    recommendation: string;
  }>,
  dailyStats: Array<{
    date: string;
    dayName: string;
    isFriday: boolean;
    isHoliday: boolean;
    scheduledCount: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
    absenteeismRate: number;
    totalOtHours: number;
    shortageLevel: string;
  }>,
  filename: string = 'Production_Cost_Analytics_Report'
) {
  const wb = XLSX.utils.book_new();

  // 1. Department Cost Summary Sheet
  const deptHeader = [
    '#',
    'Department',
    'Workers Count',
    'Base Salary Payroll (EGP)',
    'Overtime Cost (EGP)',
    'Gross Payroll (EGP)',
    'OT % of Factory Budget',
    '1.35x Hours',
    '1.70x Hours',
    '2.0x Fri/Hol Hours',
    'Total OT Hours',
    'Avg OT Cost / Worker (EGP)'
  ];
  const deptRows: any[][] = [deptHeader];
  deptStats.forEach((d, i) => {
    deptRows.push([
      i + 1,
      d.department,
      d.workerCount,
      d.totalBaseSalary,
      d.totalOtCost,
      d.grossPayroll,
      `${d.otBudgetShare.toFixed(1)}%`,
      d.otHours135,
      d.otHours170,
      d.otHours200,
      d.totalOtHours,
      d.avgOtCostPerWorker
    ]);
  });
  const wsDept = XLSX.utils.aoa_to_sheet(deptRows);
  wsDept['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 12 }, { wch: 22 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Department_Cost_Analysis');

  // 2. Production Lines Ranking & Diagnostics Sheet
  const lineHeader = [
    'Rank',
    'Production Line',
    'Department',
    'Workers Count',
    'Total OT Cost (EGP)',
    'Total OT Hours',
    'Avg OT Hours / Worker',
    'Primary Cost Driver / Root Cause',
    'Managerial Action / Recommendation'
  ];
  const lineRows: any[][] = [lineHeader];
  lineStats.forEach((l, i) => {
    lineRows.push([
      `#${i + 1}`,
      l.line,
      l.department,
      l.workerCount,
      l.totalOtCost,
      l.totalOtHours,
      l.avgOtHoursPerWorker,
      l.rootCause,
      l.recommendation
    ]);
  });
  const wsLine = XLSX.utils.aoa_to_sheet(lineRows);
  wsLine['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 22 },
    { wch: 18 }, { wch: 22 }, { wch: 45 }, { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLine, 'Production_Lines_Ranking');

  // 3. Daily Attendance & Labor Shortage Sheet
  const dailyHeader = [
    'Date',
    'Day',
    'Type',
    'Active Workforce',
    'Present',
    'Absent',
    'Attendance %',
    'Absenteeism %',
    'Overtime Hours Generated',
    'Labor Shortage Status'
  ];
  const dailyRows: any[][] = [dailyHeader];
  dailyStats.forEach((d) => {
    const dayType = d.isFriday ? 'Friday Weekend' : d.isHoliday ? 'Official Holiday' : 'Regular Workday';
    dailyRows.push([
      d.date,
      d.dayName,
      dayType,
      d.scheduledCount,
      d.presentCount,
      d.absentCount,
      `${d.attendanceRate.toFixed(1)}%`,
      `${d.absenteeismRate.toFixed(1)}%`,
      d.totalOtHours,
      d.shortageLevel
    ]);
  });
  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  wsDaily['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily_Labor_Shortage');

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

