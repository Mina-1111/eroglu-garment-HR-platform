import * as XLSX from 'xlsx';
import { ReconciliationItem, ReconciliationSummary } from '../types/reconciliation';

export function exportReconciliationExcel(
  items: ReconciliationItem[],
  summary: ReconciliationSummary,
  companyName: string = 'Eroglu Garments Egypt - HR & Internal Audit'
) {
  const wb = XLSX.utils.book_new();

  // Signature Block Template
  const signatureRows = [
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Official Overtime Audit & Executive Sign-off Block'],
    [''],
    ['Official Title', 'Full Responsible Name', 'Signature', 'Date / Official Seal'],
    ['1. HR Timekeeper & Biometric Auditor:', '', '______________________', `____/____/2026`],
    ['2. Head of Cost Accounting & Payroll:', '', '______________________', `____/____/2026`],
    ['3. Production General Manager:', '', '______________________', `____/____/2026`],
    ['4. Final Approval: Plant General Manager:', '', '______________________', `[ Plant Official Seal ]`],
    ['']
  ];

  // Sheet 1: Executive Audit Summary
  const summaryRows = [
    [companyName],
    ['Executive Audit Report: Biometric Punch System vs Manual Paper Overtime Sheets'],
    [`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`],
    ['Audit Scope: Shift 1 workers who continued for overtime | 5:00 PM Break = 2.0h | 8:00 PM Shift = 4.5h | Exclude Admin Staff'],
    [''],
    ['Audit KPI', 'Count / Value', 'Unit / Diagnostic Classification'],
    ['Total Workforce Evaluated', summary.totalEmployees, 'Employees'],
    ['Total Audited Workdays', summary.totalDaysEvaluated, 'Daily records'],
    ['Shift 1 Workers Continuing for Overtime', summary.shift1ContinuedOtCount || summary.totalDaysEvaluated, 'Shift 1 overtime cases'],
    ['Broke 5:00 PM (Punched) but Missing in Paper', summary.punchedNotInPaperCount, 'Cases credited (2.0h or 4.5h)'],
    ['Punched 3:30 PM (Normal Departure) Claimed in Paper', summary.unearnedLeftAt330Count || 0, 'Rejected claims (0 OT credited)'],
    ['Recorded in Paper with No Machine Punch', summary.inPaperNoPunchCount, 'Pending/unverified claims'],
    ['Hours Mismatch Between Biometric and Paper', summary.hoursMismatchCount, 'Discrepancy cases'],
    ['Fully Matched and Verified Overtime', summary.fullyMatchedCount, 'Fully matched records'],
    ['Regular Workday (Departed before 5:00 PM)', summary.noOvertimeCount, 'Normal workdays'],
    ['Excluded Administrative Staff', summary.excludedAdminCount, 'Excluded admin records'],
    [''],
    ['Total Approved Biometric Overtime Hours', summary.totalApprovedOtHours || summary.totalBiometricOtHours, 'Approved Hours'],
    ['Total Paper Overtime Hours Requested', summary.totalPaperOtHours, 'Requested Hours'],
    ['Hours Variance (Paper - Biometric)', summary.hoursVariance, summary.hoursVariance > 0 ? 'Excess paper claims' : 'Unclaimed biometric hours'],
    ['Estimated Financial Risk Exposure', `${summary.estimatedFinancialRiskEGP.toLocaleString()} EGP`, 'Financial Exposure'],
    [''],
    ['Audit Committee Directives & Governing Rules:'],
    ['1. Biometric punch checkout is the sole governing authority. Departures at 3:30 PM receive 0 overtime regardless of paper claims.'],
    ['2. Workers breaking 5:00 PM are credited strictly 2.0 hours. Departures past 7:30 PM (8:00 PM Shift) receive 4.5 hours.'],
    ['3. Departures before 5:00 PM receive zero overtime hours.'],
    ['4. Administrative departments (HR, Finance, IT, Office) are strictly excluded from factory overtime payroll.'],
    ['5. Ghost claims in paper without biometric attendance are suspended pending investigation.'],
    ...signatureRows
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 25 }, { wch: 35 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // Sheet 2: Discrepancies Only
  const discrepancyItems = items.filter(
    (i) => i.status === 'PUNCHED_NOT_IN_PAPER' || i.status === 'IN_PAPER_NO_PUNCH' || i.status === 'HOURS_MISMATCH'
  );

  const discHeader = [
    '#',
    'Worker Code',
    'Worker Name',
    'Department',
    'Dept Status',
    'Line',
    'Date',
    'Day',
    'Reconciliation Status',
    'Punch In',
    'Punch Out',
    'Broke 5:00 PM?',
    'Governing Rule Applied',
    'Approved Biometric OT',
    'Paper Sheet OT',
    'Hours Variance',
    'Logged Supervisor',
    'Diagnosis & Root Cause',
    'Approved Managerial Action'
  ];

  const discRows = discrepancyItems.map((item, idx) => [
    idx + 1,
    item.code,
    item.name,
    item.department,
    item.isExcludedDept ? 'Admin (Excluded)' : 'Production (Eligible)',
    item.line || '-',
    item.date,
    item.dayName,
    item.statusTitleEn || item.status,
    item.biometricIn || '-',
    item.biometricOut || '-',
    item.exceeded5pm ? 'Yes (Broke 5 PM)' : 'No (Before 5 PM)',
    item.calculatedOtRule,
    item.biometricOtHours,
    item.paperOtHours,
    item.diffHours > 0 ? `+${item.diffHours}` : item.diffHours,
    item.paperSupervisor || '-',
    item.explanationAr,
    item.suggestedActionAr
  ]);

  const wsDisc = XLSX.utils.aoa_to_sheet([discHeader, ...discRows, ...signatureRows]);
  wsDisc['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 32 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 55 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDisc, 'Discrepancies & Approvals');

  // Sheet 3: Full Audit Log
  const fullHeader = [
    '#',
    'Worker Code',
    'Worker Name',
    'Department',
    'Dept Status',
    'Line',
    'Date',
    'Day',
    'Reconciliation Status',
    'Biometric Status',
    'Punch In',
    'Punch Out',
    'Broke 5 PM?',
    'Governing Rule Applied',
    'Worked Hours',
    'Approved Biometric OT',
    '1.35x OT Hours',
    '1.70x OT Hours',
    '2.0x Fri/Hol OT Hours',
    'Paper Sheet OT Hours',
    'Hours Variance',
    'Supervisor',
    'Paper Notes',
    'Audit Diagnosis & Decision'
  ];

  const fullRows = items.map((item, idx) => [
    idx + 1,
    item.code,
    item.name,
    item.department,
    item.isExcludedDept ? 'Admin (Excluded)' : 'Production (Eligible)',
    item.line || '-',
    item.date,
    item.dayName,
    item.statusTitleEn || item.status,
    item.biometricStatus || '-',
    item.biometricIn || '-',
    item.biometricOut || '-',
    item.exceeded5pm ? 'Yes' : 'No',
    item.calculatedOtRule,
    item.biometricWorkedHours,
    item.biometricOtHours,
    item.rate135Hours,
    item.rate170Hours,
    item.rate200Hours,
    item.paperOtHours,
    item.diffHours > 0 ? `+${item.diffHours}` : item.diffHours,
    item.paperSupervisor || '-',
    item.paperNotes || '-',
    item.explanationAr
  ]);

  const wsFull = XLSX.utils.aoa_to_sheet([fullHeader, ...fullRows, ...signatureRows]);
  wsFull['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 26 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsFull, 'Full Reconciliation Log');

  const nowStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Audit_Biometric_vs_Paper_Official_${nowStr}.xlsx`);
}

/**
 * Export any specific category (e.g. Shift 1 Broke 5 PM Missing in Paper, Paper with No Punch, etc.)
 * directly to a dedicated Excel file with executive headers and official signature block.
 */
export function exportCategoryExcel({
  categoryTitle,
  items,
  fileName,
  companyName = 'Eroglu Garments Egypt - HR Audit'
}: {
  categoryTitle: string;
  items: ReconciliationItem[];
  fileName?: string;
  companyName?: string;
}) {
  const wb = XLSX.utils.book_new();

  const totalBiometricHours = Number(items.reduce((acc, i) => acc + (i.biometricOtHours || 0), 0).toFixed(2));
  const totalPaperHours = Number(items.reduce((acc, i) => acc + (i.paperOtHours || 0), 0).toFixed(2));
  const diffHours = Number((totalPaperHours - totalBiometricHours).toFixed(2));

  // Signature Block Template
  const signatureRows = [
    [''],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Official Overtime Audit & Executive Sign-off Block'],
    [''],
    ['Official Title', 'Full Responsible Name', 'Signature', 'Date / Official Seal'],
    ['1. HR Timekeeper & Biometric Auditor:', '', '______________________', `____/____/2026`],
    ['2. Head of Cost Accounting & Payroll:', '', '______________________', `____/____/2026`],
    ['3. Production General Manager:', '', '______________________', `____/____/2026`],
    ['4. Final Approval: Plant General Manager:', '', '______________________', `[ Plant Official Seal ]`],
    ['']
  ];

  const headerBanner = [
    [companyName],
    [`Official Audit Report: ${categoryTitle}`],
    [`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`],
    [
      `Total Cases: ${items.length} | Total Approved Biometric OT: ${totalBiometricHours}h | Total Paper OT Requested: ${totalPaperHours}h | Variance: ${diffHours}h`
    ],
    ['Governing Audit Rules: Biometric punch checkout governs (3:30 = 0h) | Broke 5:00 PM = 2.0h | 8:00 PM Shift = 4.5h | Exclude Admin'],
    ['']
  ];

  const columns = [
    '#',
    'Worker Code',
    'Worker Name',
    'Department',
    'Dept Status',
    'Line',
    'Shift',
    'Date',
    'Day',
    'Reconciliation Diagnosis',
    'Punch In',
    'Punch Out',
    'Broke 5 PM?',
    'Governing Rule Applied',
    'Total Worked Hours',
    'Approved Biometric OT',
    'Paper Sheet OT',
    'Hours Variance',
    'Logged Supervisor',
    'Paper Notes',
    'Audit Diagnosis & Decision'
  ];

  const dataRows = items.map((item, idx) => [
    idx + 1,
    item.code,
    item.name,
    item.department,
    item.isExcludedDept ? 'Admin (Excluded)' : 'Production (Eligible)',
    item.line || '-',
    item.isShift1 ? 'Shift 1 Morning (07:30)' : (item.shiftName || '-'),
    item.date,
    item.dayName,
    item.statusTitleEn || item.statusTitleAr,
    item.biometricIn || '-',
    item.biometricOut || '-',
    item.exceeded5pm ? 'Yes (Broke 5 PM)' : 'No (Before 5 PM)',
    item.calculatedOtRule,
    item.biometricWorkedHours,
    item.biometricOtHours,
    item.paperOtHours,
    item.diffHours > 0 ? `+${item.diffHours}` : item.diffHours,
    item.paperSupervisor || '-',
    item.paperNotes || '-',
    item.explanationAr || item.suggestedActionAr || '-'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    ...headerBanner,
    columns,
    ...dataRows,
    ...signatureRows
  ]);

  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 12 },  // Code
    { wch: 25 },  // Name
    { wch: 16 },  // Dept
    { wch: 15 },  // Dept Status
    { wch: 10 },  // Line
    { wch: 18 },  // Shift
    { wch: 12 },  // Date
    { wch: 10 },  // Day
    { wch: 32 },  // Status
    { wch: 12 },  // In
    { wch: 12 },  // Out
    { wch: 16 },  // Broke 5pm
    { wch: 26 },  // Rule
    { wch: 14 },  // Worked Hours
    { wch: 15 },  // Biometric OT
    { wch: 15 },  // Paper OT
    { wch: 16 },  // Diff
    { wch: 20 },  // Supervisor
    { wch: 25 },  // Notes
    { wch: 55 }   // Diagnosis
  ];

  const cleanSheetName = categoryTitle.slice(0, 31).replace(/[\\/?*:[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName || 'Report');

  const nowStr = new Date().toISOString().slice(0, 10);
  const safeFileName = fileName
    ? `${fileName.replace(/\.xlsx$/i, '')}_${nowStr}.xlsx`
    : `Audit_Report_${categoryTitle.replace(/\s+/g, '_')}_${nowStr}.xlsx`;

  XLSX.writeFile(wb, safeFileName);
}
