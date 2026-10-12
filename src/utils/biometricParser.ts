import * as XLSX from 'xlsx';
import { BiometricPunchRecord, BiometricEmployeeMonthlySummary, BiometricMonthlyDataset } from '../types/biometric';
import { extractDateFromFilenameSmart, normalizeDigits } from './dateExtractor';
import { DEPT_KEYWORDS } from './fileParser';

export function normalizeDateIso(d: any): string {
  if (!d) return '';
  if (d instanceof Date && !isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(d).trim();
  const m = s.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
  }
  const mDmy = s.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})/);
  if (mDmy) {
    return `${mDmy[3]}-${String(Number(mDmy[2])).padStart(2, '0')}-${String(Number(mDmy[1])).padStart(2, '0')}`;
  }
  return s;
}

export function isSameDate(d1: any, d2: any): boolean {
  if (!d1 || !d2) return false;
  const s1 = String(d1).trim();
  const s2 = String(d2).trim();
  if (s1 === s2) return true;
  const n1 = normalizeDateIso(s1);
  const n2 = normalizeDateIso(s2);
  if (n1 && n2 && n1 === n2) return true;

  // Also match month and day if year differs or format omitted year
  const m1 = n1.match(/(\d{2})-(\d{2})$/);
  const m2 = n2.match(/(\d{2})-(\d{2})$/);
  if (m1 && m2 && m1[1] === m2[1] && m1[2] === m2[2]) return true;

  return false;
}

export function isOfficialHolidayDate(dateStr: string, holidays: string[]): boolean {
  if (!dateStr || !holidays || holidays.length === 0) return false;
  return holidays.some((h) => isSameDate(dateStr, h));
}

export function checkIsThursday(dateStr: string, weekDayStr?: string): boolean {
  if (weekDayStr) {
    const w = weekDayStr.trim().toLowerCase();
    if (/thursday|thu|\u062e\u0645\u064a\u0633|\u0627\u0644\u062e\u0645\u064a\u0633/i.test(w)) {
      return true;
    }
  }
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const dt = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
      return dt.getDay() === 4; // Thursday is 4
    }
  } catch {}
  return false;
}

function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—]+/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/[\u0629]/g, '\u0647')
    .replace(/[\u0649]/g, '\u064a');
}

/**
 * Parses any time format or Excel decimal into minutes from midnight
 */
export function timeStringToMinutes(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    let h = val.getHours();
    const m = val.getMinutes();
    // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]" -> 12:xx (00:xx or 12:xx) is always Noon (12 PM)
    if (h === 0) h = 12;
    return h * 60 + m;
  }

  if (typeof val === 'number') {
    if (val >= 0 && val < 1) {
      const mins = Math.round(val * 24 * 60);
      // 00:xx in Excel decimal time is 12:xx PM (Noon), never midnight
      return mins < 60 ? mins + 12 * 60 : mins;
    }
    // Handle numeric hour notations like 7.5, 3.5, 11.5, 15.5, 23.5, 7.30, etc.
    if (val >= 1 && val <= 24) {
      let h = Math.floor(val);
      if (h === 0) h = 12;
      const frac = Number((val - Math.floor(val)).toFixed(4));
      if (frac === 0.5) return h * 60 + 30;
      if (frac === 0.25) return h * 60 + 15;
      if (frac === 0.75) return h * 60 + 45;
      if (Math.abs(frac - 0.3) < 0.001) return h * 60 + 30;
      if (Math.abs(frac - 0.15) < 0.001) return h * 60 + 15;
      if (Math.abs(frac - 0.45) < 0.001) return h * 60 + 45;
      return Math.round(h * 60 + frac * 60);
    }
  }

  const str = normalizeDigits(String(val)).trim();
  if (!str || str === '-' || str === '0') return null;

  // Format: HH:MM:SS AM/PM or HH:MM AM/PM
  const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[4];

    // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]"
    // 12:xx (or 00:xx) is ALWAYS 12:xx PM (Noon / [ref]), never midnight!
    if (hours === 0 || hours === 12) {
      hours = 12;
    } else if (meridiem) {
      const isPm = meridiem.toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
    }

    return hours * 60 + minutes;
  }

  // Format: Single hour notation like "8", "8 PM", "8am", "20", "08"
  const matchSingleH = str.match(/^(\d{1,2})\s*(am|pm)?$/i);
  if (matchSingleH) {
    let hours = parseInt(matchSingleH[1], 10);
    const meridiem = matchSingleH[2];
    if (hours === 0 || hours === 12) {
      hours = 12;
    } else if (meridiem) {
      const isPm = meridiem.toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
    }
    if (hours >= 0 && hours <= 24) {
      return hours * 60;
    }
  }

  // Format: HH.M or HH.MM (e.g. 7.5, 3.5, 11.5, 15.5, 23.5, 07.30, 15.30, 23.30)
  const matchDot = str.match(/^(\d{1,2})[.](\d{1,2})\s*(am|pm)?/i);
  if (matchDot) {
    let hours = parseInt(matchDot[1], 10);
    const fracStr = matchDot[2];
    const meridiem = matchDot[3];
    let minutes = 0;

    if (fracStr === '5' || fracStr === '50' || fracStr === '30' || fracStr === '3') {
      minutes = 30;
    } else if (fracStr === '25' || fracStr === '15') {
      minutes = 15;
    } else if (fracStr === '75' || fracStr === '45') {
      minutes = 45;
    } else {
      const parsed = parseInt(fracStr, 10);
      if (parsed < 60) {
        minutes = fracStr.length === 1 ? parsed * 10 : parsed;
      }
    }

    if (hours === 0 || hours === 12) {
      hours = 12;
    } else if (meridiem) {
      const isPm = meridiem.toLowerCase() === 'pm';
      if (isPm && hours < 12) hours += 12;
    }

    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Formats minute offset from midnight into standard 12-hour 'HH:MM:SS AM/PM'
 */
export function formatMinutesToTimeStr(mins: number): string {
  const normalizedMins = ((mins % 1440) + 1440) % 1440;
  let h24 = Math.floor(normalizedMins / 60);
  // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]" -> 12:xx is always 12:xx PM (Noon)
  if (h24 === 0) h24 = 12;
  const m = normalizedMins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:00 ${ampm}`;
}

/**
 * Formats time cleanly to 'HH:MM:SS AM/PM'
 */
export function formatTimeClean(val: any): string {
  if (val === undefined || val === null || val === '' || val === '-' || val === '00:00:00' || val === '00:00') return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    let h24 = val.getHours();
    if (h24 === 0) h24 = 12;
    const m = val.getMinutes();
    const s = val.getSeconds();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
  }
  
  if (typeof val === 'number' && val >= 0 && val < 1) {
    const totalSecs = Math.round(val * 86400);
    let h24 = Math.floor(totalSecs / 3600) % 24;
    if (h24 === 0) h24 = 12;
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
  }

  const str = normalizeDigits(String(val)).trim();
  if (str === '' || str === '-' || str === '0') return '';
  
  const matchAmPm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (matchAmPm) {
    let h = parseInt(matchAmPm[1], 10);
    if (h === 0) h = 12;
    const m = matchAmPm[2];
    const s = matchAmPm[3] || '00';
    // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]" -> 12:xx is always PM (Noon)
    const ampm = h === 12 ? 'PM' : matchAmPm[4].toUpperCase();
    return `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
  }

  const mins = timeStringToMinutes(val);
  if (mins === null) return str;

  return formatMinutesToTimeStr(mins);
}

export interface ShiftCalculationResult {
  inMinutes: number;
  outMinutes: number;
  workedHours: number;
  shiftName: string;
  isCrossDay: boolean;
  formattedIn: string;
  formattedOut: string;
}

/**
 * Calculates work hours across the 3 factory shifts:
 * - Shift 1: 07:30 to 15:30 (7.5 AM to 3.5 PM = 8 hrs)
 * - Shift 2: 15:30 to 23:30 (3.5 PM to 11.5 PM = 8 hrs)
 * - Shift 3: 23:30 to 07:30 next morning cross-day (11.5 PM to 7.5 AM in the new day = 8 hrs)
 */
