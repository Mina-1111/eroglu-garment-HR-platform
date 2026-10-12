export interface RawDailyRecord {
  code: string;
  name?: string;
  department?: string;
  date: string;
  hours: number;
  sourceFile?: string;
}

export interface EmployeeOvertimeSummary {
  code: string;
  name: string;
  department: string;
  dailyHours: Record<string, number>; // date 'YYYY-MM-DD' -> hours
  totalHours: number;                 // Total Overtime Hours
  daysCount: number;                  // Count of Overtime Days
  fridayHours?: number;               // Friday 2x Overtime Hours
}

export interface SimpleAuditDataset {
  allDates: string[]; // sorted list of all unique dates found across files
  employees: EmployeeOvertimeSummary[];
  grandTotalHours: number;
  totalUniqueEmployees: number;
}
