import * as XLSX from 'xlsx';
import { RawAttendanceRow, RawOvertimeRow } from '../types/audit';
import { parseAttendanceFile, parseOvertimeFile } from './fileParser';

/**
 * Consolidated merged employee record
 */
export interface MergedEmployeeRecord {
  employeeCode: string;          // Employee Code (Primary Key)
  employeeName: string;          // Employee Name
  department: string;            // Department
  totalOvertimeHours: number;    // Total Overtime Hours
  presentDaysCount: number;      // Present Days Count
  absentDaysCount: number;       // Absent Days Count
  overtimeDaysCount: number;     // Overtime Days Count
  restDaysCount: number;         // Rest Days Count
  leaveDaysCount: number;        // Leave Days Count
  sourceOvertimeFilesCount: number; // Number of daily source files
}

/**
 * Merges master attendance sheet with daily overtime files using employee code as primary key
 */
export function mergeAttendanceAndDailyOvertime(
  attendanceData: RawAttendanceRow[],
  dailyOvertimeDataList: RawOvertimeRow[]
): MergedEmployeeRecord[] {
  const mergedMap = new Map<
    string,
    {
      code: string;
      name: string;
      department: string;
      presentDays: number;
      absentDays: number;
      restDays: number;
      leaveDays: number;
      overtimeHours: number;
      overtimeDays: Set<string>;
      sourceFiles: Set<string>;
    }
  >();

  // 1. Process Master Attendance Sheet
  for (const row of attendanceData) {
    const code = row.code ? String(row.code).trim() : '';
    if (!code) continue;

    if (!mergedMap.has(code)) {
      mergedMap.set(code, {
        code,
        name: (row.name && row.name.trim()) || `Employee (${code})`,
        department: (row.department && row.department.trim()) || 'General',
        presentDays: 0,
        absentDays: 0,
        restDays: 0,
        leaveDays: 0,
        overtimeHours: 0,
        overtimeDays: new Set(),
        sourceFiles: new Set()
      });
    }

    const emp = mergedMap.get(code)!;
    if (row.name && row.name.trim() && emp.name.startsWith('Employee (')) {
      emp.name = row.name.trim();
    }
    if (row.department && row.department.trim() && emp.department === 'General') {
      emp.department = row.department.trim();
    }

    // Calculate status counts
    const status = row.status ? row.status.toLowerCase() : 'present';
    if (status === 'present' || status === '\u062d\u0627\u0636\u0631') {
      emp.presentDays += 1;
    } else if (status === 'absent' || status === '\u063a\u0627\u0626\u0628') {
      emp.absentDays += 1;
    } else if (status === 'rest_day' || status === '\u0631\u0627\u062d\u0629') {
      emp.restDays += 1;
    } else if (status === 'leave' || status === 'sick' || status === 'holiday' || status === '\u0625\u062c\u0627\u0632\u0629') {
      emp.leaveDays += 1;
    }
  }

  // 2. Process Daily Overtime Sheets
  for (const otRow of dailyOvertimeDataList) {
    const code = otRow.code ? String(otRow.code).trim() : '';
    if (!code) continue;

    if (!mergedMap.has(code)) {
      mergedMap.set(code, {
        code,
        name: (otRow.name && otRow.name.trim()) || `Employee (${code})`,
        department: (otRow.department && otRow.department.trim()) || 'General',
        presentDays: 0,
        absentDays: 0,
        restDays: 0,
        leaveDays: 0,
        overtimeHours: 0,
        overtimeDays: new Set(),
        sourceFiles: new Set()
      });
    }

    const emp = mergedMap.get(code)!;
    if (otRow.name && otRow.name.trim() && emp.name.startsWith('Employee (')) {
      emp.name = otRow.name.trim();
    }
    if (otRow.department && otRow.department.trim() && emp.department === 'General') {
      emp.department = otRow.department.trim();
    }

    // Add Overtime Hours
    const hours = Number(otRow.hours) || 0;
    emp.overtimeHours += hours;

    if (hours > 0 && otRow.date) {
      emp.overtimeDays.add(otRow.date);
    }

    if (otRow.sourceFile) {
      emp.sourceFiles.add(otRow.sourceFile);
    }
  }

  // 3. Convert Map to Array
  const result: MergedEmployeeRecord[] = [];

  for (const item of mergedMap.values()) {
    result.push({
      employeeCode: item.code,
      employeeName: item.name,
      department: item.department,
      totalOvertimeHours: Number(item.overtimeHours.toFixed(1)),
      presentDaysCount: item.presentDays,
      absentDaysCount: item.absentDays,
      overtimeDaysCount: item.overtimeDays.size,
      restDaysCount: item.restDays,
      leaveDaysCount: item.leaveDays,
      sourceOvertimeFilesCount: item.sourceFiles.size
    });
  }

  // Sort by code naturally
  return result.sort((a, b) => {
    const numA = parseInt(a.employeeCode, 10);
    const numB = parseInt(b.employeeCode, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.employeeCode.localeCompare(b.employeeCode);
  });
}

/**
 * Async merger from browser File objects
 */
export async function processFilesAndMerge(
  attendanceFile: File,
  overtimeFiles: File[]
): Promise<MergedEmployeeRecord[]> {
  const attResult = await parseAttendanceFile(attendanceFile);

  const allOtRows: RawOvertimeRow[] = [];
  for (const otFile of overtimeFiles) {
    const otResult = await parseOvertimeFile(otFile);
    allOtRows.push(...otResult.rows);
  }

  return mergeAttendanceAndDailyOvertime(attResult.rows, allOtRows);
}

/**
 * Export consolidated audit report to Excel (.xlsx)
 */
export function exportSingleConsolidatedExcel(
  records: MergedEmployeeRecord[],
  fileNamePrefix: string = 'Consolidated_Audit_Report'
) {
  const wb = XLSX.utils.book_new();

  const sheetData = records.map((r, index) => ({
    '#': index + 1,
    'Employee Code': r.employeeCode,
    'Employee Name': r.employeeName,
    'Department': r.department,
    'Total Overtime Hours': r.totalOvertimeHours,
    'Present Days': r.presentDaysCount,
    'Absent Days': r.absentDaysCount,
    'Overtime Days': r.overtimeDaysCount,
    'Leaves & Rest Days': r.restDaysCount + r.leaveDaysCount,
    'Attendance %': (r.presentDaysCount + r.absentDaysCount) > 0 
      ? `${Math.round((r.presentDaysCount / (r.presentDaysCount + r.absentDaysCount)) * 100)}%`
      : '100%'
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 16 }, // Employee Code
    { wch: 30 }, // Employee Name
    { wch: 25 }, // Department
    { wch: 22 }, // Total Overtime Hours
    { wch: 16 }, // Present Days
    { wch: 16 }, // Absent Days
    { wch: 16 }, // Overtime Days
    { wch: 18 }, // Leaves
    { wch: 16 }  // Attendance %
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Consolidated_Audit_Summary');

  const dateStr = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileNamePrefix}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fullFileName);
}
