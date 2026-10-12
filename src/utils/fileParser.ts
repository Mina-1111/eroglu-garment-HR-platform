import * as XLSX from 'xlsx';
import { RawAttendanceRow, RawOvertimeRow, AttendanceStatus } from '../types/audit';
import { extractDateFromFilenameSmart } from './dateExtractor';

// Normalize header text for fuzzy matching
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

export const DEPT_KEYWORDS: string[] = [
  '\u0627\u0644\u0642\u0633\u0645', '\u0642\u0633\u0645', '\u0627\u0644\u0627\u062f\u0627\u0631\u0647', '\u0627\u062f\u0627\u0631\u0647', '\u0627\u0644\u0648\u0638\u064a\u0641\u0647', '\u0648\u0638\u064a\u0641\u0647', '\u0627\u0644\u0645\u0648\u0642\u0639', '\u0627\u0644\u0641\u0631\u0639', '\u062e\u0637', '\u0639\u0646\u0628\u0631',
  'department', 'dept', 'section', 'sec', 'division', 'div', 'unit', 'cost_center', 'costcenter', 'area', 'line', 'job'
];

export function detectAttendanceColumns(headers: string[]): {
  codeCol?: string;
  nameCol?: string;
  deptCol?: string;
  dateCol?: string;
  statusCol?: string;
  checkInCol?: string;
  checkOutCol?: string;
  notesCol?: string;
} {
  const result: ReturnType<typeof detectAttendanceColumns> = {};

  const codeKeywords = ['\u0643\u0648\u062f\u0627\u0644\u0645\u0648\u0638\u0641', '\u0643\u0648\u062f', '\u0631\u0642\u0645\u0627\u0644\u0645\u0648\u0638\u0641', '\u0627\u0644\u0631\u0642\u0645\u0627\u0644\u0648\u0638\u064a\u0641\u064a', '\u0631\u0642\u0645\u0627\u0644\u0628\u0635\u0645\u0647', '\u0628\u0635\u0645\u0647', 'code', 'empid', 'id', 'empcode', 'badge'];
  const nameKeywords = ['\u0627\u0633\u0645\u0627\u0644\u0645\u0648\u0638\u0641', '\u0627\u0644\u0627\u0633\u0645', '\u0627\u0633\u0645', 'name', 'empname', 'employeename', 'fullname'];
  const deptKeywords = [
    '\u0627\u0644\u0642\u0633\u0645', '\u0642\u0633\u0645', '\u0627\u0644\u0627\u062f\u0627\u0631\u0647', '\u0627\u062f\u0627\u0631\u0647', '\u0627\u0644\u0648\u0638\u064a\u0641\u0647', '\u0648\u0638\u064a\u0641\u0647', '\u0627\u0644\u0645\u0648\u0642\u0639', '\u0627\u0644\u0641\u0631\u0639', '\u062e\u0637', '\u0639\u0646\u0628\u0631',
    'department', 'dept', 'section', 'sec', 'division', 'div', 'unit', 'cost_center', 'costcenter', 'area', 'line', 'job'
  ];
  const dateKeywords = ['\u0627\u0644\u062a\u0627\u0631\u064a\u062e', '\u062a\u0627\u0631\u064a\u062e', '\u0627\u0644\u064a\u0648\u0645', 'date', 'day', 'attendance_date'];
  const statusKeywords = ['\u0627\u0644\u062d\u0627\u0644\u0647', '\u062d\u0627\u0644\u0647', '\u062d\u0627\u0644\u0647\u0627\u0644\u062d\u0636\u0648\u0631', '\u062d\u0636\u0648\u0631/\u063a\u064a\u0627\u0628', '\u062d\u0636\u0648\u0631', '\u063a\u064a\u0627\u0628', 'status', 'attendance', 'state'];
  const inKeywords = ['\u062f\u062e\u0648\u0644', '\u062d\u0636\u0648\u0631', '\u0648\u0642\u062a\u0627\u0644\u062f\u062e\u0648\u0644', 'checkin', 'in', 'timein'];
  const outKeywords = ['\u062e\u0631\u0648\u062c', '\u0627\u0646\u0635\u0631\u0627\u0641', '\u0648\u0642\u062a\u0627\u0644\u062e\u0631\u0648\u062c', 'checkout', 'out', 'timeout'];
  const notesKeywords = ['\u0645\u0644\u0627\u062d\u0638\u0627\u062a', '\u0645\u0644\u0627\u062d\u0638\u0647', '\u0627\u0644\u0628\u064a\u0627\u0646', 'notes', 'note', 'remarks', 'comment'];

  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    if (!result.codeCol && codeKeywords.some((k) => norm.includes(k))) result.codeCol = h;
    else if (!result.nameCol && nameKeywords.some((k) => norm.includes(k))) result.nameCol = h;
    else if (!result.deptCol && deptKeywords.some((k) => norm.includes(k))) result.deptCol = h;
    else if (!result.dateCol && dateKeywords.some((k) => norm.includes(k))) result.dateCol = h;
    else if (!result.statusCol && statusKeywords.some((k) => norm.includes(k))) result.statusCol = h;
    else if (!result.checkInCol && inKeywords.some((k) => norm.includes(k))) result.checkInCol = h;
    else if (!result.checkOutCol && outKeywords.some((k) => norm.includes(k))) result.checkOutCol = h;
    else if (!result.notesCol && notesKeywords.some((k) => norm.includes(k))) result.notesCol = h;
  });

  return result;
}

