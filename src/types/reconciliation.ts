export type DiscrepancyStatus =
  | 'PUNCHED_NOT_IN_PAPER' // Punched on machine but missing in paper sheet (broke 5:00 PM)
  | 'IN_PAPER_NO_PUNCH'    // Recorded in paper sheet but missing punch or departed before 5 PM
  | 'HOURS_MISMATCH'       // Recorded on both sides with hours variance
  | 'FULLY_MATCHED'        // Fully matched and verified on both sides
  | 'NO_OVERTIME'          // Regular workday without overtime on both sides (departed before 5:00 PM)
  | 'EXCLUDED_ADMIN';      // Administrative department excluded from overtime calculations

export interface PaperOvertimeEntry {
  id: string;
  code: string;
  name: string;
  department: string;
  line?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  supervisor?: string;
  notes?: string;
  sourceSheetName?: string;
}

export interface ReconciliationOptions {
  hourlyRateEgp?: number;
  excludedDepartments?: string[]; // Excluded administrative department names
  onlyCountBroken5pmForBiometricNotPaper?: boolean; // Audit workers who broke 5:00 PM
  credit2HoursForBroken5pm?: boolean; // Credit 2.0 hours for workers breaking 5:00 PM
  shift1Only?: boolean; // Filter strictly for Shift 1 workers who continued for overtime
}

export interface ReconciliationItem {
  id: string;
  code: string;
  name: string;
  department: string;
  line: string;
  date: string; // YYYY-MM-DD
  formattedDate: string;
  dayName: string;
  isFriday: boolean;
  isHoliday: boolean;

  // Shift & Overtime Continuation
  isShift1: boolean; // Shift 1 morning arrival (07:30 - 15:30)
  shiftName: string; // Shift name (Shift 1 Morning / Shift 2 / Shift 3)
  continuedOvertime: boolean; // Stayed past shift hours for overtime
  isShift1ContinuedOt: boolean; // Shift 1 employee who continued for overtime

  // Biometric side
  biometricIn: string;
  biometricOut: string;
  biometricWorkedHours: number;
  biometricOtHours: number;
  rate135Hours: number;
  rate170Hours: number;
  rate200Hours: number;
  biometricStatus: string; // 'P', 'A', etc.
  isSingleSwipe: boolean;

  // 5:00 PM Breaking & Department Rules
  exceeded5pm: boolean; // Departed at or after 5:00 PM (16:55+)
  isLeftAt330Unearned?: boolean; // Departed at 3:30 PM (normal schedule) but claimed in paper
  calculatedOtRule: string; // Governing rule text applied
  isExcludedDept: boolean; // Whether department is excluded as admin
  departmentType: 'production' | 'admin' | 'services'; // Department classification

  // Paper side
  hasPaperRecord: boolean;
  paperOtHours: number;
  paperSupervisor?: string;
  paperNotes?: string;

  // Comparison & Reconciliation
  approvedOtHours: number; // Final approved overtime hours (Biometric punch is governing authority)
  diffHours: number; // paperOtHours - biometricOtHours
  status: DiscrepancyStatus;
  statusTitleAr: string; // Kept for backwards-compatibility or English display
  statusTitleEn: string;
  severity: 'danger' | 'warning' | 'success' | 'neutral';
  explanationAr: string;
  suggestedActionAr: string;

  // HR Resolution state
  resolvedStatus?: 'ACCEPTED_BIOMETRIC' | 'ACCEPTED_PAPER' | 'PENDING_INVESTIGATION';
  resolutionNotes?: string;
}

export interface ReconciliationSummary {
  totalEmployees: number;
  totalDaysEvaluated: number;
  totalBiometricOtHours: number;
  totalPaperOtHours: number;
  hoursVariance: number; // paper - biometric
  punchedNotInPaperCount: number;
  inPaperNoPunchCount: number;
  hoursMismatchCount: number;
  fullyMatchedCount: number;
  noOvertimeCount: number;
  excludedAdminCount: number;
  broken5pmCount: number;
  unearnedLeftAt330Count: number; // Count of rejected 3:30 normal departures claimed in paper
  totalApprovedOtHours: number; // Officially approved overtime hours
  shift1WorkersCount: number;
  shift1ContinuedOtCount: number;
  estimatedFinancialRiskEGP: number; // Financial exposure
}
