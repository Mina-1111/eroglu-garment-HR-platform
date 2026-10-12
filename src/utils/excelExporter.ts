import * as XLSX from 'xlsx';
import { EmployeeAuditSummary, AuditCompanyInfo } from '../types/audit';

export function exportMasterAuditToExcel(
  summaries: EmployeeAuditSummary[],
  companyInfo: AuditCompanyInfo
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Consolidated Audit Sheet
  const masterData = summaries.map((s, index) => {
    const flagsSummary = s.flags.length > 0 
      ? s.flags.map(f => `[${f.type === 'danger' ? 'Danger' : 'Warning'}] ${f.title}`).join(' | ')
      : 'Compliant & Verified';

    return {
      '#': index + 1,
      'Employee Code': s.code,
      'Employee Name': s.name,
      'Department': s.department,
      'Present Days': s.presentDays,
      'Absent Days': s.absentDays,
      'Leaves & Holidays': s.restDays + s.leaveDays,
      'Total Overtime Hours': s.totalOvertimeHours,
      'Overtime Days Count': s.overtimeDaysCount,
      'Average Daily Overtime': s.avgDailyOvertime,
      'Max Single Day OT': s.maxSingleDayOvertime,
      'Attendance Rate %': `${s.attendanceRate}%`,
      'Audit Flags & Notes': flagsSummary,
      'HR Reviewer Notes': s.manualNote || '',
      'Audit Status': s.isAudited ? 'Approved & Audited' : 'Under Review'
    };
  });

  const lastMasterRow = summaries.length + 1;
  const masterAoa: any[][] = [
    [
      '#',
      'Employee Code',
      'Employee Name',
      'Department',
      'Present Days',
      'Absent Days',
      'Leaves & Holidays',
      'Total Overtime Hours',
      'Overtime Days Count',
      'Average Daily Overtime',
      'Max Single Day OT',
      'Attendance Rate %',
      'Audit Flags & Notes',
      'HR Reviewer Notes',
      'Audit Status'
    ],
    ...masterData.map((d) => [
      d['#'],
      d['Employee Code'],
      d['Employee Name'],
      d['Department'],
      d['Present Days'],
      d['Absent Days'],
      d['Leaves & Holidays'],
      d['Total Overtime Hours'],
      d['Overtime Days Count'],
      d['Average Daily Overtime'],
      d['Max Single Day OT'],
      d['Attendance Rate %'],
      d['Audit Flags & Notes'],
      d['HR Reviewer Notes'],
      d['Audit Status']
    ])
  ];

  if (summaries.length > 0) {
    masterAoa.push([
      '-',
      'Grand Total',
      '-',
      '-',
      { t: 'n', f: `SUM(E2:E${lastMasterRow})`, v: summaries.reduce((s, x) => s + x.presentDays, 0) },
      { t: 'n', f: `SUM(F2:F${lastMasterRow})`, v: summaries.reduce((s, x) => s + x.absentDays, 0) },
      { t: 'n', f: `SUM(G2:G${lastMasterRow})`, v: summaries.reduce((s, x) => s + (x.restDays + x.leaveDays), 0) },
      { t: 'n', f: `SUM(H2:H${lastMasterRow})`, v: Number(summaries.reduce((s, x) => s + x.totalOvertimeHours, 0).toFixed(2)) },
      { t: 'n', f: `SUM(I2:I${lastMasterRow})`, v: summaries.reduce((s, x) => s + x.overtimeDaysCount, 0) },
      '-',
      '-',
      '-',
      '-',
      '-',
      `${summaries.length} employees`
    ]);
  }

  const wsMaster = XLSX.utils.aoa_to_sheet(masterAoa);

  wsMaster['!cols'] = [
    { wch: 6 },  // #
    { wch: 16 }, // Code
    { wch: 30 }, // Name
    { wch: 25 }, // Dept
    { wch: 14 }, // Present
    { wch: 14 }, // Absent
    { wch: 18 }, // Leaves
    { wch: 22 }, // Total OT
    { wch: 18 }, // OT Days
    { wch: 20 }, // Avg OT
    { wch: 18 }, // Max OT
    { wch: 18 }, // Rate %
    { wch: 40 }, // Flags
    { wch: 25 }, // Notes
    { wch: 20 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsMaster, 'Master_Audit_Report');

  // Sheet 2: Daily Overtime detailed log
  const dailyOtData: any[] = [];
  summaries.forEach((emp) => {
    emp.dailyEntries
      .filter((e) => e.overtimeHours > 0)
      .forEach((entry) => {
        dailyOtData.push({
          'Employee Code': emp.code,
          'Employee Name': emp.name,
          'Department': emp.department,
          'Date': entry.date,
          'Day of Week': entry.dayName,
          'Overtime Hours': entry.overtimeHours,
          'Attendance Status': entry.attendanceStatus === 'present' ? 'Present' : entry.attendanceStatus === 'absent' ? 'Absent (Anomaly!)' : entry.attendanceStatus,
          'Daily Source File': entry.overtimeSourceFiles.join(', ') || 'Daily Sheet',
          'Reason & Notes': entry.notes || ''
        });
      });
  });

  if (dailyOtData.length > 0) {
    const lastOtRow = dailyOtData.length + 1;
    const otAoa: any[][] = [
      ['Employee Code', 'Employee Name', 'Department', 'Date', 'Day of Week', 'Overtime Hours', 'Attendance Status', 'Daily Source File', 'Reason & Notes'],
      ...dailyOtData.map((d) => [
        d['Employee Code'],
        d['Employee Name'],
        d['Department'],
        d['Date'],
        d['Day of Week'],
        d['Overtime Hours'],
        d['Attendance Status'],
        d['Daily Source File'],
        d['Reason & Notes']
      ]),
      [
        '-',
        'Total Overtime',
        '-',
        '-',
        '-',
        { t: 'n', f: `SUM(F2:F${lastOtRow})`, v: Number(dailyOtData.reduce((s, x) => s + x['Overtime Hours'], 0).toFixed(2)) },
        '-',
        `${dailyOtData.length} records`,
        '-'
      ]
    ];
    const wsOt = XLSX.utils.aoa_to_sheet(otAoa);
    wsOt['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 30 },
      { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOt, 'Daily_Overtime_Log');
  }

  // Sheet 3: Discrepancies and Audit Flags
  const flagRows: any[] = [];
  summaries.forEach((emp) => {
    if (emp.flags.length > 0) {
      emp.flags.forEach((f) => {
        flagRows.push({
          'Employee Code': emp.code,
          'Employee Name': emp.name,
          'Department': emp.department,
          'Severity': f.type === 'danger' ? 'Critical Conflict' : 'Audit Notice',
          'Notice Title': f.title,
          'Description': f.description,
          'Associated Date': f.date || 'All Period'
        });
      });
    }
  });

  if (flagRows.length > 0) {
    const wsFlags = XLSX.utils.json_to_sheet(flagRows);
    wsFlags['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 24 },
      { wch: 20 },
      { wch: 35 },
      { wch: 50 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsFlags, 'Audit_Flags_Discrepancies');
  }

  const safeTitle = (companyInfo.auditName || 'Master_Audit_Report').replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFileName = `${safeTitle}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fullFileName);
}

export function exportSingleEmployeeAuditToExcel(
  employee: EmployeeAuditSummary,
  companyInfo: AuditCompanyInfo
) {
  const wb = XLSX.utils.book_new();

  // Employee Header summary
  const summaryData = [
    { 'Parameter': 'Employee Code', 'Value': employee.code },
    { 'Parameter': 'Employee Name', 'Value': employee.name },
    { 'Parameter': 'Department', 'Value': employee.department },
    { 'Parameter': 'Audit Period', 'Value': companyInfo.auditPeriod },
    { 'Parameter': 'Present Days', 'Value': employee.presentDays },
    { 'Parameter': 'Absent Days', 'Value': employee.absentDays },
    { 'Parameter': 'Total Overtime Hours', 'Value': `${employee.totalOvertimeHours} hrs` },
    { 'Parameter': 'Overtime Days Count', 'Value': employee.overtimeDaysCount },
    { 'Parameter': 'Attendance Rate', 'Value': `${employee.attendanceRate}%` },
    { 'Parameter': 'Audit Status', 'Value': employee.flags.length === 0 ? 'Compliant & Verified' : `${employee.flags.length} Audit Notice(s)` }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Employee_Profile');

  // Daily Breakdown sheet
  const timelineData = employee.dailyEntries.map((d, i) => ({
    '#': i + 1,
    'Date': d.date,
    'Day of Week': d.dayName,
    'Attendance Status': d.attendanceStatus === 'present' ? 'Present' : d.attendanceStatus === 'absent' ? 'Absent' : d.attendanceStatus === 'rest_day' ? 'Weekly Rest Day' : d.attendanceStatus === 'sick' ? 'Sick Leave' : 'Leave',
    'Check In': d.checkIn || '-',
    'Check Out': d.checkOut || '-',
    'Overtime Hours': d.overtimeHours > 0 ? d.overtimeHours : 0,
    'Source Files': d.overtimeSourceFiles.join(', ') || '-',
    'Notes / Conflict': d.conflictReason || d.notes || '-'
  }));

  const lastTimeRow = timelineData.length + 1;
  const timeAoa: any[][] = [
    ['#', 'Date', 'Day of Week', 'Attendance Status', 'Check In', 'Check Out', 'Overtime Hours', 'Source Files', 'Notes / Conflict'],
    ...timelineData.map((d) => [
      d['#'],
      d['Date'],
      d['Day of Week'],
      d['Attendance Status'],
      d['Check In'],
      d['Check Out'],
      d['Overtime Hours'],
      d['Source Files'],
      d['Notes / Conflict']
    ]),
    [
      '-',
      'Total Overtime Hours',
      '-',
      '-',
      '-',
      '-',
      { t: 'n', f: `SUM(G2:G${lastTimeRow})`, v: employee.totalOvertimeHours },
      '-',
      `${timelineData.length} records`
    ]
  ];

  const wsTimeline = XLSX.utils.aoa_to_sheet(timeAoa);
  wsTimeline['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 25 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Daily_Overtime_Log');

  const cleanName = employee.name.replace(/\s+/g, '_');
  const fileName = `Audit_Dossier_${employee.code}_${cleanName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
