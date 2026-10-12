import { RawAttendanceRow, RawOvertimeRow, UploadedFileInfo } from '../types/audit';

export interface SampleDataset {
  attendanceRows: RawAttendanceRow[];
  overtimeRows: RawOvertimeRow[];
  files: UploadedFileInfo[];
}

export function generateSampleAuditData(): SampleDataset {
  const employees = [
    { code: '1001', name: 'Ahmed Mahmoud Ibrahim', dept: 'Production Line A' },
    { code: '1002', name: 'Mohamed Ali Elsayed', dept: 'Production Line A' },
    { code: '1003', name: 'Mahmoud Hassan Abdelal', dept: 'Mechanical Maintenance' },
    { code: '1004', name: 'Ibrahim Samy Khalil', dept: 'Quality Assurance (QA)' },
    { code: '1005', name: 'Tarek Abdelmoneim Radwan', dept: 'Warehouse & Storage' },
    { code: '1006', name: 'Yasser Farouk El Shennawy', dept: 'Production Line B' },
    { code: '1007', name: 'Hossam Mostafa El Gohary', dept: 'Electrical Maintenance' },
    { code: '1008', name: 'Karim Adel El Banna', dept: 'Packaging & Finishing' },
    { code: '1009', name: 'Sayed Ragab Metwally', dept: 'Production Line A' },
    { code: '1010', name: 'Omar Sherif El Dessouky', dept: 'Industrial Safety (HSE)' },
    { code: '1011', name: 'Ayman Salah El Naggar', dept: 'Warehouse & Storage' },
    { code: '1012', name: 'Ramy Kamal Tawfik', dept: 'Quality Assurance (QA)' },
    { code: '1013', name: 'Ashraf Abdelfattah Badr', dept: 'Mechanical Maintenance' },
    { code: '1014', name: 'Hany Zakariya Matar', dept: 'Production Line B' },
    { code: '1015', name: 'Wael Sobhy El Menshawy', dept: 'Packaging & Finishing' },
    { code: '1016', name: 'Mostafa Kamal Eldin', dept: 'Logistics & Transport' },
    { code: '1017', name: 'Khaled Youssef El Alfy', dept: 'Production Line A' },
    { code: '1018', name: 'Amr Fouad El Gammal', dept: 'Electrical Maintenance' },
    { code: '1019', name: 'Maged Bahaa Eldin', dept: 'Production Line B' },
    { code: '1020', name: 'Ziad Nader El Kady', dept: 'Warehouse & Storage' }
  ];

  const attendanceRows: RawAttendanceRow[] = [];
  const overtimeRows: RawOvertimeRow[] = [];

  // Generate 20 working days for month of October
  const daysInAudit = 20;

  for (let day = 1; day <= daysInAudit; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `2026-10-${dayStr}`;
    const isFriday = day % 7 === 5; // Friday rest day

    employees.forEach((emp) => {
      if (isFriday) {
        attendanceRows.push({
          code: emp.code,
          name: emp.name,
          department: emp.dept,
          date,
          status: 'rest_day',
          notes: 'Weekend (Friday Rest Day)'
        });
      } else {
        // Deterministic realistic attendance patterns
        const empNum = parseInt(emp.code, 10);
        let status: 'present' | 'absent' | 'leave' | 'sick' = 'present';
        let checkIn = '07:30';
        let checkOut = '15:30';
        let notes = '';

        // Employee 1003 has sick leave on day 4 & 5
        if (empNum === 1003 && (day === 4 || day === 5)) {
          status = 'sick';
          checkIn = '';
          checkOut = '';
          notes = 'Certified Sick Leave Medical Report #402';
        }
        // Employee 1006 absent on day 8 and 12
        else if (empNum === 1006 && (day === 8 || day === 12)) {
          status = 'absent';
          checkIn = '';
          checkOut = '';
          notes = 'Unexcused Absence (Workday)';
        }
        // Employee 1009 absent on day 15
        else if (empNum === 1009 && day === 15) {
          status = 'absent';
          checkIn = '';
          checkOut = '';
          notes = 'Absent without Permission';
        }
        // Employee 1014 leave on day 10
        else if (empNum === 1014 && day === 10) {
          status = 'leave';
          checkIn = '';
          checkOut = '';
          notes = 'Approved Annual Leave';
        }
        // Employee 1017 absent on day 3
        else if (empNum === 1017 && day === 3) {
          status = 'absent';
          checkIn = '';
          checkOut = '';
        }

        attendanceRows.push({
          code: emp.code,
          name: emp.name,
          department: emp.dept,
          date,
          status,
          checkIn: status === 'present' ? checkIn : undefined,
          checkOut: status === 'present' ? checkOut : undefined,
          notes
        });
      }
    });
  }

  // Generate Daily Overtime sheets (representing daily separate files)
  const otDays = [
    { day: 1, emps: ['1001', '1002', '1003', '1009', '1017'], hours: [2, 2.5, 3, 2, 2] },
    { day: 2, emps: ['1001', '1005', '1006', '1011'], hours: [1.5, 2, 2, 3] },
    { day: 3, emps: ['1002', '1007', '1013', '1017'], hours: [3, 2.5, 3.5, 2] }, // Note: 1017 was absent on day 3! Audit anomaly
    { day: 4, emps: ['1004', '1008', '1015'], hours: [2, 2, 2.5] },
    { day: 6, emps: ['1001', '1003', '1007', '1018'], hours: [2.5, 2, 3, 2.5] },
    { day: 7, emps: ['1002', '1006', '1010', '1014'], hours: [2, 2, 1.5, 2] },
    { day: 9, emps: ['1005', '1011', '1020', '1001'], hours: [3, 2.5, 2, 2] },
    { day: 11, emps: ['1003', '1013', '1007', '1018'], hours: [4.5, 4, 3, 2] }, // High OT day (Maintenance shutdown overhaul)
    { day: 13, emps: ['1008', '1015', '1004', '1012'], hours: [2.5, 3, 2, 1.5] },
    { day: 14, emps: ['1001', '1002', '1009', '1016'], hours: [2, 2, 2, 3] },
    { day: 16, emps: ['1005', '1011', '1003', '1019'], hours: [2, 2.5, 2, 2] },
    { day: 18, emps: ['1006', '1014', '1001', '1007'], hours: [3, 2.5, 2, 3] }
  ];

  const files: UploadedFileInfo[] = [
    {
      id: 'att-master-01',
      fileName: 'Master_Attendance_Sheet_October_2026.xlsx',
      fileSize: 184500,
      type: 'attendance',
      rowsCount: attendanceRows.length,
      uploadedAt: 'Just now'
    }
  ];

  otDays.forEach((ot) => {
    const dayStr = ot.day < 10 ? `0${ot.day}` : `${ot.day}`;
    const date = `2026-10-${dayStr}`;
    const fileName = `Daily_Overtime_${dayStr}_10_2026.xlsx`;

    files.push({
      id: `ot-day-${dayStr}`,
      fileName,
      fileSize: 42300,
      type: 'overtime',
      dateAttached: date,
      rowsCount: ot.emps.length,
      uploadedAt: 'Just now'
    });

    ot.emps.forEach((empCode, idx) => {
      const emp = employees.find((e) => e.code === empCode);
      const hours = ot.hours[idx];
      overtimeRows.push({
        code: empCode,
        name: emp?.name || `Employee ${empCode}`,
        department: emp?.dept || 'General',
        date,
        hours,
        sourceFile: fileName,
        reason: 'Overtime shift for export order delivery'
      });
    });
  });

  return {
    attendanceRows,
    overtimeRows,
    files
  };
}
