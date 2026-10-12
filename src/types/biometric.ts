export interface BiometricPunchRecord {
  id: string;
  sl: number;
  code: string;
  name: string;
  designation?: string;
  department: string;
  line?: string;
  date: string;         // 'YYYY-MM-DD'
  formattedDate: string;// 'DD/MM/YYYY'
  weekDay: string;      // 'Monday', 'Tuesday', ...
  dayName: string;      // alias
  isFriday: boolean;
  isOfficialHoliday?: boolean; // Official paid public holiday
  isSingleSwipe?: boolean;     // Only checked in, forgot checkout
  inTime: string;       // '07:52:24 AM'
  checkIn: string;      // alias
  outTime: string;      // '18:12:01 PM'
  checkOut: string;     // alias
  totalWorkedHours: number;
  isNormalDay: boolean;
  otHours: number;      // OT Hr
  rate135Hours: number; // 1.35x
  rate170Hours: number; // 1.70x
  rate200Hours: number; // 2.0x (Friday Overtime / Official Holiday 2x)
  status: string;       // 'P', 'A', etc.
  remarks: string;      // 'W.Holiday', 'G.Holiday', etc.
  remark: string;       // alias
  sourceFile?: string;
  shift?: string;       // Shift 1, Shift 2, Shift 3
  isCrossDay?: boolean; // true for Shift 3 spanning midnight
}

export interface BiometricEmployeeMonthlySummary {
  code: string;
  name: string;
  designation: string;
  department: string;
  line: string;
  daysOfMonth: number;
  presentDaysCount: number;
  absentDaysCount: number;
  lateDaysCount: number;
  leaveDaysCount: number;
  holidayDaysCount: number;
  weekEndDaysCount: number;
  fridayWorkedCount: number;
  officialHolidaysPaidCount?: number;
  normalDaysCount: number;
  totalWorkedHours: number;
  totalOtHours: number;
  totalRate135Hours: number;
  totalRate170Hours: number;
  totalRate200Hours: number; // 2x Friday & Holiday Total
  baseSalary?: number;       // Base Monthly Salary in EGP
  hourlyRate?: number;       // Hourly wage rate (Base / 240)
  otAmount135?: number;      // 1.35x Overtime Pay
  otAmount170?: number;      // 1.70x Overtime Pay
  otAmount200?: number;      // 2.0x Overtime Pay (Friday / Holiday)
  totalOtAmount?: number;    // Total Overtime Pay
  grossSalary?: number;      // Base Salary + Total Overtime Pay
  punches: BiometricPunchRecord[];
  dailyOtMap: Record<string, number>;
}

export interface BiometricMonthlyDataset {
  allDates: string[];
  employees: BiometricEmployeeMonthlySummary[];
  allPunches: BiometricPunchRecord[];
  officialHolidays?: string[]; // List of 'YYYY-MM-DD' dates designated as official paid holidays
  grandTotalWorkedHours: number;
  grandTotalOtHours: number;
  grandTotal135Hours: number;
  grandTotal170Hours: number;
  grandTotal200Hours: number; // 2x Friday Grand Total
  grandTotalBaseSalary?: number;
  grandTotalOtPay?: number;
  grandTotalGrossSalary?: number;
}