export function parseAndCalculateShiftHours(
  checkInRaw: any,
  checkOutRaw: any
): ShiftCalculationResult {
  const cleanInRawStr = normalizeDigits(String(checkInRaw || '')).trim();
  const cleanOutRawStr = normalizeDigits(String(checkOutRaw || '')).trim();

  let inM = timeStringToMinutes(checkInRaw);
  let outM = timeStringToMinutes(checkOutRaw);

  if (inM === null || outM === null) {
    return {
      inMinutes: inM || 0,
      outMinutes: outM || 0,
      workedHours: 0,
      shiftName: '',
      isCrossDay: false,
      formattedIn: formatTimeClean(checkInRaw),
      formattedOut: formatTimeClean(checkOutRaw)
    };
  }

  // CRITICAL USER FIX:
  // "[ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  // If check-in and check-out are identical to the minute (or within 2 minutes):
  // The employee only swiped IN, and forgot to swipe OUT. Zero worked hours, zero OT, and blank checkout!
  const isRawIdentical = (cleanInRawStr && cleanOutRawStr && cleanInRawStr === cleanOutRawStr) || 
                         (Math.abs(inM - outM) <= 2);

  if (isRawIdentical) {
    const shiftName = (inM >= 20.5 * 60 || inM < 2.5 * 60)
      ? 'Shift 3 (23:30 - 07:30)'
      : (inM >= 14 * 60 && inM <= 18 * 60 ? 'Shift 2 (15:30 - 23:30)' : 'Shift 1 (07:30 - 15:30)');
    return {
      inMinutes: inM,
      outMinutes: outM,
      workedHours: 0,
      shiftName,
      isCrossDay: false,
      formattedIn: formatMinutesToTimeStr(inM),
      formattedOut: '' // Forgotten out punch!
    };
  }

  // 12-hour heuristic resolution for the 3 factory shifts:
  // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]"
  // 12:xx (720 <= m < 780) is strictly Noon (12:xx PM), NEVER night!
  // 1. Shift 3 check-in entered in 12-hour format: around 11:30 PM (630 <= inM < 720) and out is morning (05:00 - 11:59)
  if (inM >= 10.5 * 60 && inM < 12 * 60 && outM >= 5 * 60 && outM < 12 * 60) {
    inM += 12 * 60; // 23:30 (11:30 PM)
  }

  // 2. Shift 2 entered in 12-hour format: around 03:30 (150 <= inM <= 270) and out is around 11:30 (630 <= outM < 720)
  if (inM >= 2.5 * 60 && inM <= 4.5 * 60 && outM >= 10.5 * 60 && outM < 12 * 60) {
    inM += 12 * 60; // 15:30 (03:30 PM)
    outM += 12 * 60; // 23:30 (11:30 PM)
  }

  // 3. Shift 1 entered in 12-hour format (including Noon 12:xx check-ins):
  // When an employee arrives in the morning or at noon (04:00 to 13:30) and check-out is in 12h notation (01:00 to 11:59):
  if (inM >= 4 * 60 && inM <= 13.5 * 60) {
    if (outM >= 1 * 60 && outM < 12 * 60) {
      if (inM >= 12 * 60 && inM < 13.5 * 60) {
        // Checked in at 12:xx PM (Noon): same-day out punch (e.g. 03:30, 05:30, 07:33) is PM!
        outM += 12 * 60;
      } else if (cleanOutRawStr.toLowerCase().includes('pm')) {
        if (outM < 12 * 60) outM += 12 * 60;
      } else if (!cleanOutRawStr.toLowerCase().includes('am')) {
        outM += 12 * 60; // Convert to PM (e.g. 07:33 -> 19:33 / 7:33 PM, 08:00 -> 20:00 / 8:00 PM!)
      }
    }
  }

  // CRITICAL USER FIX:
  // If check-in and check-out are identical (single swipe where user forgot to swipe out):
  // Set workedHours = 0, no overtime, no (+1d), and blank check-out!
  if (Math.abs(inM - outM) <= 1) {
    const shiftName = (inM >= 20.5 * 60 || inM < 2.5 * 60)
      ? 'Shift 3 (23:30 - 07:30)'
      : (inM >= 14 * 60 && inM <= 18 * 60 ? 'Shift 2 (15:30 - 23:30)' : 'Shift 1 (07:30 - 15:30)');
    return {
      inMinutes: inM,
      outMinutes: outM,
      workedHours: 0,
      shiftName,
      isCrossDay: false,
      formattedIn: formatTimeClean(checkInRaw) || formatMinutesToTimeStr(inM),
      formattedOut: '' // Forgotten out punch!
    };
  }

  let diff = outM - inM;
  let isCrossDay = false;
  let shiftName = 'Shift 1 (07:30 - 15:30)';

  // Shift 3 cross-day detection: spans midnight into the next calendar morning
  // Strictly for night check-ins (20:00 to 23:59), NEVER for 12:xx PM Noon!
  if ((inM >= 20 * 60 && inM < 24 * 60) || (diff < 0 && inM >= 18 * 60)) {
    diff = (outM + 24 * 60) - inM;
    isCrossDay = true;
    shiftName = 'Shift 3 (23:30 - 07:30)';
  } else if (inM >= 14 * 60 && inM <= 18 * 60) {
    shiftName = 'Shift 2 (15:30 - 23:30)';
    diff = Math.max(0, outM - inM);
  } else {
    // Shift 1: Day shift (07:30 - 15:30)
    shiftName = 'Shift 1 (07:30 - 15:30)';
    // CRITICAL USER REQUIREMENT:
    // "[ref] [ref] [ref] [ref] [ref] 7 [ref] [ref] [ref] [ref] [ref] 7.5 [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
    // Whether check-in was before 07:30 or after 07:30, calculate it as 07:30 AM (7.5h / 450 minutes)
    // when calculating worked and overtime hours, while writing the actual punch time normally in the table cells.
    const effectiveInM = 7.5 * 60; // 450 minutes (07:30 AM)
    diff = Math.max(0, outM - effectiveInM);
  }

  const rawWorkedHours = Number((diff / 60).toFixed(2));
  let workedHours = rawWorkedHours;

  // USER RULE:
  // "[ref] [ref] 3.5 [ref] [ref] [ref]"
  // Normal Shift 1 ends at 15:30 (3.5 / 930 mins).
  // Any exit before 5:00 PM (e.g. 15:30 / 3.5, 16:00 / 4, 16:30 / 4.5, or outM < 16:55)
  // has worked the normal 8h shift with ZERO overtime!
  const isNormalExitBefore5PM = shiftName.includes('Shift 1') && (
    outM < 16 * 60 + 55 ||
    cleanOutRawStr === '3.5' ||
    cleanOutRawStr === '3.30' ||
    cleanOutRawStr === '3:30' ||
    cleanOutRawStr === '03:30' ||
    cleanOutRawStr === '15:30' ||
    cleanOutRawStr === '3:30:00' ||
    cleanOutRawStr === '03:30:00' ||
    cleanOutRawStr === '15:30:00' ||
    cleanOutRawStr === '4' ||
    cleanOutRawStr === '4.0' ||
    cleanOutRawStr === '4.5' ||
    cleanOutRawStr === '4.30' ||
    cleanOutRawStr === '4:30' ||
    cleanOutRawStr === '04:30' ||
    cleanOutRawStr === '16:30' ||
    cleanOutRawStr === '4:30:00' ||
    cleanOutRawStr === '04:30:00' ||
    cleanOutRawStr === '16:30:00' ||
    cleanOutRawStr.toLowerCase().includes('3:30') ||
    cleanOutRawStr.toLowerCase().includes('03:30') ||
    cleanOutRawStr.toLowerCase().includes('4:30') ||
    cleanOutRawStr.toLowerCase().includes('04:30')
  );

  // USER RULE:
  // "[ref] [ref] [ref] [ref] [ref] [ref] 5 [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  // Anyone who punches from after 5:00 PM (>= 17:00 / 5:00 PM, or string matches 5, 5.0, 5:00, 17:00, 5.5, 17:30, etc.)
  // up to before 6:15 PM is calculated under the first overtime tier which is 2 hours (workedHours = 10.0)!
  const is5pmTo6pmTier1Exit = shiftName.includes('Shift 1') && !isNormalExitBefore5PM && (
    (outM >= 16 * 60 + 55 && outM < 18 * 60 + 15) ||
    cleanOutRawStr === '5' ||
    cleanOutRawStr === '5.0' ||
    cleanOutRawStr === '5:00' ||
    cleanOutRawStr === '05:00' ||
    cleanOutRawStr === '17:00' ||
    cleanOutRawStr === '5:00:00' ||
    cleanOutRawStr === '05:00:00' ||
    cleanOutRawStr === '17:00:00' ||
    cleanOutRawStr === '5.5' ||
    cleanOutRawStr === '5.30' ||
    cleanOutRawStr === '5:30' ||
    cleanOutRawStr === '05:30' ||
    cleanOutRawStr === '17:30' ||
    cleanOutRawStr === '5:30:00' ||
    cleanOutRawStr === '05:30:00' ||
    cleanOutRawStr === '17:30:00' ||
    cleanOutRawStr.toLowerCase() === '5 pm' ||
    cleanOutRawStr.toLowerCase() === '05 pm' ||
    cleanOutRawStr.toLowerCase() === '5:00 pm' ||
    cleanOutRawStr.toLowerCase() === '05:00 pm' ||
    cleanOutRawStr.toLowerCase() === '5:30 pm' ||
    cleanOutRawStr.toLowerCase() === '05:30 pm' ||
    cleanOutRawStr.toLowerCase().includes('5:00') ||
    cleanOutRawStr.toLowerCase().includes('05:00') ||
    cleanOutRawStr.toLowerCase().includes('5:30') ||
    cleanOutRawStr.toLowerCase().includes('05:30')
  );

  // Shift 1 Overtime Tiers:
  // Tier 0: Normal departure before 5:00 PM (< 16:55, e.g. 3:30 / 3.5, 4:00 / 4, 4:30 / 4.5) -> 8.0 worked hours (0 OT)
  // Tier 1: Broke 5:00 PM (16:55 to 19:24, including 5.0, 5.5 / 17:30, 6.0, 7.0) -> 10.0 worked hours (2.0h OT)
  // Tier 2: Passed 7.5 (>= 19:25, e.g. 7.5 / 19:30, 8.0 / 20:00) -> 12.5 worked hours (4.5h OT)
  if (shiftName.includes('Shift 1')) {
    if (isNormalExitBefore5PM || outM < 16 * 60 + 55) {
      workedHours = 8.0;
    } else if (
      (outM >= 19 * 60 + 25 && outM <= 21 * 60) ||
      cleanOutRawStr === '7.5' ||
      cleanOutRawStr === '7.30' ||
      cleanOutRawStr === '19:30' ||
      cleanOutRawStr === '19:30:00' ||
      cleanOutRawStr === '8' ||
      cleanOutRawStr === '08' ||
      cleanOutRawStr === '20' ||
      cleanOutRawStr === '8.0' ||
      cleanOutRawStr === '8.00' ||
      cleanOutRawStr === '20.0' ||
      cleanOutRawStr === '20.00' ||
      cleanOutRawStr === '20:00' ||
      cleanOutRawStr === '20:00:00' ||
      cleanOutRawStr.toLowerCase() === '7:30 pm' ||
      cleanOutRawStr.toLowerCase() === '07:30 pm' ||
      cleanOutRawStr.toLowerCase() === '8 pm' ||
      cleanOutRawStr.toLowerCase() === '08 pm' ||
      cleanOutRawStr.toLowerCase() === '8:00 pm' ||
      cleanOutRawStr.toLowerCase() === '08:00 pm' ||
      cleanOutRawStr.toLowerCase() === '8:00:00 pm' ||
      cleanOutRawStr.toLowerCase() === '08:00:00 pm'
    ) {
      workedHours = 12.5; // Tier 2 (passed 7.5 / 8:00 PM shift) -> 4.5h OT
    } else {
      workedHours = 10.0; // Tier 1 (broke 5:00 PM up to 7:25 PM, including 5.5 / 17:30) -> 2.0h OT
    }
  } else if (rawWorkedHours > 0) {
    const otDiff = Math.max(0, rawWorkedHours - 8.0);
    const roundedOt = Math.round(otDiff);
    const validOt = outM >= 16 * 60 + 55 ? Math.max(2, roundedOt) : (roundedOt < 2 ? 0 : roundedOt);
    workedHours = 8.0 + validOt;
  }

  // In Time is written normally as the employee's actual punch!
  const formattedIn = formatMinutesToTimeStr(inM) || formatTimeClean(checkInRaw);
  // Out Time is written normally as the employee's actual punch!
  const formattedOut = isCrossDay 
    ? `${formatMinutesToTimeStr(outM)} (+1d)` 
    : formatMinutesToTimeStr(outM);

  return {
    inMinutes: inM,
    outMinutes: outM,
    workedHours,
    shiftName,
    isCrossDay,
    formattedIn,
    formattedOut
  };
}

export function splitCombinedInOut(cellVal: any): { 
  checkInStr: string; 
  checkOutStr: string; 
  workedHours: number;
  shiftName?: string;
  isCrossDay?: boolean;
} {
  if (!cellVal) return { checkInStr: '', checkOutStr: '', workedHours: 0 };

  const str = normalizeDigits(String(cellVal)).trim();
  if (!str || str === '-' || str === '0') return { checkInStr: '', checkOutStr: '', workedHours: 0 };

  const timeRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?)\b/gi;
  const matches = str.match(timeRegex);

  if (matches && matches.length >= 2) {
    const firstStr = matches[0].trim();
    const lastStr = matches[matches.length - 1].trim();
    const calc = parseAndCalculateShiftHours(firstStr, lastStr);
    return {
      checkInStr: calc.formattedIn,
      checkOutStr: calc.formattedOut,
      workedHours: calc.workedHours,
      shiftName: calc.shiftName,
      isCrossDay: calc.isCrossDay
    };
  }

  const delimiters = /[-/,\n;|–—]/;
  if (delimiters.test(str)) {
    const parts = str.split(delimiters).map((p) => p.trim()).filter((p) => p.length > 0);
    if (parts.length >= 2) {
      const calc = parseAndCalculateShiftHours(parts[0], parts[parts.length - 1]);
      return {
        checkInStr: calc.formattedIn,
        checkOutStr: calc.formattedOut,
        workedHours: calc.workedHours,
        shiftName: calc.shiftName,
        isCrossDay: calc.isCrossDay
      };
    }
  }

  const single = timeStringToMinutes(str);
  if (single !== null) {
    return {
      checkInStr: formatTimeClean(str),
      checkOutStr: '',
      workedHours: 0
    };
  }

  return { checkInStr: '', checkOutStr: '', workedHours: 0 };
}