export function detectOvertimeColumns(headers: string[]): {
  codeCol?: string;
  nameCol?: string;
  deptCol?: string;
  dateCol?: string;
  hoursCol?: string;
  reasonCol?: string;
} {
  const result: ReturnType<typeof detectOvertimeColumns> = {};

  const codeKeywords = ['\u0643\u0648\u062f\u0627\u0644\u0645\u0648\u0638\u0641', '\u0643\u0648\u062f', '\u0631\u0642\u0645\u0627\u0644\u0645\u0648\u0638\u0641', '\u0627\u0644\u0631\u0642\u0645\u0627\u0644\u0648\u0638\u064a\u0641\u064a', '\u0631\u0642\u0645\u0627\u0644\u0628\u0635\u0645\u0647', 'code', 'empid', 'id', 'empcode', 'badge'];
  const nameKeywords = ['\u0627\u0633\u0645\u0627\u0644\u0645\u0648\u0638\u0641', '\u0627\u0644\u0627\u0633\u0645', '\u0627\u0633\u0645', 'name', 'empname', 'employeename'];
  const deptKeywords = [
    '\u0627\u0644\u0642\u0633\u0645', '\u0642\u0633\u0645', '\u0627\u0644\u0627\u062f\u0627\u0631\u0647', '\u0627\u062f\u0627\u0631\u0647', '\u0627\u0644\u0648\u0638\u064a\u0641\u0647', '\u0648\u0638\u064a\u0641\u0647', '\u0627\u0644\u0645\u0648\u0642\u0639', '\u0627\u0644\u0641\u0631\u0639', '\u062e\u0637', '\u0639\u0646\u0628\u0631',
    'department', 'dept', 'section', 'sec', 'division', 'div', 'unit', 'cost_center', 'costcenter', 'area', 'line', 'job'
  ];
  const dateKeywords = ['\u0627\u0644\u062a\u0627\u0631\u064a\u062e', '\u062a\u0627\u0631\u064a\u062e', '\u0627\u0644\u064a\u0648\u0645', 'date', 'day'];
  const hoursKeywords = ['\u0633\u0627\u0639\u0627\u062a\u0627\u0636\u0627\u0641\u064a', '\u0633\u0627\u0639\u0627\u062a\u0627\u0644\u0627\u0648\u0641\u0631\u062a\u0627\u064a\u0645', '\u0627\u0644\u0627\u0648\u0641\u0631\u062a\u0627\u064a\u0645', '\u0627\u0648\u0641\u0631\u062a\u0627\u064a\u0645', '\u0627\u0636\u0627\u0641\u064a', '\u0633\u0627\u0639\u0627\u062a', 'hours', 'ot', 'othours', 'overtime', 'extrahours'];
  const reasonKeywords = ['\u0633\u0628\u0628', '\u0627\u0644\u0633\u0628\u0628', '\u0628\u064a\u0627\u0646', '\u0645\u0644\u0627\u062d\u0638\u0627\u062a', 'reason', 'notes', 'description'];

  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    if (!result.codeCol && codeKeywords.some((k) => norm.includes(k))) result.codeCol = h;
    else if (!result.nameCol && nameKeywords.some((k) => norm.includes(k))) result.nameCol = h;
    else if (!result.deptCol && deptKeywords.some((k) => norm.includes(k))) result.deptCol = h;
    else if (!result.dateCol && dateKeywords.some((k) => norm.includes(k))) result.dateCol = h;
    else if (!result.hoursCol && hoursKeywords.some((k) => norm.includes(k))) result.hoursCol = h;
    else if (!result.reasonCol && reasonKeywords.some((k) => norm.includes(k))) result.reasonCol = h;
  });

  return result;
}

