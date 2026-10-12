import * as XLSX from 'xlsx';
import { EmployeeOvertimeSummary } from '../types/overtime';
import { checkIsFriday } from './biometricParser';
import { getExcelColumnLetter } from './biometricExcelExport';

export function exportMatrixOvertimeExcel(
  employees: EmployeeOvertimeSummary[],
  allDates: string[],
  companyTitle: string = 'Overtime_Audit_Report'
) {
  const wb = XLSX.utils.book_new();

  // Columns layout:
  // Col 1 (A): '#'
  // Col 2 (B): 'Employee Code'
  // Col 3 (C): 'Employee Name'
  // Col 4 (D): 'Department'
  // Cols 5 to (4 + allDates.length): Date columns (from 'E' onwards)
  // Col (5 + allDates.length): 'Days Count'
  // Col (6 + allDates.length): 'Friday 2x Hours'
  // Col (7 + allDates.length): 'Total Overtime Hours'

  const dateStartCol = getExcelColumnLetter(5); // 'E'
  const dateEndCol = getExcelColumnLetter(4 + allDates.length);
  const daysCountCol = getExcelColumnLetter(5 + allDates.length);
  const friCol = getExcelColumnLetter(6 + allDates.length);
  const totCol = getExcelColumnLetter(7 + allDates.length);

  const headerRow: string[] = [
    '#',
    'Employee Code',
    'Employee Name',
    'Department',
    ...allDates,
    'Days Count',
    'Friday 2x Hours',
    'Total Overtime Hours'
  ];

  const aoa: any[][] = [headerRow];

  // Identify Friday column letters
  const friColLetters: string[] = [];
  allDates.forEach((d, i) => {
    if (checkIsFriday(d)) {
      friColLetters.push(getExcelColumnLetter(5 + i));
    }
  });

  employees.forEach((emp, index) => {
    const r = index + 2; // Excel 1-based row number
    const rowVals: any[] = [
      index + 1,
      emp.code,
      emp.name,
      emp.department
    ];

    for (const d of allDates) {
      const h = emp.dailyHours[d];
      const isFri = checkIsFriday(d);
      rowVals.push(h !== undefined && h > 0 ? h : (isFri ? '' : 0));
    }

    // Formulas:
    // 1. Days count (>0)
    const daysFormula = allDates.length > 0
      ? `COUNTIF(${dateStartCol}${r}:${dateEndCol}${r}, ">0")`
      : '0';

    // 2. Friday 2x sum
    const friFormula = friColLetters.length > 0
      ? `SUM(${friColLetters.map((c) => `${c}${r}`).join(', ')})`
      : '0';

    // 3. Total overtime sum
    const totalFormula = allDates.length > 0
      ? `SUM(${dateStartCol}${r}:${dateEndCol}${r})`
      : '0';

    rowVals.push(
      { t: 'n', f: daysFormula, v: emp.daysCount },
      { t: 'n', f: friFormula, v: emp.fridayHours || 0 },
      { t: 'n', f: totalFormula, v: emp.totalHours }
    );

    aoa.push(rowVals);
  });

  const lastDataRow = employees.length + 1;
  const footerRow = lastDataRow + 1;

  if (employees.length > 0) {
    const footerVals: any[] = [
      '-',
      'Grand Total',
      '-',
      '-'
    ];

    allDates.forEach((d, i) => {
      const colLetter = getExcelColumnLetter(5 + i);
      const dayTotal = employees.reduce((acc, emp) => acc + (emp.dailyHours[d] || 0), 0);
      footerVals.push({
        t: 'n',
        f: `SUM(${colLetter}2:${colLetter}${lastDataRow})`,
        v: Number(dayTotal.toFixed(2))
      });
    });

    const grandTotalFriday = employees.reduce((acc, emp) => acc + (emp.fridayHours || 0), 0);
    const grandTotal = employees.reduce((acc, emp) => acc + (emp.totalHours || 0), 0);

    footerVals.push(
      '-',
      { t: 'n', f: `SUM(${friCol}2:${friCol}${lastDataRow})`, v: Number(grandTotalFriday.toFixed(2)) },
      { t: 'n', f: `SUM(${totCol}2:${totCol}${lastDataRow})`, v: Number(grandTotal.toFixed(2)) }
    );

    aoa.push(footerVals);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  const cols = [
    { wch: 6 },  // #
    { wch: 16 }, // Employee Code
    { wch: 30 }, // Employee Name
    { wch: 25 }  // Department
  ];

  for (let i = 0; i < allDates.length; i++) {
    cols.push({ wch: 14 }); // date column
  }
  cols.push({ wch: 14 }); // Days Count
  cols.push({ wch: 16 }); // Friday 2x Hours
  cols.push({ wch: 22 }); // Total hours

  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Daily_Overtime_Matrix');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${companyTitle}_${todayStr}.xlsx`);
}

export function exportSingleEmployeeExcel(emp: EmployeeOvertimeSummary, allDates: string[]) {
  const wb = XLSX.utils.book_new();

  // Summary headers in English
  const infoData = [
    { 'Parameter': 'Employee Code', 'Value': emp.code },
    { 'Parameter': 'Employee Name', 'Value': emp.name },
    { 'Parameter': 'Department', 'Value': emp.department },
    { 'Parameter': 'Total Overtime Hours', 'Value': `${emp.totalHours} hrs` },
    { 'Parameter': 'Friday 2x Overtime Hours', 'Value': `${emp.fridayHours || 0} hrs` },
    { 'Parameter': 'Recorded Overtime Days', 'Value': `${emp.daysCount} days` },
    { 'Parameter': 'Total Audit Period Days', 'Value': `${allDates.length} days` }
  ];

  const wsInfo = XLSX.utils.json_to_sheet(infoData);
  wsInfo['!cols'] = [{ wch: 28 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Employee_Profile');

  // Detailed Day-by-Day Table with ALL dates of the period (With live SUM formulas)
  const header = ['#', 'Date (File Name)', 'Overtime Hours', 'Friday 2x Hours', 'Status'];
  const dayRows: any[][] = [header];

  allDates.forEach((d, index) => {
    const hours = emp.dailyHours[d] || 0;
    const isFri = checkIsFriday(d);
    dayRows.push([
      index + 1,
      d,
      hours > 0 ? hours : (isFri ? '' : 0),
      isFri && hours > 0 ? hours : (isFri ? '' : 0),
      hours > 0 ? (isFri ? 'Friday 2x Overtime' : 'Recorded Overtime') : (isFri ? 'Weekly Holiday (Friday)' : 'No Overtime')
    ]);
  });

  const lastRow = allDates.length + 1;
  dayRows.push([
    '-',
    'Total Overtime Hours',
    { t: 'n', f: `SUM(C2:C${lastRow})`, v: emp.totalHours },
    { t: 'n', f: `SUM(D2:D${lastRow})`, v: emp.fridayHours || 0 },
    `${emp.daysCount} days recorded`
  ]);

  const wsDays = XLSX.utils.aoa_to_sheet(dayRows);
  wsDays['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsDays, 'Itemized_Daily_Log');

  const cleanName = emp.name.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Overtime_Report_${emp.code}_${cleanName}.xlsx`);
}