export function areConsecutiveDays(dateStr1: string, dateStr2: string): boolean {
  if (!dateStr1 || !dateStr2) return false;
  const norm1 = normalizeDateIso(dateStr1);
  const norm2 = normalizeDateIso(dateStr2);
  const m1 = norm1.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const m2 = norm2.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m1 || !m2) return false;

  const dt1 = new Date(parseInt(m1[1], 10), parseInt(m1[2], 10) - 1, parseInt(m1[3], 10));
  const dt2 = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
  const diffDays = Math.round((dt2.getTime() - dt1.getTime()) / (86400 * 1000));
  return diffDays === 1;
}

export function isNightCheckIn(timeStr: string): boolean {
  if (!timeStr) return false;
  const clean = timeStr.toLowerCase().trim();
  // USER RULE: "[ref] [ref] 12 [ref] [ref] [ref] [ref] [ref] [ref]"
  // 12:xx is strictly Noon ([ref]), never night!
  if (clean.startsWith('12:') || clean.startsWith('00:')) {
    return false;
  }
  if (clean.includes('pm') && (clean.startsWith('10:') || clean.startsWith('11:') || clean.startsWith('22:') || clean.startsWith('23:'))) {
    return true;
  }
  const m = timeStringToMinutes(timeStr);
  if (m === null) return false;
  // 20:30 (8:30 PM) to 23:59 (11:59 PM) OR 12h notation 10:30 to 11:59 (strictly < 12 * 60)
  return (m >= 20.5 * 60 && m < 24 * 60) || (m >= 10.5 * 60 && m < 12 * 60 && !clean.includes('am'));
}

export function isMorningCheckOut(timeStr: string): boolean {
  if (!timeStr) return false;
  const clean = timeStr.toLowerCase().trim();
  if (clean.includes('pm')) return false;
  const m = timeStringToMinutes(timeStr);
  if (m === null) return false;
  // 05:00 AM to 11:00 AM (e.g. 07:30 AM or with OT up to 11:00 AM)
  return m >= 5 * 60 && m <= 11 * 60;
}

/**
 * Resolves Shift 3 cross-day shifts and cleans ghost morning exit punches:
 * - Shift 3 starts at night (e.g. 23:30 / 11.5 PM).
 * - Employee punches out next morning at 07:30 AM (7.5 AM).
 * - Biometric devices often log this 07:30 AM punch on the next calendar day as an IN punch without an OUT punch.
 * - This function ensures:
 *   1) Day 1 calculates strictly from night to morning (23:30 to 07:30 next day = 8.0 hrs normal work, Status: P, 0 OT).
 *   2) Thursday night (11.5 PM) to Friday morning (7.5 AM):
 *      - Thursday is ATTENDED (Status: P, 8.0h shift).
 *      - Friday is credited with 8h Overtime at 2.0x Double Time (Status: P, W.Holiday (Friday 2x)).
 *   3) All other nights (Sunday to Thursday):
 *      - Normal 8-hour regular shift ([ref] [ref]), Status: P.
 *      - Any excess over 8 hours is computed as regular overtime (<=2h @ 1.35x, >2h @ 1.70x).
 *   4) The next morning punch (07:30 AM) on Day 2 is recognized as the exit punch of Shift 3 and is NOT
 *      counted as a new check-in or single-swipe on Day 2.
 */
export function cleanAndResolveShift3Punches(
  rawPunches: BiometricPunchRecord[]
): BiometricPunchRecord[] {
  if (!rawPunches || rawPunches.length === 0) return [];

  // Sort chronologically by date
  const punches = rawPunches.map((p) => ({ ...p })).sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < punches.length - 1; i++) {
    const cur = punches[i];
    const next = punches[i + 1];

    if (!cur || !next) continue;

    // Check if dates are consecutive calendar days (D2 = D1 + 1 day)
    if (!areConsecutiveDays(cur.date, next.date)) continue;

    // Handle case where Thursday already had In/Out combined in cur (e.g. In: 23:30, Out: 07:30 (+1d)):
    if (checkIsThursday(cur.date) && cur.isCrossDay && next.isFriday && (!next.otHours || next.otHours === 0)) {
      const otHours = Math.round(cur.totalWorkedHours || 8);
      next.inTime = cur.inTime;
      next.checkIn = cur.inTime;
      next.outTime = cur.outTime ? cur.outTime.replace(/\s*\(\+1d\)/g, '') : '07:30:00 AM';
      next.checkOut = next.outTime;
      next.totalWorkedHours = cur.totalWorkedHours || 8;
      next.otHours = otHours;
      next.rate135Hours = 0;
      next.rate170Hours = 0;
      next.rate200Hours = otHours; // Friday 2x Double Time!
      next.status = 'P';
      next.isNormalDay = false;
      next.isSingleSwipe = false;
      next.remarks = 'W.Holiday (Friday 2x)';
      next.remark = 'W.Holiday (Friday 2x)';
      next.shift = 'Shift 3 (Thu night to Fri 2x)';
      next.isCrossDay = true;

      cur.status = 'P';
      cur.remarks = 'Shift 3 (Night to Fri 2x)';
      cur.remark = cur.remarks;
      cur.otHours = 0;
      cur.rate135Hours = 0;
      cur.rate170Hours = 0;
      cur.rate200Hours = 0;
      continue;
    }

    let curInM = timeStringToMinutes(cur.inTime);
    let curOutM = timeStringToMinutes(cur.outTime);

    // Identify if cur was Shift 3 (night check-in)
    const isCurNight = isNightCheckIn(cur.inTime);
    if (!isCurNight) continue;

    if (curInM !== null && curInM >= 10.5 * 60 && curInM < 12 * 60) {
      curInM += 12 * 60; // 23:30 (11:30 PM)
    }

    const nextInM = timeStringToMinutes(next.inTime);
    const nextOutM = timeStringToMinutes(next.outTime);

    // Is next.inTime a morning punch (e.g. 05:00 - 11:00 AM, such as 07:30 AM)?
    const isNextMorningIn = isMorningCheckOut(next.inTime);

    if (!isNextMorningIn || nextInM === null) continue;

    // If next day has its own normal daytime/afternoon check-out (e.g. 03:30 PM, 06:30 PM, 07:30 PM),
    // then next.inTime (07:30 AM) is next day's own Shift 1 check-in, NOT a ghost exit from cur!
    const nextHasDaytimeShift1Out = Boolean(
      next.outTime &&
      nextOutM !== null &&
      !next.isSingleSwipe &&
      Math.abs(nextOutM - nextInM) > 60 &&
      !isNightCheckIn(next.outTime)
    );
    if (nextHasDaytimeShift1Out) continue;

    // Does next also have an evening out punch? (e.g. In: 07:30 AM, Out: 23:30 PM)
    const nextHasEveningOut = Boolean(next.outTime && nextOutM !== null && isNightCheckIn(next.outTime));

    const morningM = nextInM !== null && isNextMorningIn 
      ? nextInM 
      : (curOutM !== null && curOutM <= 12 * 60 ? curOutM : 7.5 * 60);

    const diffMinutes = (morningM + 24 * 60) - (curInM || 23.5 * 60);
    const workedHours = Number((diffMinutes / 60).toFixed(2));

    // SPECIAL USER RULE:
    // Thursday night into Friday morning
    if (next.isFriday) {
      const otHours = Math.round(workedHours);
      const formattedIn = formatMinutesToTimeStr(curInM || 23.5 * 60);
      const formattedOut = formatMinutesToTimeStr(morningM);

      // 1. Thursday (cur) is PRESENT (Attended regular shift, never erased):
      cur.inTime = formattedIn;
      cur.checkIn = formattedIn;
      cur.outTime = `${formattedOut} (+1d)`;
      cur.checkOut = cur.outTime;
      cur.totalWorkedHours = workedHours;
      cur.status = 'P'; // PRESENT!
      cur.isNormalDay = false;
      cur.isSingleSwipe = false;
      cur.shift = 'Shift 3 (23:30 - 07:30)';
      cur.isCrossDay = true;
      cur.remarks = 'Shift 3 (Night to Fri 2x)';
      cur.remark = cur.remarks;
      cur.otHours = 0; // Credited to Friday 2x
      cur.rate135Hours = 0;
      cur.rate170Hours = 0;
      cur.rate200Hours = 0;

      // 2. Credit this shift to Friday as Friday Overtime (2.0x Double Time):
      next.inTime = formattedIn;
      next.checkIn = formattedIn;
      next.outTime = formattedOut;
      next.checkOut = formattedOut;
      next.totalWorkedHours = workedHours;
      next.otHours = otHours;
      next.rate135Hours = 0;
      next.rate170Hours = 0;
      next.rate200Hours = otHours; // Friday 2x Double Time!
      next.status = 'P';
      next.isNormalDay = false;
      next.isSingleSwipe = false;
      next.remarks = 'W.Holiday (Friday 2x)';
      next.remark = 'W.Holiday (Friday 2x)';
      next.shift = 'Shift 3 (Thu night to Fri 2x)';
      next.isCrossDay = true;

      continue;
    }

    // All other nights: rounded to whole integer, minimum OT is 2 hours (1-hour OT is removed)
    const diffOt = workedHours > 8.0 ? workedHours - 8.0 : 0;
    const rawOt = Math.round(diffOt);
    const otHours = rawOt < 2 ? 0 : rawOt;
    const effectiveWorked = otHours === 0 ? 8.0 : 8.0 + otHours;
    const r135 = otHours >= 2 ? 2 : 0;
    const r170 = otHours > 2 ? otHours - 2 : 0;
    const r200 = cur.isOfficialHoliday ? otHours : 0;

    const formattedOut = `${formatMinutesToTimeStr(morningM)} (+1d)`;
    cur.inTime = formatMinutesToTimeStr(curInM || 23.5 * 60);
    cur.checkIn = cur.inTime;
    cur.outTime = formattedOut;
    cur.checkOut = formattedOut;
    cur.totalWorkedHours = effectiveWorked;
    cur.otHours = otHours;
    cur.rate135Hours = cur.isOfficialHoliday ? 0 : r135;
    cur.rate170Hours = cur.isOfficialHoliday ? 0 : r170;
    cur.rate200Hours = r200;
    cur.isNormalDay = otHours === 0;
    cur.status = 'P'; // PRESENT!
    cur.isSingleSwipe = false;
    cur.shift = 'Shift 3 (23:30 - 07:30)';
    cur.isCrossDay = true;
    if (!cur.remarks || cur.remarks === 'Absent' || cur.remarks.includes('Single Swipe')) {
      cur.remarks = cur.isOfficialHoliday ? 'G.Holiday (Paid)' : '';
      cur.remark = cur.remarks;
    }

    // Clear next day's morning punch so it is NOT counted as a new check-in or single swipe on next day!
    // "[ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
    if (nextHasEveningOut && nextOutM !== null) {
      // Next day had an evening punch for its own shift (e.g. 23:30)
      const formattedIn = formatMinutesToTimeStr(nextOutM >= 10.5 * 60 && nextOutM < 12 * 60 ? nextOutM + 12 * 60 : nextOutM);
      next.inTime = formattedIn;
      next.checkIn = formattedIn;
      next.outTime = '';
      next.checkOut = '';
      next.totalWorkedHours = 0;
      next.otHours = 0;
      next.rate135Hours = 0;
      next.rate170Hours = 0;
      next.rate200Hours = 0;
      next.shift = 'Shift 3 (23:30 - 07:30)';
      next.isCrossDay = true;
      next.isSingleSwipe = false;
      next.status = 'P';
      next.remarks = '';
      next.remark = '';
    } else {
      // Next day had ONLY that morning swipe (and empty out / single swipe)
      // Clear it completely from next day!
      next.inTime = '';
      next.checkIn = '';
      next.outTime = '';
      next.checkOut = '';
      next.totalWorkedHours = 0;
      next.otHours = 0;
      next.rate135Hours = 0;
      next.rate170Hours = 0;
      next.rate200Hours = 0;
      next.isSingleSwipe = false;
      next.isNormalDay = false;
      next.shift = '';
      next.isCrossDay = false;

      if (next.isOfficialHoliday) {
        next.status = 'P';
        next.remarks = 'G.Holiday (Paid)';
      } else if (next.isFriday) {
        next.status = '';
        next.remarks = 'W.Holiday';
      } else {
        // Rest period after working night shift
        next.status = '';
        next.remarks = '';
      }
      next.remark = next.remarks;
    }
  }

  return punches;
}

