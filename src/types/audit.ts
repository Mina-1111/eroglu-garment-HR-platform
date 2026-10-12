export type AttendanceStatus = 'present' | 'absent' | 'rest_day' | 'leave' | 'sick' | 'holiday' | 'unknown';

export interface RawAttendanceRow {
  code: string;
  name?: string;
  department?: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  notes?: string;
}

export interface RawOvertimeRow {
  code: string;
  name?: string;
  department?: string;
  date: string;
  hours: number;
  sourceFile?: string;
  reason?: string;
  notes?: string;
}

export interface AuditFlag {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  date?: string;
}

export interface EmployeeDailyAuditEntry {
  date: string;
  dayName: string;
  attendanceStatus: AttendanceStatus;
  overtimeHours: number;
  overtimeSourceFiles: string[];
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  isConflict?: boolean; // e.g. overtime on absent day
  conflictReason?: string;
}

export interface EmployeeAuditSummary {
  code: string;
  name: string;
  department: string;
  presentDays: number;
  absentDays: number;
  restDays: number;
  leaveDays: number;
  totalRecordedDays: number;
  totalOvertimeHours: number;
  overtimeDaysCount: number;
  avgDailyOvertime: number;
  maxSingleDayOvertime: number;
  attendanceRate: number; // percentage
  flags: AuditFlag[];
  dailyEntries: EmployeeDailyAuditEntry[];
  manualNote?: string;
  isAudited?: boolean; // marked as checked by HR
}

export interface UploadedFileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  type: 'attendance' | 'overtime';
  dateAttached?: string;
  rowsCount: number;
  uploadedAt: string;
}

export interface AuditCompanyInfo {
  companyName: string;
  auditName: string; // e.g. "October 2026 Audit - Compliance & Overtime Review"
  auditPeriod: string; // e.g. "01/10/2026 to 31/10/2026"
  auditorName?: string;
  hrManagerName?: string;
}