export function normalizeAttendanceStatus(rawVal: any): AttendanceStatus {
  if (rawVal === undefined || rawVal === null) return 'unknown';
  const val = String(rawVal).trim().toLowerCase();
  const norm = normalizeHeader(val);

  if (norm.includes('\u062d\u0627\u0636\u0631') || norm.includes('\u062d\u0636\u0648\u0631') || norm === 'p' || norm === 'present' || norm === '1') {
    return 'present';
  }
  if (norm.includes('\u063a\u064a\u0627\u0628') || norm.includes('\u063a\u0627\u0626\u0628') || norm === 'a' || norm === 'absent' || norm === '0') {
    return 'absent';
  }
  if (norm.includes('\u062c\u0645\u0639\u0647') || norm.includes('\u0631\u0627\u062d\u0647') || norm.includes('\u0639\u0637\u0644\u0647') || norm.includes('off') || norm.includes('rest')) {
    return 'rest_day';
  }
  if (norm.includes('\u0645\u0631\u0636\u064a') || norm.includes('\u0639\u0644\u0627\u062c') || norm.includes('sick')) {
    return 'sick';
  }
  if (norm.includes('\u0627\u062c\u0627\u0632\u0647') || norm.includes('\u0633\u0646\u0648\u064a') || norm.includes('\u0627\u0639\u062a\u064a\u0627') || norm.includes('leave') || norm.includes('vacation')) {
    return 'leave';
  }
  if (norm.includes('\u0631\u0633\u0645\u064a') || norm.includes('\u0639\u064a\u062f') || norm.includes('holiday')) {
    return 'holiday';
  }

  return 'unknown';
}

function normalizeDate(rawVal: any, fallbackDate?: string): string {
  if (!rawVal && fallbackDate) return fallbackDate;
  if (!rawVal) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Handle Excel Serial Date Number
  if (typeof rawVal === 'number') {
    const excelEpoch = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
    return excelEpoch.toISOString().split('T')[0];
  }

  const str = String(rawVal).trim();
  // Match standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback parsed date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallbackDate || new Date().toISOString().split('T')[0];
}

// Extract date from file name using smart extractor
export function extractDateFromFilename(fileName: string): string {
  return extractDateFromFilenameSmart(fileName);
}

export async function parseAttendanceFile(file: File): Promise<{
  rows: RawAttendanceRow[];
  headers: string[];
  detectedCols: ReturnType<typeof detectAttendanceColumns>;
  sheetNames: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetNames[0]];

  const rawJson: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  if (rawJson.length === 0) {
    return { rows: [], headers: [], detectedCols: {}, sheetNames };
  }

  const headers = Object.keys(rawJson[0]);
  const detectedCols = detectAttendanceColumns(headers);

  const fallbackDate = extractDateFromFilenameSmart(file.name);

  const rows: RawAttendanceRow[] = [];
  for (const row of rawJson) {
    const codeVal = detectedCols.codeCol ? row[detectedCols.codeCol] : row['\u0643\u0648\u062f'] || row['Code'] || row[headers[0]];
    const code = String(codeVal || '').trim();
    if (!code) continue;

    const name = detectedCols.nameCol ? String(row[detectedCols.nameCol] || '').trim() : undefined;
    const department = detectedCols.deptCol ? String(row[detectedCols.deptCol] || '').trim() : undefined;
    const rawDate = detectedCols.dateCol ? row[detectedCols.dateCol] : undefined;
    const date = normalizeDate(rawDate, fallbackDate);
    const statusRaw = detectedCols.statusCol ? row[detectedCols.statusCol] : 'present';
    const status = normalizeAttendanceStatus(statusRaw);

    rows.push({
      code,
      name: name || undefined,
      department: department || undefined,
      date,
      status,
      checkIn: detectedCols.checkInCol ? String(row[detectedCols.checkInCol] || '') : undefined,
      checkOut: detectedCols.checkOutCol ? String(row[detectedCols.checkOutCol] || '') : undefined,
      notes: detectedCols.notesCol ? String(row[detectedCols.notesCol] || '') : undefined
    });
  }

  return { rows, headers, detectedCols, sheetNames };
}