export function checkIsFriday(dateStr: string, weekDayStr?: string): boolean {
  if (weekDayStr) {
    const w = weekDayStr.trim().toLowerCase();
    if (/friday|fri|\u062c\u0645\u0639\u0629|\u062c\u0645\u0639\u0647/i.test(w)) {
      return true;
    }
  }
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      // Local calendar date (month is 0-indexed)
      const dt = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
      return dt.getDay() === 5; // Friday is 5
    }
  } catch {}
  return false;
}

export function getEnglishDayName(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const dt = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
      return days[dt.getDay()] || '';
    }
  } catch {}
  return '';
}

export function formatDateToDmy(dateStr: string): string {
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      return `${parts[3]}/${parts[2]}/${parts[1]}`;
    }
  } catch {}
  return dateStr;
}

export function parseCellToIsoDate(
  rawDate: any, 
  fallbackDate: string,
  formatPreference: 'DMY' | 'MDY' = 'DMY'
): string {
  if (rawDate === undefined || rawDate === null || rawDate === '') return fallbackDate;
  
  // Date object from XLSX parser (avoid toISOString() which shifts UTC midnight dates by -1 day!)
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel serial date number
  if (typeof rawDate === 'number') {
    if (rawDate > 30000 && rawDate < 65000) {
      const totalDays = rawDate - 25569;
      const ms = Math.round(totalDays * 86400 * 1000);
      const dt = new Date(ms);
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const str = String(rawDate).trim();
  
  // Match DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  const m1 = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m1) {
    const part1 = parseInt(m1[1], 10);
    const part2 = parseInt(m1[2], 10);
    const year = parseInt(m1[3], 10);

    let day = part1;
    let month = part2;
    if (part1 > 12) {
      day = part1;
      month = part2;
    } else if (part2 > 12) {
      day = part2;
      month = part1;
    } else {
      if (formatPreference === 'MDY') {
        month = part1;
        day = part2;
      } else {
        day = part1;
        month = part2;
      }
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Match YYYY/MM/DD or YYYY-MM-DD
  const m2 = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  }

  const parsed = extractDateFromFilenameSmart(str);
  return parsed || fallbackDate;
}

export function detectBiometricHeaders(headers: string[]) {
  const res: {
    codeCol?: string;
    nameCol?: string;
    desigCol?: string;
    deptCol?: string;
    lineCol?: string;
    dateCol?: string;
    dayCol?: string;
    combinedCol?: string;
    inCol?: string;
    outCol?: string;
    hoursCol?: string;
    statusCol?: string;
    remarkCol?: string;
  } = {};

  const codeKeys = ['cardno', 'card', '\u0643\u0648\u062f\u0627\u0644\u0645\u0648\u0638\u0641', '\u0643\u0648\u062f', '\u0631\u0642\u0645\u0627\u0644\u0645\u0648\u0638\u0641', 'code', 'empid', 'id', 'empcode', 'badge', 'acno', 'no'];
  const nameKeys = ['name', '\u0627\u0633\u0645\u0627\u0644\u0645\u0648\u0638\u0641', '\u0627\u0644\u0627\u0633\u0645', '\u0627\u0633\u0645', 'empname', 'employeename', 'fullname'];
  const desigKeys = ['designation', 'desig', '\u0627\u0644\u0648\u0638\u064a\u0641\u0647', '\u0648\u0638\u064a\u0641\u0647', 'title', 'job'];
  const lineKeys = ['line', '\u0627\u0644\u062e\u0637', '\u062e\u0637', '\u0648\u0631\u062f\u064a\u0647', 'shift'];
  const dateKeys = ['date', '\u0627\u0644\u062a\u0627\u0631\u064a\u062e', '\u062a\u0627\u0631\u064a\u062e'];
  const dayKeys = ['weekday', 'week_day', 'day', '\u0627\u0644\u064a\u0648\u0645', '\u064a\u0648\u0645'];
  const combinedKeys = [
    '\u062f\u062e\u0648\u0644/\u062e\u0631\u0648\u062c', '\u062f\u062e\u0648\u0644\u0648\u0627\u0646\u0635\u0631\u0627\u0641', '\u062d\u0636\u0648\u0631\u0648\u0627\u0646\u0635\u0631\u0627\u0641', '\u0627\u0644\u0628\u0635\u0645\u0627\u062a', '\u0648\u0642\u062a\u0627\u0644\u0628\u0635\u0645\u0647', '\u062f\u062e\u0648\u0644\u062e\u0631\u0648\u062c',
    'in/out', 'inout', 'in_out', 'punch', 'punchtime', 'time', 'punches', 'timelogs'
  ];
  const inKeys = ['intime', 'in', '\u062f\u062e\u0648\u0644', '\u062d\u0636\u0648\u0631', '\u0648\u0642\u062a\u0627\u0644\u062f\u062e\u0648\u0644', 'checkin', 'timein', 'punchin', 'firstpunch', 'firstin'];
  const outKeys = ['outtime', 'out', '\u062e\u0631\u0648\u062c', '\u0627\u0646\u0635\u0631\u0627\u0641', '\u0648\u0642\u062a\u0627\u0644\u062e\u0631\u0648\u062c', 'checkout', 'timeout', 'punchout', 'lastpunch', 'lastout'];
  const hoursKeys = ['othr', 'ot', '\u0633\u0627\u0639\u0627\u062a\u0627\u0636\u0627\u0641\u064a', '\u0633\u0627\u0639\u0627\u062a\u0627\u0644\u0639\u0645\u0644', 'workedhours', 'worktime', 'hours'];
  const statusKeys = ['status', 'state', '\u0627\u0644\u062d\u0627\u0644\u0647', '\u062d\u0627\u0644\u0647'];
  const remarkKeys = ['remarks', 'remark', '\u0645\u0644\u0627\u062d\u0638\u0627\u062a', '\u0628\u064a\u0627\u0646'];

  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    if (!res.codeCol && codeKeys.some((k) => norm === k || norm.includes(k))) res.codeCol = h;
    else if (!res.nameCol && nameKeys.some((k) => norm === k || norm.includes(k))) res.nameCol = h;
    else if (!res.desigCol && desigKeys.some((k) => norm === k || norm.includes(k))) res.desigCol = h;
    else if (!res.lineCol && lineKeys.some((k) => norm === k || norm.includes(k))) res.lineCol = h;
    else if (!res.deptCol && DEPT_KEYWORDS.some((k) => norm === k || norm.includes(k))) res.deptCol = h;
    else if (!res.dateCol && dateKeys.some((k) => norm === k || norm.includes(k))) res.dateCol = h;
    else if (!res.dayCol && dayKeys.some((k) => norm === k || norm.includes(k))) res.dayCol = h;
    else if (!res.combinedCol && combinedKeys.some((k) => norm.includes(k))) res.combinedCol = h;
    else if (!res.inCol && inKeys.some((k) => norm === k || norm.includes(k))) res.inCol = h;
    else if (!res.outCol && outKeys.some((k) => norm === k || norm.includes(k))) res.outCol = h;
    else if (!res.hoursCol && hoursKeys.some((k) => norm === k || norm.includes(k))) res.hoursCol = h;
    else if (!res.statusCol && statusKeys.some((k) => norm === k || norm.includes(k))) res.statusCol = h;
    else if (!res.remarkCol && remarkKeys.some((k) => norm === k || norm.includes(k))) res.remarkCol = h;
  });

  return res;
}

/**
 * Calculates overtime, rate 1.35x, rate 1.70x, rate 2.0x, Status ('P' or empty), and Remarks ('W.Holiday', 'G.Holiday')
 * Strictly respects user requirements for single swipe and official paid holidays!
 */
export function calculateOvertimeBreakdown(
  workedHours: number,
  isFriday: boolean,
  hasPunch: boolean,
  inTimeStr: string,
  outTimeStr: string,
  userRemark?: string,
  userStatus?: string,
  userOt?: number,
  isOfficialHoliday?: boolean
) {
  // If sheet explicitly provided Status, respect it!
  const hasExplicitStatus = userStatus !== undefined && userStatus !== '';

  const cleanIn = inTimeStr ? inTimeStr.replace(/\s*\(\+1d\)/g, '').trim() : '';
  const cleanOut = outTimeStr ? outTimeStr.replace(/\s*\(\+1d\)/g, '').trim() : '';

  const inM = timeStringToMinutes(cleanIn);
  const outM = timeStringToMinutes(cleanOut);

  let outM24 = outM;
  if (inM !== null && inM >= 4 * 60 && inM <= 13.5 * 60 && outM !== null && outM >= 1 * 60 && outM <= 11.5 * 60) {
    if (!cleanOut.toLowerCase().includes('am')) {
      outM24 = outM + 12 * 60;
    }
  }

  const areTimesIdentical = (inM !== null && outM !== null && Math.abs(inM - outM) <= 2);
  const isIdentical = Boolean(cleanIn && cleanOut && (cleanIn === cleanOut || areTimesIdentical));
  const isSingleSwipe = isIdentical || (Boolean(inTimeStr) && !outTimeStr && workedHours === 0);

  // CRITICAL USER FIX:
  // "[ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  // When check-in and check-out are identical, or check-in exists without check-out:
  // The employee only swiped IN, and forgot to swipe OUT. Zero overtime, status 'P', remarks 'Single Swipe (Missing Out)'!
  if (isSingleSwipe) {
    return {
      isNormalDay: false,
      otHours: 0,
      rate135Hours: 0,
      rate170Hours: 0,
      rate200Hours: 0,
      remarks: userRemark && !/absent|\u063a\u0627\u0628/i.test(userRemark) ? userRemark : 'Single Swipe (Missing Out)',
      status: 'P', // Employee was present at work, but forgot to swipe out
      isSingleSwipe: true
    };
  }

  // Case A: Official Paid Public Holiday ([ref] [ref] [ref] [ref])
  // USER RULE:
  // "[ref] [ref] 8 [ref] 4.5 [ref] [ref] [ref] [ref] [ref] [ref]"
  // "[ref] [ref] [ref] [ref] [ref] [ref] 8 [ref] [ref] [ref] [ref] 7.5 [ref] [ref] [ref] [ref] 8"
  const is8pmExit = (outM24 !== null && (
    (outM24 >= 19 * 60 + 25 && outM24 <= 21 * 60)
  )) || (
    cleanOut === '7.5' ||
    cleanOut === '7.30' ||
    cleanOut === '19:30' ||
    cleanOut === '19:30:00' ||
    cleanOut === '8' ||
    cleanOut === '08' ||
    cleanOut === '20' ||
    cleanOut === '8.0' ||
    cleanOut === '8.00' ||
    cleanOut === '20.0' ||
    cleanOut === '20.00' ||
    cleanOut === '20:00' ||
    cleanOut === '20:00:00' ||
    cleanOut.toLowerCase() === '7:30 pm' ||
    cleanOut.toLowerCase() === '07:30 pm' ||
    cleanOut.toLowerCase() === '8 pm' ||
    cleanOut.toLowerCase() === '08 pm' ||
    cleanOut.toLowerCase() === '8:00 pm' ||
    cleanOut.toLowerCase() === '08:00 pm' ||
    cleanOut.toLowerCase() === '8:00:00 pm' ||
    cleanOut.toLowerCase() === '08:00:00 pm'
  ) || (workedHours >= 11.85 && workedHours <= 13.0);

  if (isOfficialHoliday) {
    const hasRealWork = workedHours > 0;
    const hasExplicitOt = userOt !== undefined && userOt > 0;
    const workedHoliday = (hasRealWork || hasExplicitOt);

    if (workedHoliday) {
      // Worked on official holiday: calculated at 2.0x (Double Time)
      let ot = 0;
      if (hasPunch && workedHours > 0) {
        ot = is8pmExit ? 12.5 : Math.round(workedHours);
      } else if (userOt !== undefined && userOt >= 0) {
        ot = (userOt === 4.5 || userOt === 12.5) ? userOt : Math.round(userOt);
      } else {
        ot = is8pmExit ? 12.5 : Math.round(workedHours);
      }

      return {
        isNormalDay: false,
        otHours: ot,
        rate135Hours: 0,
        rate170Hours: 0,
        rate200Hours: ot,
        remarks: 'G.Holiday (Worked 2x)',
        status: 'P',
        isSingleSwipe: false
      };
    } else {
      // Official Paid Holiday day-off:
      // "[ref] [ref] [ref] [ref] [ref] [ref]" -> Status 'P' (Paid attendance day)!
      return {
        isNormalDay: false,
        otHours: 0,
        rate135Hours: 0,
        rate170Hours: 0,
        rate200Hours: 0,
        remarks: 'G.Holiday (Paid)',
        status: 'P', // Counted as attendance (\u062d\u0636\u0648\u0631) and added to present days count!
        isSingleSwipe: false
      };
    }
  }

  // Case B: Friday (Weekly Rest Day)
  if (isFriday) {
    // Friday attendance strictly requires actual work recorded in the sheet!
    const hasRealWork = workedHours > 0;
    const hasExplicitOt = userOt !== undefined && userOt > 0;
    
    // Check if the user sheet explicitly indicates day-off / weekend / holiday
    const isExplicitDayOff = Boolean(
      (userRemark && /holiday|weekend|\u0631\u0627\u062d\u0629|\u0627\u062c\u0627\u0632\u0629|\u0639\u0637\u0644\u0629|off/i.test(userRemark)) ||
      (userStatus && /^(off|w\.holiday|holiday|weekend|\u0631\u0627\u062d\u0647|\u0631\u0627\u062d\u0629)$/i.test(userStatus))
    );

    const actuallyWorkedFriday = (hasRealWork || hasExplicitOt) && !isExplicitDayOff;

    if (actuallyWorkedFriday) {
      // Actually worked Friday overtime: 2.0x Double Time!
      let ot = 0;
      if (hasPunch && workedHours > 0) {
        ot = is8pmExit ? 12.5 : Math.round(workedHours);
      } else if (userOt !== undefined && userOt >= 0) {
        ot = (userOt === 4.5 || userOt === 12.5) ? userOt : Math.round(userOt);
      } else {
        ot = is8pmExit ? 12.5 : Math.round(workedHours);
      }

      return {
        isNormalDay: false,
        otHours: ot,
        rate135Hours: 0,
        rate170Hours: 0,
        rate200Hours: ot,
        remarks: userRemark || 'W.Holiday (Friday 2x)',
        status: hasExplicitStatus && userStatus && !isExplicitDayOff ? userStatus : 'P',
        isSingleSwipe: false
      };
    } else {
      // Friday Day off:
      // NEVER write 'P' or calculate OT!
      return {
        isNormalDay: false,
        otHours: 0,
        rate135Hours: 0,
        rate170Hours: 0,
        rate200Hours: 0,
        remarks: userRemark || 'W.Holiday',
        status: '', // Must be completely empty
        isSingleSwipe: false
      };
    }
  }

  // Case C: Regular Weekday
  // USER RULE:
  // "[ref] [ref] 3.5 [ref] [ref] [ref]"
  // "[ref] [ref] [ref] [ref] [ref] [ref] 5 [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  const isDayShift = inM === null || (inM >= 4 * 60 && inM <= 13.5 * 60);

  // Exits strictly before 5:00 PM (e.g. 15:30 / 3.5, 16:00 / 4, 16:30 / 4.5, or outM24 < 16:55):
  const isBefore5PMExit = (
    (isDayShift && outM24 !== null && outM24 >= 12 * 60 && outM24 < 16 * 60 + 55) ||
    cleanOut === '3.5' ||
    cleanOut === '3.30' ||
    cleanOut === '3:30' ||
    cleanOut === '03:30' ||
    cleanOut === '15:30' ||
    cleanOut === '3:30:00' ||
    cleanOut === '03:30:00' ||
    cleanOut === '15:30:00' ||
    cleanOut === '4' ||
    cleanOut === '4.0' ||
    cleanOut === '4.5' ||
    cleanOut === '4.30' ||
    cleanOut === '4:30' ||
    cleanOut === '04:30' ||
    cleanOut === '16:30' ||
    cleanOut === '4:30:00' ||
    cleanOut === '04:30:00' ||
    cleanOut === '16:30:00' ||
    cleanOut.toLowerCase() === '3:30 pm' ||
    cleanOut.toLowerCase() === '03:30 pm' ||
    cleanOut.toLowerCase() === '4:30 pm' ||
    cleanOut.toLowerCase() === '04:30 pm'
  );

  // USER RULE:
  // "[ref] [ref] [ref] [ref] [ref] [ref] 5 [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  // "[ref] [ref] [ref] [ref] 5.5 [ref] [ref] 4.5 [ref] 2 [ref]"
  // Anyone clocking out from/after 5:00 PM (16:55) up to before 7:25 PM (19:25), or matches 5.0, 5.5, 17:30, etc.:
  // Strictly 2 hours overtime!
  const is5pmTo6pmTier1 = !isBefore5PMExit && !is8pmExit && (
    (isDayShift && outM24 !== null && outM24 >= 16 * 60 + 55 && outM24 < 19 * 60 + 25) ||
    cleanOut === '5' ||
    cleanOut === '5.0' ||
    cleanOut === '5:00' ||
    cleanOut === '05:00' ||
    cleanOut === '17:00' ||
    cleanOut === '5:00:00' ||
    cleanOut === '05:00:00' ||
    cleanOut === '17:00:00' ||
    cleanOut === '5.5' ||
    cleanOut === '5.30' ||
    cleanOut === '5:30' ||
    cleanOut === '05:30' ||
    cleanOut === '17:30' ||
    cleanOut === '5:30:00' ||
    cleanOut === '05:30:00' ||
    cleanOut === '17:30:00' ||
    cleanOut === '6' ||
    cleanOut === '6.0' ||
    cleanOut === '18:00' ||
    cleanOut === '18:00:00' ||
    cleanOut === '7' ||
    cleanOut === '7.0' ||
    cleanOut === '19:00' ||
    cleanOut.toLowerCase() === '5 pm' ||
    cleanOut.toLowerCase() === '05 pm' ||
    cleanOut.toLowerCase() === '5:00 pm' ||
    cleanOut.toLowerCase() === '05:00 pm' ||
    cleanOut.toLowerCase() === '5:30 pm' ||
    cleanOut.toLowerCase() === '05:30 pm' ||
    (isDayShift && workedHours >= 9.0 && workedHours < 11.5)
  );

  let ot = 0;
  let r135 = 0;
  let r170 = 0;

  const isShift3Night = (
    cleanOut === '11.05' || cleanOut === '11.5' || cleanOut === '11.50' ||
    cleanOut === '11:05' || cleanOut === '11:30' || cleanOut === '11:02' ||
    (outM24 !== null && (outM24 >= 21 * 60 + 30 || outM24 < 5 * 60)) ||
    /^(23:|11:05|11:30|11:02|00:)/.test(cleanOut) ||
    /11[:.]\d{2}.*pm/i.test(cleanOut)
  );

  if (isShift3Night) {
    // Shift 3 Night Shift (started 7.5 finished 11.5 or 11.05 PM to 7.5 AM): strictly 0 overtime
    ot = 0;
    r135 = 0;
    r170 = 0;
  } else if (isBefore5PMExit || (hasPunch && workedHours > 0 && workedHours < 9.0)) {
    // Departure before 5:00 PM: 0 overtime (worked 8h normal)
    ot = 0;
    r135 = 0;
    r170 = 0;
  } else if (is5pmTo6pmTier1) {
    // "[ref] [ref] [ref] [ref] [ref] [ref] 5 [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
    ot = 2;
    r135 = 2;
    r170 = 0;
  } else if (is8pmExit) {
    // Only the 8:00 PM exit has 0.5 (strictly 4.5 hours overtime: 2.0h @ 1.35x + 2.5h @ 1.70x)
    ot = 4.5;
    r135 = 2;
    r170 = 2.5;
  } else if (workedHours >= 10.0) {
    const diffHours = workedHours - 8.0;
    // All other departures are rounded strictly to a normal whole integer, minimum 2 hours!
    const roundedOt = Math.round(diffHours);
    ot = roundedOt < 2 ? 2 : roundedOt;
    r135 = 2;
    r170 = ot > 2 ? ot - 2 : 0;
  } else if (userOt !== undefined && userOt >= 0) {
    const roundedUserOt = userOt === 4.5 ? 4.5 : Math.round(userOt);
    // If the punch is after 5:00 PM, minimum overtime is 2 hours:
    ot = (outM24 !== null && outM24 >= 16 * 60 + 55) ? Math.max(2, roundedUserOt) : (roundedUserOt < 2 ? 0 : roundedUserOt);
    r135 = ot >= 2 ? 2 : ot;
    r170 = ot === 4.5 ? 2.5 : Math.max(0, ot - 2);
  }

  // Status calculation
  let finalStatus = '';
  if (hasExplicitStatus) {
    finalStatus = userStatus!;
  } else if (hasPunch && workedHours > 0) {
    finalStatus = 'P';
  } else if (hasPunch) {
    finalStatus = 'P';
  } else if (userRemark && /holiday|\u0627\u062c\u0627\u0632\u0629/i.test(userRemark)) {
    finalStatus = '';
  } else {
    finalStatus = 'A';
  }

  let finalRemarks = userRemark || '';
  if (!hasPunch && workedHours <= 0 && !userRemark) {
    finalRemarks = 'Absent';
  }

  return {
    isNormalDay: workedHours === 8.0 && ot === 0,
    otHours: ot,
    rate135Hours: r135,
    rate170Hours: r170,
    rate200Hours: 0,
    remarks: finalRemarks,
    status: finalStatus,
    isSingleSwipe: false
  };
}

export interface SalaryCalculationResult {
  baseSalary: number;
  hourlyRate: number;
  otAmount135: number;
  otAmount170: number;
  otAmount200: number;
  totalOtAmount: number;
  grossSalary: number;
}