export async function parseOvertimeFile(file: File, forcedDate?: string): Promise<{
  rows: RawOvertimeRow[];
  headers: string[];
  detectedCols: ReturnType<typeof detectOvertimeColumns>;
  sheetNames: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const allRows: RawOvertimeRow[] = [];
  let allHeaders: string[] = [];
  let detectedCols: ReturnType<typeof detectOvertimeColumns> = {};

  // File date extracted directly from filename as requested
  const fileDate = forcedDate || extractDateFromFilenameSmart(file.name);

  // Process all sheets in workbook (helpful if daily OT is in tabs)
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rawJson.length === 0) continue;

    const headers = Object.keys(rawJson[0]);
    if (allHeaders.length === 0) {
      allHeaders = headers;
      detectedCols = detectOvertimeColumns(headers);
    }

    const sheetDate = sheetNames.length > 1 
      ? (forcedDate || extractDateFromFilenameSmart(sheetName) || fileDate) 
      : fileDate;

    rawJson.forEach((row) => {
      const codeVal = detectedCols.codeCol ? row[detectedCols.codeCol] : row['\u0643\u0648\u062f'] || row['Code'] || row[headers[0]];
      const code = String(codeVal || '').trim();
      if (!code) return;

      const name = detectedCols.nameCol ? String(row[detectedCols.nameCol] || '').trim() : undefined;
      
      // Extract department verbatim from sheet with extensive keyword search
      let department: string | undefined = undefined;
      if (detectedCols.deptCol && row[detectedCols.deptCol] !== undefined) {
        const val = String(row[detectedCols.deptCol]).trim();
        if (val) department = val;
      }
      if (!department) {
        for (const k of Object.keys(row)) {
          const nk = normalizeHeader(k);
          if (DEPT_KEYWORDS.some((dk: string) => nk.includes(dk))) {
            const val = String(row[k] || '').trim();
            if (val) {
              department = val;
              break;
            }
          }
        }
      }
      
      // Use the file date itself for every employee in this sheet
      const date = sheetDate;

      let hours = 0;
      if (detectedCols.hoursCol && row[detectedCols.hoursCol] !== undefined) {
        const parsedH = parseFloat(String(row[detectedCols.hoursCol]).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedH)) hours = parsedH;
      }

      const reason = detectedCols.reasonCol ? String(row[detectedCols.reasonCol] || '').trim() : undefined;

      allRows.push({
        code,
        name: name || undefined,
        department: department || undefined,
        date,
        hours,
        sourceFile: sheetNames.length > 1 ? `${file.name} [${sheetName}]` : file.name,
        reason
      });
    });
  }

  return {
    rows: allRows,
    headers: allHeaders,
    detectedCols,
    sheetNames
  };
}

export function parseRawPastedText(text: string, type: 'attendance' | 'overtime'): {
  attendanceRows?: RawAttendanceRow[];
  overtimeRows?: RawOvertimeRow[];
} {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return {};

  // Check delimiter (tab or comma or semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  const rows = lines.map((line) => line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, '')));
  if (rows.length < 2) return {};

  const headers = rows[0];
  const dataRows = rows.slice(1);

  if (type === 'attendance') {
    const cols = detectAttendanceColumns(headers);
    const fallbackDate = new Date().toISOString().split('T')[0];
    const attList: RawAttendanceRow[] = [];

    dataRows.forEach((rowVals) => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        rowObj[h] = rowVals[i] || '';
      });

      const codeVal = cols.codeCol ? rowObj[cols.codeCol] : rowVals[0];
      const code = String(codeVal || '').trim();
      if (!code) return;

      const name = cols.nameCol ? rowObj[cols.nameCol] : undefined;
      const dept = cols.deptCol ? rowObj[cols.deptCol] : undefined;
      const date = normalizeDate(cols.dateCol ? rowObj[cols.dateCol] : undefined, fallbackDate);
      const statusRaw = cols.statusCol ? rowObj[cols.statusCol] : 'present';

      attList.push({
        code,
        name,
        department: dept,
        date,
        status: normalizeAttendanceStatus(statusRaw),
        notes: cols.notesCol ? rowObj[cols.notesCol] : undefined
      });
    });

    return { attendanceRows: attList };
  } else {
    const cols = detectOvertimeColumns(headers);
    const fallbackDate = new Date().toISOString().split('T')[0];
    const otList: RawOvertimeRow[] = [];

    dataRows.forEach((rowVals) => {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        rowObj[h] = rowVals[i] || '';
      });

      const codeVal = cols.codeCol ? rowObj[cols.codeCol] : rowVals[0];
      const code = String(codeVal || '').trim();
      if (!code) return;

      const name = cols.nameCol ? rowObj[cols.nameCol] : undefined;
      const dept = cols.deptCol ? rowObj[cols.deptCol] : undefined;
      const date = normalizeDate(cols.dateCol ? rowObj[cols.dateCol] : undefined, fallbackDate);
      let hours = 0;
      if (cols.hoursCol && rowObj[cols.hoursCol]) {
        const parsedH = parseFloat(rowObj[cols.hoursCol].replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedH)) hours = parsedH;
      }

      otList.push({
        code,
        name,
        department: dept,
        date,
        hours,
        sourceFile: 'Direct Paste Data'
      });
    });

    return { overtimeRows: otList };
  }
}