/**
 * Calculates overtime monetary value and gross salary:
 * Standard Egyptian HR labor divisor: 30 days × 8 hours = 240 hours.
 * 1.35x Pay = rate135Hours × Hourly Rate × 1.35
 * 1.70x Pay = rate170Hours × Hourly Rate × 1.70
 * 2.0x Pay  = rate200Hours × Hourly Rate × 2.0 (Friday & Official Public Holiday Double Time)
 * Total OT Pay = ot135 + ot170 + ot200
 * Gross Salary = Base Salary + Total OT Pay
 */
export function calculateSalaryAndOvertime(
  baseSalary: number,
  rate135Hours: number,
  rate170Hours: number,
  rate200Hours: number,
  divisorHours: number = 240
): SalaryCalculationResult {
  const safeBase = Math.max(0, Number(baseSalary) || 0);
  const hourlyRate = safeBase > 0 ? safeBase / divisorHours : 0;

  const otAmount135 = Number((rate135Hours * hourlyRate * 1.35).toFixed(2));
  const otAmount170 = Number((rate170Hours * hourlyRate * 1.70).toFixed(2));
  const otAmount200 = Number((rate200Hours * hourlyRate * 2.0).toFixed(2));
  const totalOtAmount = Number((otAmount135 + otAmount170 + otAmount200).toFixed(2));
  const grossSalary = Number((safeBase + totalOtAmount).toFixed(2));

  return {
    baseSalary: safeBase,
    hourlyRate: Number(hourlyRate.toFixed(2)),
    otAmount135,
    otAmount170,
    otAmount200,
    totalOtAmount,
    grossSalary
  };
}

/**
 * Recomputes all punches, statistics, official holidays, and salaries across the dataset dynamically
 */
export function recomputeBiometricDataset(
  dataset: BiometricMonthlyDataset,
  officialHolidays: string[] = [],
  employeeSalaries: Record<string, number> = {},
  defaultBaseSalary: number = 0
): BiometricMonthlyDataset {
  const cleanHolidays = Array.from(new Set(officialHolidays.map(normalizeDateIso).filter(Boolean)));
  
  // Collect all unique dates including any designated official holidays
  const allDatesSet = new Set<string>();
  dataset.allDates.forEach((d) => {
    const norm = normalizeDateIso(d);
    if (norm) allDatesSet.add(norm);
  });
  cleanHolidays.forEach((h) => allDatesSet.add(h));
  const allDates = Array.from(allDatesSet).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();

  let grandTotalWorked = 0;
  let grandTotalOt = 0;
  let grandTotal135 = 0;
  let grandTotal170 = 0;
  let grandTotal200 = 0;
  let grandTotalBase = 0;
  let grandTotalOtPay = 0;
  let grandTotalGross = 0;

  const updatedEmployees = dataset.employees.map((emp) => {
    let empWorked = 0;
    let empOt = 0;
    let emp135 = 0;
    let emp170 = 0;
    let emp200 = 0;
    let presentCount = 0;
    let absentCount = 0;
    let weekendCount = 0;
    let holidayCount = 0;
    let fridayWorkedCount = 0;
    let officialHolidayPaidCount = 0;
    let normalCount = 0;
    const dailyOtMap: Record<string, number> = {};

    // Map existing punches by normalized ISO date
    const punchMap = new Map<string, BiometricPunchRecord>();
    emp.punches.forEach((p) => {
      const normD = normalizeDateIso(p.date);
      if (normD) punchMap.set(normD, p);
    });

    const updatedPunches: BiometricPunchRecord[] = allDates.map((dateStr, idx) => {
      const isFri = checkIsFriday(dateStr);
      const isOffHol = isOfficialHolidayDate(dateStr, cleanHolidays);
      const existing = punchMap.get(dateStr);

      if (!existing) {
        // Missing date record generated on the fly so it appears inside the slip & table
        const weekDay = isFri ? 'Friday' : getEnglishDayName(dateStr);
        const formattedDate = formatDateToDmy(dateStr);
        const breakdown = calculateOvertimeBreakdown(
          0,
          isFri,
          false,
          '',
          '',
          '',
          isOffHol ? 'P' : isFri ? '' : 'A',
          undefined,
          isOffHol
        );

        return {
          id: `${emp.code}_${dateStr}_gen_${idx}`,
          sl: idx + 1,
          code: emp.code,
          name: emp.name,
          designation: emp.designation,
          department: emp.department,
          line: emp.line,
          date: dateStr,
          formattedDate,
          weekDay,
          dayName: weekDay,
          isFriday: isFri,
          isOfficialHoliday: isOffHol,
          inTime: '',
          checkIn: '',
          outTime: '',
          checkOut: '',
          totalWorkedHours: 0,
          isNormalDay: false,
          otHours: breakdown.otHours,
          rate135Hours: breakdown.rate135Hours,
          rate170Hours: breakdown.rate170Hours,
          rate200Hours: breakdown.rate200Hours,
          status: breakdown.status,
          remarks: breakdown.remarks,
          remark: breakdown.remarks,
          sourceFile: emp.punches[0]?.sourceFile
        };
      }

      // Check single swipe (identical in/out or in without out)
      let rawInTime = existing.inTime ? existing.inTime.replace(/\s*\(\+1d\)/g, '').trim() : '';
      let rawOutTime = existing.outTime ? existing.outTime.trim() : '';

      // Repair any previously cached 12:xx AM (+1d) false night shift so 12:xx is treated as Noon (12:xx PM)!
      const is12NoonPunch = /^(12|00):\d{2}/.test(rawInTime);
      if (is12NoonPunch) {
        rawInTime = rawInTime.replace(/^00:/, '12:').replace(/AM/i, 'PM');
        if (rawOutTime.includes('(+1d)')) {
          rawOutTime = rawOutTime.replace(/\s*\(\+1d\)/gi, '').replace(/AM/i, '').trim();
        }
      }

      const cleanIn = rawInTime;
      const cleanOut = rawOutTime.replace(/\s*\(\+1d\)/g, '').trim();
      const inM = timeStringToMinutes(cleanIn);
      const outM = timeStringToMinutes(cleanOut);
      const areTimesIdentical = (inM !== null && outM !== null && Math.abs(inM - outM) <= 2);
      const isIdentical = Boolean(cleanIn && cleanOut && (cleanIn === cleanOut || areTimesIdentical));
      const isSingleSwipe = isIdentical || (Boolean(cleanIn) && !cleanOut && existing.totalWorkedHours === 0);

      let worked = isSingleSwipe ? 0 : existing.totalWorkedHours;
      let finalInTime = cleanIn ? formatTimeClean(cleanIn) : '';
      let outTime = isSingleSwipe ? '' : rawOutTime;
      let isCrossDay = is12NoonPunch ? false : existing.isCrossDay;

      if (!isSingleSwipe && cleanIn && cleanOut && (!isCrossDay || is12NoonPunch)) {
        const recalc = parseAndCalculateShiftHours(cleanIn, cleanOut);
        worked = recalc.workedHours;
        finalInTime = recalc.formattedIn;
        outTime = recalc.formattedOut;
        isCrossDay = recalc.isCrossDay;
      }

      // Filter out auto-generated placeholder remarks so holiday status applies cleanly
      const cleanUserRemark = (
        existing.remarks === 'Absent' || 
        existing.remarks === 'G.Holiday (Paid)' || 
        existing.remarks === 'G.Holiday (Worked 2x)' ||
        existing.remarks === 'W.Holiday'
      ) ? '' : existing.remarks;

      const breakdown = calculateOvertimeBreakdown(
        worked,
        isFri,
        Boolean(finalInTime),
        finalInTime,
        outTime,
        cleanUserRemark,
        existing.status,
        undefined,
        isOffHol
      );

      return {
        ...existing,
        sl: idx + 1,
        date: dateStr,
        inTime: finalInTime,
        checkIn: finalInTime,
        outTime,
        checkOut: outTime,
        isCrossDay,
        totalWorkedHours: (!isFri && !isOffHol && breakdown.otHours === 0 && worked > 8) ? 8.0 : worked,
        isFriday: isFri,
        isOfficialHoliday: isOffHol,
        isSingleSwipe,
        isNormalDay: breakdown.isNormalDay,
        otHours: breakdown.otHours,
        rate135Hours: breakdown.rate135Hours,
        rate170Hours: breakdown.rate170Hours,
        rate200Hours: breakdown.rate200Hours,
        status: breakdown.status,
        remarks: breakdown.remarks,
        remark: breakdown.remarks
      };
    });

    const resolvedPunches = cleanAndResolveShift3Punches(updatedPunches);

    resolvedPunches.forEach((p, idx) => {
      p.sl = idx + 1;
      empWorked += p.totalWorkedHours;
      empOt += p.otHours;
      emp135 += p.rate135Hours;
      emp170 += p.rate170Hours;
      emp200 += p.rate200Hours;

      if (p.status === 'P') presentCount++;
      else if (p.status === 'A') absentCount++;

      if (p.isOfficialHoliday) officialHolidayPaidCount++;
      if (p.isFriday) weekendCount++;
      if (p.isFriday && p.status === 'P' && p.totalWorkedHours > 0) fridayWorkedCount++;
      if (p.remarks.includes('G.Holiday')) holidayCount++;
      if (p.isNormalDay) normalCount++;

      dailyOtMap[p.date] = p.otHours;
    });

    const empBaseSalary = employeeSalaries[emp.code] ?? (emp.baseSalary ?? defaultBaseSalary);
    const salary = calculateSalaryAndOvertime(empBaseSalary, emp135, emp170, emp200);

    grandTotalWorked += empWorked;
    grandTotalOt += empOt;
    grandTotal135 += emp135;
    grandTotal170 += emp170;
    grandTotal200 += emp200;
    grandTotalBase += salary.baseSalary;
    grandTotalOtPay += salary.totalOtAmount;
    grandTotalGross += salary.grossSalary;

    return {
      ...emp,
      punches: resolvedPunches,
      daysOfMonth: allDates.length,
      totalWorkedHours: Number(empWorked.toFixed(2)),
      totalOtHours: Number(empOt.toFixed(2)),
      totalRate135Hours: Number(emp135.toFixed(2)),
      totalRate170Hours: Number(emp170.toFixed(2)),
      totalRate200Hours: Number(emp200.toFixed(2)),
      presentDaysCount: presentCount,
      absentDaysCount: absentCount,
      weekEndDaysCount: weekendCount,
      holidayDaysCount: holidayCount,
      fridayWorkedCount,
      officialHolidaysPaidCount: officialHolidayPaidCount,
      normalDaysCount: normalCount,
      dailyOtMap,
      baseSalary: salary.baseSalary,
      hourlyRate: salary.hourlyRate,
      otAmount135: salary.otAmount135,
      otAmount170: salary.otAmount170,
      otAmount200: salary.otAmount200,
      totalOtAmount: salary.totalOtAmount,
      grossSalary: salary.grossSalary
    };
  });

  const updatedAllPunches = updatedEmployees.flatMap((e) => e.punches);

  return {
    ...dataset,
    allDates,
    employees: updatedEmployees,
    allPunches: updatedAllPunches,
    officialHolidays: cleanHolidays,
    grandTotalWorkedHours: Number(grandTotalWorked.toFixed(2)),
    grandTotalOtHours: Number(grandTotalOt.toFixed(2)),
    grandTotal135Hours: Number(grandTotal135.toFixed(2)),
    grandTotal170Hours: Number(grandTotal170.toFixed(2)),
    grandTotal200Hours: Number(grandTotal200.toFixed(2)),
    grandTotalBaseSalary: Number(grandTotalBase.toFixed(2)),
    grandTotalOtPay: Number(grandTotalOtPay.toFixed(2)),
    grandTotalGrossSalary: Number(grandTotalGross.toFixed(2))
  };
}

/**
 * Universal biometric parser that strictly calculates on what is in the sheet:
 * "[ref] [ref] [ref] [ref] [ref] [ref]"
 */
export async function parseMonthlyBiometricFile(
  file: File,
  options: { officialHolidays?: string[]; defaultBaseSalary?: number } = {}
): Promise<BiometricMonthlyDataset> {
  const officialHolidays = options.officialHolidays || [];
  const defaultBaseSalary = options.defaultBaseSalary ?? 0;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  let targetSheet: XLSX.WorkSheet | null = null;
  for (const sName of workbook.SheetNames) {
    const s = workbook.Sheets[sName];
    if (s && s['!ref']) {
      targetSheet = s;
      break;
    }
  }

  if (!targetSheet) {
    throw new Error('Workbook contains no readable sheets.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });
  if (rawRows.length === 0) {
    throw new Error('The selected Excel sheet is empty.');
  }

  // Scan first 15 rows to find the row that has column headers
  let headerRowIndex = 0;
  let maxScore = -1;

  const headerKeywords = ['cardno', 'code', '\u0643\u0648\u062f', 'name', '\u0627\u0633\u0645', 'intime', 'in', 'out', 'date', '\u062a\u0627\u0631\u064a\u062e', 'ot', 'section', 'dept', '\u0642\u0633\u0645', 'designation', 'status', 'state'];

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    row.forEach((cell) => {
      const norm = normalizeHeader(String(cell || ''));
      if (headerKeywords.some((k) => norm === k || norm.includes(k))) {
        score++;
      }
    });
    if (score > maxScore && score >= 2) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rawRows[headerRowIndex].map((h: any, idx: number) => String(h || `COL_${idx}`).trim());
  const detected = detectBiometricHeaders(headerRow);

  // Auto-detect whether date format in the file is DD/MM/YYYY (standard in Egypt) or MM/DD/YYYY
  let globalDateFormat: 'DMY' | 'MDY' = 'DMY';
  if (detected.dateCol) {
    const cIdx = headerRow.indexOf(detected.dateCol);
    for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 100, rawRows.length); r++) {
      const rowArr = rawRows[r];
      if (!Array.isArray(rowArr)) continue;
      const cellVal = String(rowArr[cIdx] || '').trim();
      const m = cellVal.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (m) {
        const p1 = parseInt(m[1], 10);
        const p2 = parseInt(m[2], 10);
        if (p1 > 12) {
          globalDateFormat = 'DMY';
          break;
        } else if (p2 > 12) {
          globalDateFormat = 'MDY';
          break;
        }
      }
    }
  }

  const fallbackDate = extractDateFromFilenameSmart(file.name);
  const allPunches: BiometricPunchRecord[] = [];
  const empMap = new Map<string, BiometricEmployeeMonthlySummary>();
  const datesSet = new Set<string>();

  // Process data rows strictly as they exist in the uploaded sheet!
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rowArr = rawRows[r];
    if (!Array.isArray(rowArr) || rowArr.length === 0) continue;

    const rowObj: Record<string, any> = {};
    headerRow.forEach((colName, cIdx) => {
      rowObj[colName] = rowArr[cIdx] !== undefined ? rowArr[cIdx] : '';
    });

    // 1. Code
    let code = '';
    if (detected.codeCol && rowObj[detected.codeCol] !== undefined) {
      code = String(rowObj[detected.codeCol]).trim();
    }
    if (!code) {
      const c0 = String(rowArr[0] || '').trim();
      const c1 = String(rowArr[1] || '').trim();
      if (/^\d{2,8}$/.test(c0)) code = c0;
      else if (/^\d{2,8}$/.test(c1)) code = c1;
    }
    if (!code || code === '0' || code === '-') continue;

    // 2. Name
    let name = '';
    if (detected.nameCol && rowObj[detected.nameCol]) {
      name = String(rowObj[detected.nameCol]).trim();
    }
    if (!name) {
      const c1 = String(rowArr[1] || '').trim();
      const c2 = String(rowArr[2] || '').trim();
      if (c1 && !/^\d+$/.test(c1)) name = c1;
      else if (c2 && !/^\d+$/.test(c2)) name = c2;
      else name = `Employee ${code}`;
    }

    // 3. Designation & Line
    const designation = detected.desigCol ? String(rowObj[detected.desigCol] || '').trim() : 'Staff';
    const line = detected.lineCol ? String(rowObj[detected.lineCol] || '').trim() : 'Nil';

    // 4. Department
    let department = 'Finishing';
    if (detected.deptCol && rowObj[detected.deptCol]) {
      department = String(rowObj[detected.deptCol]).trim() || 'General';
    } else {
      for (const k of Object.keys(rowObj)) {
        const nk = normalizeHeader(k);
        if (DEPT_KEYWORDS.some((dk) => nk.includes(dk))) {
          const val = String(rowObj[k] || '').trim();
          if (val) {
            department = val;
            break;
          }
        }
      }
    }

    // 5. Date & Day Name
    let rawDateVal = detected.dateCol ? rowObj[detected.dateCol] : undefined;
    const dateStr = parseCellToIsoDate(rawDateVal, fallbackDate, globalDateFormat);
    datesSet.add(dateStr);

    let weekDay = detected.dayCol && rowObj[detected.dayCol] ? String(rowObj[detected.dayCol]).trim() : '';
    if (!weekDay) {
      weekDay = getEnglishDayName(dateStr);
    }
    const isFriday = checkIsFriday(dateStr, weekDay);
    const formattedDate = formatDateToDmy(dateStr);

    // 6. In & Out Times with 3-Shift Intelligence (Shift 1: 07:30-15:30, Shift 2: 15:30-23:30, Shift 3: 23:30-07:30 next day)
    let checkInStr = '';
    let checkOutStr = '';
    let workedHours = 0;
    let shiftName = '';
    let isCrossDay = false;

    if (detected.combinedCol && rowObj[detected.combinedCol]) {
      const res = splitCombinedInOut(rowObj[detected.combinedCol]);
      checkInStr = res.checkInStr;
      checkOutStr = res.checkOutStr;
      workedHours = res.workedHours;
      shiftName = res.shiftName || '';
      isCrossDay = res.isCrossDay || false;
    } else if (detected.inCol || detected.outCol) {
      const rawIn = detected.inCol ? rowObj[detected.inCol] : '';
      const rawOut = detected.outCol ? rowObj[detected.outCol] : '';

      const calc = parseAndCalculateShiftHours(rawIn, rawOut);
      checkInStr = calc.formattedIn;
      checkOutStr = calc.formattedOut;
      workedHours = calc.workedHours;
      shiftName = calc.shiftName;
      isCrossDay = calc.isCrossDay;
    } else {
      for (const val of rowArr) {
        const cell = String(val || '');
        if (cell.includes(':') && (cell.includes('-') || cell.includes('/') || cell.includes(' '))) {
          const res = splitCombinedInOut(cell);
          if (res.workedHours > 0 || res.checkInStr !== '') {
            checkInStr = res.checkInStr;
            checkOutStr = res.checkOutStr;
            workedHours = res.workedHours;
            shiftName = res.shiftName || '';
            isCrossDay = res.isCrossDay || false;
            break;
          }
        }
      }
    }

    // 7. Explicit columns from the user's sheet: Status, OT Hr, Remarks
    let userOt: number | undefined = undefined;
    if (detected.hoursCol && rowObj[detected.hoursCol] !== undefined && rowObj[detected.hoursCol] !== '') {
      const parsedH = parseFloat(String(rowObj[detected.hoursCol]).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedH)) userOt = parsedH;
    }

    const userStatus = detected.statusCol && rowObj[detected.statusCol] !== undefined
      ? String(rowObj[detected.statusCol]).trim()
      : undefined;

    const userRemark = detected.remarkCol && rowObj[detected.remarkCol] !== undefined
      ? String(rowObj[detected.remarkCol]).trim()
      : undefined;

    // Check single swipe (identical in/out or in without out)
    const inMin = timeStringToMinutes(checkInStr);
    const outMin = timeStringToMinutes(checkOutStr);
    const areIdenticalTimes = (inMin !== null && outMin !== null && Math.abs(inMin - outMin) <= 2);
    const isSingleSwipeRow = areIdenticalTimes || 
      (Boolean(checkInStr) && Boolean(checkOutStr) && checkInStr.trim() === checkOutStr.trim()) ||
      (Boolean(checkInStr) && !checkOutStr && workedHours === 0);

    if (isSingleSwipeRow) {
      checkOutStr = ''; // Forgotten out punch!
      workedHours = 0;  // Zero overtime!
      userOt = 0;       // Override userOt to 0: "\u0645\u0634 \u062a\u062d\u0633\u0628 \u0627\u064a \u0627\u0648\u0641\u0631 \u062a\u0627\u064a\u0645 \u0644\u0627\u0646\u0647 \u0646\u0633\u064a \u064a\u0628\u0635\u0645 \u062e\u0631\u0648\u062c \u0627\u0635\u0644\u0627"
    }

    const hasPunch = Boolean(checkInStr || checkOutStr || workedHours > 0);
    const isOfficialHoliday = isOfficialHolidayDate(dateStr, officialHolidays);

    const breakdown = calculateOvertimeBreakdown(
      workedHours,
      isFriday,
      hasPunch,
      checkInStr,
      checkOutStr,
      userRemark,
      userStatus,
      userOt,
      isOfficialHoliday
    );

    const punchRecord: BiometricPunchRecord = {
      id: `${code}_${dateStr}_${r}`,
      sl: 0,
      code,
      name,
      designation,
      department,
      line,
      date: dateStr,
      formattedDate,
      weekDay,
      dayName: weekDay,
      isFriday,
      isOfficialHoliday,
      isSingleSwipe: breakdown.isSingleSwipe,
      inTime: checkInStr,
      checkIn: checkInStr,
      outTime: breakdown.isSingleSwipe ? '' : checkOutStr,
      checkOut: breakdown.isSingleSwipe ? '' : checkOutStr,
      totalWorkedHours: breakdown.isSingleSwipe ? 0 : ((!isFriday && !isOfficialHoliday && breakdown.otHours === 0 && workedHours > 8) ? 8.0 : workedHours),
      isNormalDay: breakdown.isNormalDay,
      otHours: breakdown.otHours,
      rate135Hours: breakdown.rate135Hours,
      rate170Hours: breakdown.rate170Hours,
      rate200Hours: breakdown.rate200Hours,
      status: breakdown.status,
      remarks: breakdown.remarks,
      remark: breakdown.remarks,
      shift: shiftName,
      isCrossDay: breakdown.isSingleSwipe ? false : isCrossDay,
      sourceFile: file.name
    };

    if (!empMap.has(code)) {
      empMap.set(code, {
        code,
        name,
        designation,
        department,
        line,
        daysOfMonth: 0,
        presentDaysCount: 0,
        absentDaysCount: 0,
        lateDaysCount: 0,
        leaveDaysCount: 0,
        holidayDaysCount: 0,
        weekEndDaysCount: 0,
        fridayWorkedCount: 0,
        normalDaysCount: 0,
        totalWorkedHours: 0,
        totalOtHours: 0,
        totalRate135Hours: 0,
        totalRate170Hours: 0,
        totalRate200Hours: 0,
        punches: [],
        dailyOtMap: {}
      });
    }

    const emp = empMap.get(code)!;
    if (name && emp.name.startsWith('Employee ') && !name.startsWith('Employee ')) {
      emp.name = name;
    }
    if (designation && emp.designation === 'Staff') emp.designation = designation;
    if (department && emp.department === 'Finishing') emp.department = department;

    // Add punch to employee exactly as it came from the sheet
    emp.punches.push(punchRecord);
    allPunches.push(punchRecord);
  }

  // Ensure all Fridays in the period are written even if missing from the uploaded sheet:
  // "[ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref] [ref]"
  const validIsoDates = Array.from(datesSet).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (validIsoDates.length > 0) {
    const minDateStr = validIsoDates[0];
    const maxDateStr = validIsoDates[validIsoDates.length - 1];

    const [minY, minM, minD] = minDateStr.split('-').map(Number);
    const [maxY, maxM, maxD] = maxDateStr.split('-').map(Number);

    // Strictly start on the exact first date of the uploaded sheet and end on the exact last date
    const startDate = new Date(minY, minM - 1, minD);
    const endDate = new Date(maxY, maxM - 1, maxD);

    // Collect all calendar dates strictly between startDate and endDate of the uploaded sheet
    const periodDates: string[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      periodDates.push(dStr);
      datesSet.add(dStr);
      cur.setDate(cur.getDate() + 1);
    }

    // Now, for every employee, ensure every single calendar day in the period has a record:
    // - Fridays without work: blank times, blank OT, W.Holiday
    // - Days without punch (not Friday): Status 'A' (Absent - [ref]), 0 OT, blank times
    for (const emp of empMap.values()) {
      for (const dStr of periodDates) {
        const isFri = checkIsFriday(dStr);
        const existingRecord = emp.punches.find((p) => p.date === dStr);

        if (!existingRecord) {
          const formattedDate = formatDateToDmy(dStr);
          const isOffHol = isOfficialHolidayDate(dStr, officialHolidays);
          const weekDay = isFri ? 'Friday' : getEnglishDayName(dStr);

          if (isOffHol) {
            // Official Paid Public Holiday: counted as attendance ([ref]) with 0 OT
            const newHolidayPunch: BiometricPunchRecord = {
              id: `${emp.code}_${dStr}_holiday`,
              sl: 0,
              code: emp.code,
              name: emp.name,
              designation: emp.designation,
              department: emp.department,
              line: emp.line,
              date: dStr,
              formattedDate,
              weekDay,
              dayName: weekDay,
              isFriday: isFri,
              isOfficialHoliday: true,
              inTime: '',
              checkIn: '',
              outTime: '',
              checkOut: '',
              totalWorkedHours: 0,
              isNormalDay: false,
              otHours: 0,
              rate135Hours: 0,
              rate170Hours: 0,
              rate200Hours: 0,
              status: 'P', // Counted as attendance (\u062d\u0636\u0648\u0631)
              remarks: 'G.Holiday (Paid)',
              remark: 'G.Holiday (Paid)',
              sourceFile: file.name
            };
            emp.punches.push(newHolidayPunch);
            allPunches.push(newHolidayPunch);
          } else if (isFri) {
            // Missing Friday: Weekly Holiday with blank times & OT
            const newFriPunch: BiometricPunchRecord = {
              id: `${emp.code}_${dStr}_friday`,
              sl: 0,
              code: emp.code,
              name: emp.name,
              designation: emp.designation,
              department: emp.department,
              line: emp.line,
              date: dStr,
              formattedDate,
              weekDay: 'Friday',
              dayName: 'Friday',
              isFriday: true,
              inTime: '',
              checkIn: '',
              outTime: '',
              checkOut: '',
              totalWorkedHours: 0,
              isNormalDay: false,
              otHours: 0,
              rate135Hours: 0,
              rate170Hours: 0,
              rate200Hours: 0,
              status: '',
              remarks: 'W.Holiday',
              remark: 'W.Holiday',
              sourceFile: file.name
            };
            emp.punches.push(newFriPunch);
            allPunches.push(newFriPunch);
          } else {
            // Missing workday: Mark as 'A' (Absent)
            const newAbsentPunch: BiometricPunchRecord = {
              id: `${emp.code}_${dStr}_absent`,
              sl: 0,
              code: emp.code,
              name: emp.name,
              designation: emp.designation,
              department: emp.department,
              line: emp.line,
              date: dStr,
              formattedDate,
              weekDay,
              dayName: weekDay,
              isFriday: false,
              inTime: '',
              checkIn: '',
              outTime: '',
              checkOut: '',
              totalWorkedHours: 0,
              isNormalDay: false,
              otHours: 0,
              rate135Hours: 0,
              rate170Hours: 0,
              rate200Hours: 0,
              status: 'A',
              remarks: 'Absent',
              remark: 'Absent',
              sourceFile: file.name
            };
            emp.punches.push(newAbsentPunch);
            allPunches.push(newAbsentPunch);
          }
        } else {
          // If record already existed in sheet:
          if (isFri && (!existingRecord.otHours || existingRecord.otHours <= 0) && (!existingRecord.totalWorkedHours || existingRecord.totalWorkedHours <= 0)) {
            // Friday off: blank punch times & OT
            existingRecord.inTime = '';
            existingRecord.checkIn = '';
            existingRecord.outTime = '';
            existingRecord.checkOut = '';
            existingRecord.otHours = 0;
            existingRecord.rate135Hours = 0;
            existingRecord.rate170Hours = 0;
            existingRecord.rate200Hours = 0;
            existingRecord.status = '';
            if (!existingRecord.remarks || existingRecord.remarks.includes('Absent') || existingRecord.remarks.includes('\u063a\u0627\u0628')) {
              existingRecord.remarks = 'W.Holiday';
              existingRecord.remark = 'W.Holiday';
            }
          } else if (!isFri && (!existingRecord.inTime || existingRecord.inTime === '-') && (!existingRecord.outTime || existingRecord.outTime === '-') && existingRecord.totalWorkedHours <= 0 && (!existingRecord.otHours || existingRecord.otHours <= 0)) {
            // Regular workday with empty punches: ensure marked as 'A' (Absent)
            if (!existingRecord.status || existingRecord.status === 'P') {
              existingRecord.status = 'A';
            }
            if (!existingRecord.remarks) {
              existingRecord.remarks = 'Absent';
              existingRecord.remark = 'Absent';
            }
          }
        }
      }

      // Sort employee punches strictly by date so all days fall in exact chronological order
      emp.punches.sort((a, b) => a.date.localeCompare(b.date));

      // Cross-day Shift 3 resolution (Night Shift: 23:30 to 07:30 next morning, eliminating next-day ghost check-ins)
      emp.punches = cleanAndResolveShift3Punches(emp.punches);
    }

    // Rebuild allPunches from updated clean punches
    allPunches.length = 0;
    for (const emp of empMap.values()) {
      allPunches.push(...emp.punches);
    }

    // Sort allPunches chronologically
    allPunches.sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      return a.code.localeCompare(b.code, 'en');
    });
  }

  const allDates = Array.from(datesSet).sort();
  const employees = Array.from(empMap.values());

  // Finalize totals for each employee based STRICTLY on their sheet rows
  employees.forEach((emp) => {
    // Number rows sequentially as SL: 1, 2, 3...
    emp.punches.forEach((p, idx) => {
      p.sl = idx + 1;
    });

    let workedSum = 0;
    let otSum = 0;
    let r135Sum = 0;
    let r170Sum = 0;
    let r200Sum = 0;
    let presentCount = 0;
    let absentCount = 0;
    let normalCount = 0;
    let weekEndCount = 0;
    let holidayCount = 0;
    let fridayWorkedCount = 0;

    emp.punches.forEach((p) => {
      workedSum += p.totalWorkedHours;
      otSum += p.otHours;
      r135Sum += p.rate135Hours;
      r170Sum += p.rate170Hours;
      r200Sum += p.rate200Hours;

      if (p.status === 'P') presentCount++;
      if (p.status === 'A') absentCount++;
      if (p.isNormalDay) normalCount++;
      if (p.isFriday) weekEndCount++;
      if (p.remarks.includes('G.Holiday')) holidayCount++;
      if (p.isFriday && (p.status === 'P' || p.otHours > 0)) fridayWorkedCount++;

      emp.dailyOtMap[p.date] = p.otHours;
    });

    emp.daysOfMonth = emp.punches.length;
    emp.presentDaysCount = presentCount;
    emp.absentDaysCount = absentCount;
    emp.normalDaysCount = normalCount;
    emp.weekEndDaysCount = weekEndCount;
    emp.holidayDaysCount = holidayCount;
    emp.fridayWorkedCount = fridayWorkedCount;
    emp.totalWorkedHours = Number(workedSum.toFixed(2));
    emp.totalOtHours = Number(otSum.toFixed(2));
    emp.totalRate135Hours = Number(r135Sum.toFixed(2));
    emp.totalRate170Hours = Number(r170Sum.toFixed(2));
    emp.totalRate200Hours = Number(r200Sum.toFixed(2));

    const salary = calculateSalaryAndOvertime(defaultBaseSalary, emp.totalRate135Hours, emp.totalRate170Hours, emp.totalRate200Hours);
    emp.baseSalary = salary.baseSalary;
    emp.hourlyRate = salary.hourlyRate;
    emp.otAmount135 = salary.otAmount135;
    emp.otAmount170 = salary.otAmount170;
    emp.otAmount200 = salary.otAmount200;
    emp.totalOtAmount = salary.totalOtAmount;
    emp.grossSalary = salary.grossSalary;
  });

  employees.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.code.localeCompare(b.code, 'en');
  });

  let grandTotalWorkedHours = 0;
  let grandTotalOtHours = 0;
  let grandTotal135Hours = 0;
  let grandTotal170Hours = 0;
  let grandTotal200Hours = 0;
  let grandTotalBaseSalary = 0;
  let grandTotalOtPay = 0;
  let grandTotalGrossSalary = 0;

  employees.forEach((e) => {
    grandTotalWorkedHours += e.totalWorkedHours;
    grandTotalOtHours += e.totalOtHours;
    grandTotal135Hours += e.totalRate135Hours;
    grandTotal170Hours += e.totalRate170Hours;
    grandTotal200Hours += e.totalRate200Hours;
    grandTotalBaseSalary += (e.baseSalary || 0);
    grandTotalOtPay += (e.totalOtAmount || 0);
    grandTotalGrossSalary += (e.grossSalary || 0);
  });

  return {
    allDates,
    employees,
    allPunches,
    officialHolidays,
    grandTotalWorkedHours: Number(grandTotalWorkedHours.toFixed(2)),
    grandTotalOtHours: Number(grandTotalOtHours.toFixed(2)),
    grandTotal135Hours: Number(grandTotal135Hours.toFixed(2)),
    grandTotal170Hours: Number(grandTotal170Hours.toFixed(2)),
    grandTotal200Hours: Number(grandTotal200Hours.toFixed(2)),
    grandTotalBaseSalary: Number(grandTotalBaseSalary.toFixed(2)),
    grandTotalOtPay: Number(grandTotalOtPay.toFixed(2)),
    grandTotalGrossSalary: Number(grandTotalGrossSalary.toFixed(2))
  };
}
