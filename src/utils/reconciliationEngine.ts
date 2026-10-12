import * as XLSX from 'xlsx';
import { BiometricMonthlyDataset, BiometricPunchRecord } from '../types/biometric';
import { 
  PaperOvertimeEntry, 
  ReconciliationItem, 
  ReconciliationSummary, 
  DiscrepancyStatus,
  ReconciliationOptions 
} from '../types/reconciliation';

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

function normalizeDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
  return str.replace(/[\u0660-\u0669]/g, (d) => String(arabicDigits.indexOf(d)));
}

function parseFlexDate(rawVal: any): string {
  if (!rawVal) return '';
  
  if (typeof rawVal === 'number') {
    // Excel numeric date serial
    try {
      const dateObj = XLSX.SSF.parse_date_code(rawVal);
      if (dateObj) {
        const y = String(dateObj.y).padStart(4, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // ignore
    }
  }

  const s = normalizeDigits(String(rawVal)).trim();
  
  // Try ISO YYYY-MM-DD
  const isoMatch = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Try DD/MM/YYYY
  const dmyMatch = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return s;
}

export function normalizeWorkerCode(rawCode: any): string {
  if (rawCode === null || rawCode === undefined) return '';
  const clean = normalizeDigits(String(rawCode)).trim().replace(/[^0-9a-zA-Z]/g, '');
  if (/^\d+$/.test(clean)) {
    const stripped = clean.replace(/^0+/, '');
    return stripped || '0';
  }
  return clean;
}

export function parseHoursValue(rawVal: any): number {
  if (rawVal === null || rawVal === undefined || rawVal === '') return 0;
  
  if (typeof rawVal === 'number') {
    // If it's an Excel time fraction between 0.001 and 0.999 (e.g. 2 / 24 = 0.083333)
    if (rawVal > 0 && rawVal < 1) {
      const hrs = rawVal * 24;
      return Number(hrs.toFixed(2));
    }
    return Number(rawVal.toFixed(2));
  }

  const s = normalizeDigits(String(rawVal)).trim().toLowerCase();
  if (!s) return 0;

  // Text words in Arabic
  if (s.includes('\u0633\u0627\u0639\u062a\u064a\u0646') || s.includes('\u0633\u0627\u0639\u062a\u0627\u0646')) return 2.0;
  if (s.includes('\u0633\u0627\u0639\u0647 \u0648\u0646\u0635\u0641') || s.includes('\u0633\u0627\u0639\u0629 \u0648\u0646\u0635\u0641') || s.includes('\u0633\u0627\u0639\u0647 \u0648\u0646\u0635') || s.includes('\u0633\u0627\u0639\u0629 \u0648\u0646\u0635')) return 1.5;
  if (s.includes('\u0633\u0627\u0639\u0647') || s.includes('\u0633\u0627\u0639\u0629')) {
    if (!s.includes('\u0627\u0631\u0628\u0639') && !s.includes('\u0623\u0631\u0628\u0639') && !s.includes('\u062b\u0644\u0627\u062b') && !s.includes('\u062e\u0645\u0633') && !s.includes('\u062b\u0645\u0627\u0646')) {
      return 1.0;
    }
  }
  if (s.includes('\u0627\u0631\u0628\u0639 \u0633\u0627\u0639\u0627\u062a \u0648\u0646\u0635\u0641') || s.includes('\u0623\u0631\u0628\u0639 \u0633\u0627\u0639\u0627\u062a \u0648\u0646\u0635\u0641') || s.includes('\u0627\u0631\u0628\u0639 \u0633\u0627\u0639\u0627\u062a \u0648\u0646\u0635') || s.includes('4 \u0648\u0646\u0635') || s.includes('4.5')) return 4.5;
  if (s.includes('\u0627\u0631\u0628\u0639 \u0633\u0627\u0639\u0627\u062a') || s.includes('\u0623\u0631\u0628\u0639 \u0633\u0627\u0639\u0627\u062a')) return 4.0;
  if (s.includes('\u062b\u0644\u0627\u062b \u0633\u0627\u0639\u0627\u062a') || s.includes('3 \u0633\u0627\u0639\u0627\u062a')) return 3.0;

  // Time format HH:mm or HH:mm:ss (e.g., "02:00", "04:30", "2:00", "4:30", "1:30")
  const timeMatch = s.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    return Number((h + m / 60).toFixed(2));
  }

  // Decimal number formatted as string (e.g. "2", "2.0", "4.5", "2.5")
  const numMatch = s.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]) || 0;
  }

  return 0;
}

export function isNormal330Departure(outTimeStr: string): boolean {
  if (!outTimeStr || !outTimeStr.trim()) return false;
  const ev = evaluateBroken5pm(outTimeStr);
  return !ev.exceeded5pm && ev.outMinutes !== null && ev.outMinutes >= 12 * 60;
}

export function parsePaperOvertimeWorkbook(buffer: ArrayBuffer, fileName: string): PaperOvertimeEntry[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const entries: PaperOvertimeEntry[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    // Get 2D array matrix to search for headers flexibly across rows
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) continue;

    // Try to find sheet-level date
    let sheetGlobalDate = '';
    const sheetNameDate = parseFlexDate(sheetName);
    if (sheetNameDate && /^\d{4}-\d{2}-\d{2}$/.test(sheetNameDate)) {
      sheetGlobalDate = sheetNameDate;
    }

    for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
      const rowText = (rawMatrix[r] || []).join(' ');
      const rowDate = parseFlexDate(rowText);
      if (rowDate && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) {
        sheetGlobalDate = rowDate;
        break;
      }
    }

    let headerRowIdx = -1;
    let codeColIdx = -1;
    let nameColIdx = -1;
    let deptColIdx = -1;
    let lineColIdx = -1;
    let dateColIdx = -1;
    let hoursColIdx = -1;
    let superColIdx = -1;
    let notesColIdx = -1;

    const codeKeys = ['\u0643\u0648\u062f', '\u0631\u0642\u0645', 'card', 'code', 'id', 'empid', 'badge', 'workerid', '\u0643\u0648\u062f\u0627\u0644\u0639\u0627\u0645\u0644', '\u0643\u0648\u062f\u0627\u0644\u0645\u0648\u0638\u0641', '\u0631\u0642\u0645\u0627\u0644\u0639\u0627\u0645\u0644', '\u0627\u0644\u0631\u0642\u0645'];
    const nameKeys = ['\u0627\u0633\u0645', 'name', 'worker', 'employee', '\u0627\u0633\u0645\u0627\u0644\u0639\u0627\u0645\u0644', '\u0627\u0633\u0645\u0627\u0644\u0645\u0648\u0638\u0641'];
    const deptKeys = ['\u0642\u0633\u0645', '\u0627\u062f\u0627\u0631\u0647', 'dept', 'department', '\u0627\u0644\u0642\u0633\u0645'];
    const lineKeys = ['\u062e\u0637', 'line', '\u0639\u0646\u0628\u0631', 'section', '\u0627\u0644\u062e\u0637'];
    const dateKeys = ['\u062a\u0627\u0631\u064a\u062e', '\u064a\u0648\u0645', 'date', 'day', '\u0627\u0644\u062a\u0627\u0631\u064a\u062e'];
    const hoursKeys = [
      '\u0633\u0627\u0639\u0627\u062a', '\u0633\u0627\u0639\u0647', '\u0633\u0627\u0639\u0629', '\u0627\u0636\u0627\u0641\u064a', '\u0627\u0636\u0627\u0641\u0649', '\u0625\u0636\u0627\u0641\u064a', '\u0625\u0636\u0627\u0641\u0649', 
      '\u0627\u0648\u0641\u0631', '\u0623\u0648\u0641\u0631', 'hours', 'hour', 'ot', 'overtime', '\u0639\u062f\u062f\u0627\u0644\u0633\u0627\u0639\u0627\u062a', 
      '\u0633\u0627\u0639\u0627\u062a\u0627\u0644\u0627\u0636\u0627\u0641\u064a', '\u0633\u0627\u0639\u0627\u062a\u0627\u0644\u0627\u0648\u0641\u0631', '\u0627\u0644\u0627\u0648\u0641\u0631\u062a\u0627\u064a\u0645', '\u0627\u0644\u0627\u0636\u0627\u0641\u064a', '\u0627\u0644\u0648\u0642\u062a', '\u0648\u0642\u062a'
    ];
    const superKeys = ['\u0645\u0634\u0631\u0641', '\u0645\u0633\u0624\u0648\u0644', 'supervisor', 'leader', '\u0627\u0644\u0645\u0634\u0631\u0641'];
    const notesKeys = ['\u0645\u0644\u0627\u062d\u0638\u0627\u062a', '\u0628\u064a\u0627\u0646', '\u0633\u0628\u0628', 'note', 'remark', '\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a'];

    // Scan up to row 15 to find the real header row
    for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
      const row = rawMatrix[r] || [];
      const hasCode = row.some((c: any) => {
        const norm = normalizeHeader(String(c || ''));
        return codeKeys.some((k) => norm.includes(k));
      });
      const hasHours = row.some((c: any) => {
        const norm = normalizeHeader(String(c || ''));
        return hoursKeys.some((k) => norm.includes(k));
      });

      if (hasCode || (hasHours && row.length >= 2)) {
        headerRowIdx = r;
        row.forEach((cellVal: any, colIdx: number) => {
          const norm = normalizeHeader(String(cellVal || ''));
          if (codeColIdx === -1 && codeKeys.some((k) => norm.includes(k))) codeColIdx = colIdx;
          else if (hoursColIdx === -1 && hoursKeys.some((k) => norm.includes(k))) hoursColIdx = colIdx;
          else if (nameColIdx === -1 && nameKeys.some((k) => norm.includes(k))) nameColIdx = colIdx;
          else if (deptColIdx === -1 && deptKeys.some((k) => norm.includes(k))) deptColIdx = colIdx;
          else if (lineColIdx === -1 && lineKeys.some((k) => norm.includes(k))) lineColIdx = colIdx;
          else if (dateColIdx === -1 && dateKeys.some((k) => norm.includes(k))) dateColIdx = colIdx;
          else if (superColIdx === -1 && superKeys.some((k) => norm.includes(k))) superColIdx = colIdx;
          else if (notesColIdx === -1 && notesKeys.some((k) => norm.includes(k))) notesColIdx = colIdx;
        });
        break;
      }
    }

    // Fallback: If no explicit headers were detected, infer column positions from first data rows
    if (codeColIdx === -1 || hoursColIdx === -1) {
      headerRowIdx = 0;
      for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
        const row = rawMatrix[r] || [];
        row.forEach((val: any, cIdx: number) => {
          const s = String(val || '').trim();
          if (codeColIdx === -1 && /^\d{3,6}$/.test(normalizeDigits(s))) {
            codeColIdx = cIdx;
          }
          if (hoursColIdx === -1 && cIdx !== codeColIdx && (typeof val === 'number' || /^\d+(\.\d+)?$/.test(s) || /^\d{1,2}:\d{2}$/.test(s))) {
            const hVal = parseHoursValue(val);
            if (hVal > 0 && hVal <= 12) {
              hoursColIdx = cIdx;
            }
          }
        });
      }
    }

    // Parse data rows starting after header
    const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
    for (let r = startRow; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!row || row.length === 0) continue;

      const rawCode = codeColIdx >= 0 ? row[codeColIdx] : row[0];
      const normCode = normalizeWorkerCode(rawCode);
      if (!normCode) continue;

      const rawDate = dateColIdx >= 0 ? row[dateColIdx] : '';
      const dateStr = parseFlexDate(rawDate) || sheetGlobalDate || '';

      const rawHours = hoursColIdx >= 0 ? row[hoursColIdx] : (row[1] || row[2]);
      const hoursNum = parseHoursValue(rawHours);

      const name = String(nameColIdx >= 0 ? row[nameColIdx] : '').trim() || `Worker ${normCode}`;
      const department = String(deptColIdx >= 0 ? row[deptColIdx] : '').trim() || 'General';
      const line = String(lineColIdx >= 0 ? row[lineColIdx] : '').trim();
      const supervisor = String(superColIdx >= 0 ? row[superColIdx] : '').trim();
      const notes = String(notesColIdx >= 0 ? row[notesColIdx] : '').trim();

      entries.push({
        id: `${normCode}_${dateStr || r}_${fileName}`,
        code: normCode,
        name,
        department,
        line,
        date: dateStr,
        hours: hoursNum,
        supervisor,
        notes,
        sourceSheetName: sheetName
      });
    }
  }

  return entries;
}

export function parsePaperOvertimeText(rawText: string): PaperOvertimeEntry[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const entries: PaperOvertimeEntry[] = [];
  
  lines.forEach((line, idx) => {
    // Delimiters: Tab, Comma, Semicolon, or multiple spaces
    const parts = line.split(/[\t,;]+/).map((p) => p.trim());
    if (parts.length < 2) return;

    // Check if header row
    if (idx === 0 && (parts[0].includes('\u0643\u0648\u062f') || parts[0].toLowerCase().includes('code'))) {
      return;
    }

    const code = normalizeWorkerCode(parts[0]);
    if (!code) return;

    let date = '';
    let hours = 0;
    let name = '';
    let dept = 'General';
    let supervisor = '';
    let notes = '';

    // If second column is date
    if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(parts[1])) {
      date = parseFlexDate(parts[1]);
      hours = parseHoursValue(parts[2]);
      name = parts[3] || `Worker ${code}`;
      dept = parts[4] || 'General';
      supervisor = parts[5] || '';
      notes = parts.slice(6).join(' ');
    } else {
      name = parts[1] || `Worker ${code}`;
      if (parts[2]) {
        if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(parts[2])) {
          date = parseFlexDate(parts[2]);
          hours = parseHoursValue(parts[3]);
          dept = parts[4] || 'General';
          notes = parts.slice(5).join(' ');
        } else {
          hours = parseHoursValue(parts[2]);
          date = parseFlexDate(parts[3] || '');
          dept = parts[4] || 'General';
          notes = parts.slice(5).join(' ');
        }
      }
    }

    entries.push({
      id: `${code}_${date || idx}_pasted`,
      code,
      name,
      department: dept,
      date,
      hours,
      supervisor,
      notes
    });
  });

  return entries;
}

export function isAdministrativeDepartment(deptName: string): boolean {
  if (!deptName) return false;
  const norm = normalizeHeader(deptName);
  const adminKeys = [
    '\u0627\u062f\u0627\u0631\u0647', '\u0627\u062f\u0627\u0631\u064a', '\u062d\u0633\u0627\u0628\u0627\u062a', '\u0645\u0627\u0644\u064a\u0647', '\u0634\u0624\u0648\u0646', '\u0645\u0648\u0627\u0631\u062f\u0628\u0634\u0631\u064a\u0647', '\u0627\u062a\u0634\u0627\u0631', 
    'it', 'admin', 'hr', 'finance', 'accounting', 'office', '\u0645\u0643\u062a\u0628', 
    '\u0645\u0634\u062a\u0631\u064a\u0627\u062a', '\u0633\u0643\u0631\u062a\u0627\u0631\u064a\u0647', '\u0645\u062e\u0627\u0632\u0646\u0627\u062f\u0627\u0631\u0647', '\u0633\u0643\u0631\u062a\u064a\u0631', '\u062e\u062f\u0645\u0627\u062a\u0627\u062f\u0627\u0631\u064a\u0647'
  ];
  return adminKeys.some((k) => norm.includes(k));
}

export function parseOutTimeToMinutes(outTimeStr: any): number | null {
  if (outTimeStr === null || outTimeStr === undefined || outTimeStr === '') return null;
  const s = normalizeDigits(String(outTimeStr)).trim();
  if (!s || s === '-' || s === '0') return null;

  // 1. Single number or decimal format (e.g. "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "17", "17.5", "18", "19.5", "20")
  const numMatch = s.match(/^(\d{1,2})(?:[.](\d{1,2}))?$/);
  if (numMatch) {
    let h = parseInt(numMatch[1], 10);
    const frac = numMatch[2];
    let m = 0;
    if (frac) {
      if (frac === '5' || frac === '50' || frac === '30' || frac === '3') m = 30;
      else if (frac === '25' || frac === '15') m = 15;
      else if (frac === '75' || frac === '45') m = 45;
      else {
        const parsedM = parseInt(frac, 10);
        if (parsedM < 60) m = frac.length === 1 ? parsedM * 10 : parsedM;
      }
    }
    // Shift 1 afternoon/evening exit context (1 to 11 are PM hours: 3.5 -> 15:30, 4.5 -> 16:30, 5.5 -> 17:30, 7.5 -> 19:30, 8 -> 20:00)
    if (h >= 1 && h <= 11) {
      h += 12;
    }
    return h * 60 + m;
  }

  // 2. Standard time format: HH:MM[:SS] [AM/PM/[ref]/[ref]]
  const timeMatch = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|\u0635|\u0645)?$/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const meridian = (timeMatch[4] || '').toLowerCase();

    if (meridian === 'pm' || meridian === '\u0645') {
      if (h < 12) h += 12;
    } else if (meridian === 'am' || meridian === '\u0635') {
      if (h === 12) h = 0;
      // Note: AM times stay morning AM (e.g. 07:30 AM is 7*60+30 = 450 mins, never PM)
    } else {
      // 24-hour or afternoon factory departure context:
      // If 1 <= h <= 11: afternoon/evening PM (e.g. 03:30 -> 15:30, 05:30 -> 17:30, 07:30 -> 19:30)
      if (h >= 1 && h <= 11) {
        h += 12;
      }
    }
    return h * 60 + m;
  }

  return null;
}

export function isShift3Out1105(outTimeStr?: string | number | null, inTimeStr?: string | number | null): boolean {
  if (outTimeStr === null || outTimeStr === undefined) return false;
  const s = String(outTimeStr).trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return false;
  // Match 11.05, 11.5, 11.50, 11:05, 11:30, 11:02, 23:xx, 11:xx PM, midnight 00:xx
  if (/^(11[:.]0?5(:00)?(pm|am)?|11[:.]50?(:00)?(pm|am)?|11[:.]30?(:00)?(pm|am)?|11[:.]0?2(:00)?(pm|am)?|23[:.]\d{2}(:\d{2})?|00[:.]\d{2}(:\d{2})?)/i.test(s)) return true;
  if (s.includes('11:05') || s.includes('11.05') || s.includes('11.5') || s.includes('11:30') || s.includes('23:') || s.includes('00:')) return true;
  if (/11[:.]\d{2}(:\d{2})?pm/i.test(s)) return true;

  const outMins = parseOutTimeToMinutes(String(outTimeStr));
  // Any departure at or after 21:30 (9:30 PM onwards, 22:xx, 23:xx) belongs to night / Shift 3, not Shift 1 OT
  if (outMins !== null && (outMins >= 21 * 60 + 30 || outMins < 5 * 60)) {
    return true;
  }

  return false;
}

export function evaluateBroken5pm(outTimeStr: string): {
  exceeded5pm: boolean;
  outMinutes: number | null;
  is8pmTier: boolean;
  creditedOtHours: number;
  ruleTitle: string;
} {
  if (!outTimeStr || !outTimeStr.trim()) {
    return {
      exceeded5pm: false,
      outMinutes: null,
      is8pmTier: false,
      creditedOtHours: 0,
      ruleTitle: 'No checkout punch'
    };
  }

  // Check if this is Shift 3 Night Shift (ended at 11.5, 11.05, 23:xx, etc.) -> 0 OT for Shift 1
  if (isShift3Out1105(outTimeStr)) {
    return {
      exceeded5pm: false,
      outMinutes: null,
      is8pmTier: false,
      creditedOtHours: 0,
      ruleTitle: 'Shift 3 Night Shift (11:05 PM - 07:30 AM) - Excluded from Overtime'
    };
  }

  const outMinutes = parseOutTimeToMinutes(outTimeStr);

  if (outMinutes === null) {
    return {
      exceeded5pm: false,
      outMinutes: null,
      is8pmTier: false,
      creditedOtHours: 0,
      ruleTitle: 'Invalid punch time'
    };
  }

  // Shift 3 night checkout boundary: 21:30 (9:30 PM) onwards -> 0 OT
  if (outMinutes >= 21 * 60 + 30 || outMinutes < 5 * 60) {
    return {
      exceeded5pm: false,
      outMinutes,
      is8pmTier: false,
      creditedOtHours: 0,
      ruleTitle: 'Shift 3 Night Shift (Excluded from Shift 1 Overtime)'
    };
  }

  // Tier 2: Passed 7.5 (8:00 PM Shift: from 19:25 up to 21:29) -> 4.5 hours approved OT
  if (outMinutes >= 19 * 60 + 25) {
    return {
      exceeded5pm: true,
      outMinutes,
      is8pmTier: true,
      creditedOtHours: 4.5,
      ruleTitle: 'Passed 7.5 (8:00 PM Shift) -> 4.5 hours approved OT'
    };
  }

  // Tier 1: Broke 5:00 PM (from 16:55 = 1015 mins up to before 19:25 = 1165 mins)
  if (outMinutes >= 16 * 60 + 55) {
    return {
      exceeded5pm: true,
      outMinutes,
      is8pmTier: false,
      creditedOtHours: 2.0,
      ruleTitle: 'Broke 5:00 PM -> 2.0 hours approved OT'
    };
  }

  // Normal exit before 5:00 PM (e.g. 3:30 PM / 15:30 / 3.5):
  return {
    exceeded5pm: false,
    outMinutes,
    is8pmTier: false,
    creditedOtHours: 0,
    ruleTitle: 'Departed before 5:00 PM (0 approved OT)'
  };
}

export function detectShift1Morning(inTimeStr: string, existingShift?: string): {
  isShift1: boolean;
  shiftName: string;
} {
  if (existingShift && existingShift.includes('Shift 1')) {
    return { isShift1: true, shiftName: 'Shift 1 Morning (07:30 - 15:30)' };
  }
  if (existingShift && existingShift.includes('Shift 2')) {
    return { isShift1: false, shiftName: 'Shift 2 Afternoon (15:30 - 23:30)' };
  }
  if (existingShift && existingShift.includes('Shift 3')) {
    return { isShift1: false, shiftName: 'Shift 3 Night' };
  }

  if (!inTimeStr || !inTimeStr.trim()) {
    return { isShift1: false, shiftName: 'No Check-in' };
  }

  const clean = normalizeDigits(inTimeStr.trim());
  const match = clean.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|\u0635|\u0645)?/i);
  if (!match) {
    return { isShift1: false, shiftName: 'Unspecified Time' };
  }

  let h = parseInt(match[1], 10);
  const meridian = (match[4] || '').toLowerCase();

  if (meridian === 'pm' || meridian === '\u0645') {
    if (h < 12) h += 12;
  } else if (meridian === 'am' || meridian === '\u0635') {
    if (h === 12) h = 0;
  }

  // Morning arrival for Shift 1: between 05:00 AM and 11:30 AM (07:30 - 15:30)
  if (h >= 5 && h <= 11) {
    return { isShift1: true, shiftName: 'Shift 1 Morning (07:30 - 15:30)' };
  } else if (h >= 13 && h <= 18) {
    return { isShift1: false, shiftName: 'Shift 2 Afternoon (15:30 - 23:30)' };
  } else {
    return { isShift1: false, shiftName: 'Shift 3 Night' };
  }
}

export function reconcileBiometricWithPaper(
  biometricDataset: BiometricMonthlyDataset,
  paperEntries: PaperOvertimeEntry[],
  options?: ReconciliationOptions | number
): {
  items: ReconciliationItem[];
  summary: ReconciliationSummary;
} {
  const opts: ReconciliationOptions = typeof options === 'number' 
    ? { hourlyRateEgp: options } 
    : (options || {});

  const hourlyRateEgp = opts.hourlyRateEgp || 25;
  const excludedDeptsSet = new Set<string>((opts.excludedDepartments || []).map((d: string) => d.trim().toLowerCase()));
  const isShift1OnlyFilter = Boolean(opts.shift1Only);

  // Map paper entries by normalized `code_date` and by `normCode` fallback
  const paperMap = new Map<string, PaperOvertimeEntry[]>();
  const paperCodeOnlyMap = new Map<string, PaperOvertimeEntry[]>();

  for (const entry of paperEntries) {
    const normCode = normalizeWorkerCode(entry.code);
    const key = `${normCode}_${entry.date}`;
    if (!paperMap.has(key)) paperMap.set(key, []);
    paperMap.get(key)!.push(entry);

    if (!paperCodeOnlyMap.has(normCode)) paperCodeOnlyMap.set(normCode, []);
    paperCodeOnlyMap.get(normCode)!.push(entry);
  }

  // Set of all evaluated keys
  const processedKeys = new Set<string>();
  let rawItems: ReconciliationItem[] = [];

  // 1. Process all biometric punches
  for (const punch of biometricDataset.allPunches) {
    const normCode = normalizeWorkerCode(punch.code);
    const key = `${normCode}_${punch.date}`;
    processedKeys.add(key);

    let paperMatches = paperMap.get(key) || [];
    // If no exact date match, check if paper had records for this code without a date
    if (paperMatches.length === 0 && paperCodeOnlyMap.has(normCode)) {
      const codeMatches = paperCodeOnlyMap.get(normCode)!;
      const noDateMatches = codeMatches.filter((p) => !p.date || p.date === punch.date);
      if (noDateMatches.length > 0) {
        paperMatches = noDateMatches;
      }
    }

    const paperHoursSum = paperMatches.reduce((acc, p) => acc + p.hours, 0);
    const hasPaperRecord = paperMatches.length > 0;
    const paperSupervisor = paperMatches.map((p) => p.supervisor).filter(Boolean).join(', ') || undefined;
    const paperNotes = paperMatches.map((p) => p.notes).filter(Boolean).join(', ') || undefined;

    const punchDept = (punch.department || 'General').trim();
    const isExcludedDept = excludedDeptsSet.has(punchDept.toLowerCase());
    const isDeptAdmin = isAdministrativeDepartment(punchDept);
    const departmentType: 'production' | 'admin' | 'services' = isDeptAdmin ? 'admin' : 'production';

    // Shift 1 Morning Check-in Detection
    const shiftInfo = detectShift1Morning(punch.inTime, punch.shift);
    const isShift3NightWorker = isShift3Out1105(punch.outTime, punch.inTime);
    const isShift1 = isShift3NightWorker ? false : shiftInfo.isShift1;
    const shiftName = isShift3NightWorker ? 'Shift 3 Night (11:05 PM - 07:30 AM)' : shiftInfo.shiftName;

    // Check 5:00 PM breaking rule and 3:30 normal departure on checkout
    const broken5 = evaluateBroken5pm(punch.outTime);
    const isFridayOrHoliday = punch.isFriday || Boolean(punch.isOfficialHoliday);

    // Has continued for overtime? (Stayed past shift, broke 5 PM, or has OT claimed)
    const continuedOvertime = !isShift3NightWorker && (broken5.exceeded5pm || (punch.otHours > 0) || (paperHoursSum > 0) || (isFridayOrHoliday && !!punch.inTime));
    const isShift1ContinuedOt = isShift1 && continuedOvertime;

    let bioOt = isShift3NightWorker ? 0 : (punch.otHours || 0);
    let approvedOtHours = 0;
    let isLeftAt330Unearned = false;
    let calculatedOtRule = isShift3NightWorker ? 'Shift 3 Night Shift (11:05 PM - 07:30 AM) - Excluded from Overtime' : broken5.ruleTitle;

    let status: DiscrepancyStatus = 'NO_OVERTIME';
    let statusTitleAr = 'Normal Day (No Overtime)';
    let statusTitleEn = 'Normal Day (No Overtime)';
    let severity: 'danger' | 'warning' | 'success' | 'neutral' = 'neutral';
    let explanationAr = 'No overtime was recorded on biometric or claimed in paper sheet.';
    let suggestedActionAr = 'No action required.';

    // CASE A: EXCLUDED ADMINISTRATIVE DEPARTMENT
    if (isExcludedDept) {
      calculatedOtRule = 'Excluded (Administrative department exempt from overtime)';
      bioOt = 0; // Admins do not receive factory overtime
      approvedOtHours = 0;

      if (hasPaperRecord && paperHoursSum > 0) {
        status = 'EXCLUDED_ADMIN';
        statusTitleAr = '⚠️ Administrative Staff Claimed on Paper';
        statusTitleEn = 'Admin Staff Claimed on Paper';
        severity = 'warning';
        explanationAr = `Supervisor claimed (${paperHoursSum}h overtime) in paper sheet despite department (${punchDept}) being exempt from factory overtime!`;
        suggestedActionAr = 'Cancel hours from overtime sheet or obtain extraordinary written approval from General Manager.';
      } else {
        status = 'EXCLUDED_ADMIN';
        statusTitleAr = '🏢 Admin Department - Non-OT';
        statusTitleEn = 'Admin Department (Non-OT)';
        severity = 'neutral';
        explanationAr = `Employee belongs to administrative department (${punchDept}) and is excluded from factory overtime sheets per management policy.`;
        suggestedActionAr = 'Automatically excluded (omitted from overtime payouts or variances).';
      }
    } 
    // CASE B: ELIGIBLE PRODUCTION / SERVICE DEPARTMENTS
    else {
      if (isFridayOrHoliday) {
        // Friday or Official Holiday
        bioOt = punch.otHours || (punch.inTime ? 8 : 0);
        approvedOtHours = bioOt;
        calculatedOtRule = punch.isFriday ? 'Friday Weekend (2.0x Double Time)' : 'Official Holiday (2.0x Double Time)';

        if (bioOt > 0 && !hasPaperRecord) {
          status = 'PUNCHED_NOT_IN_PAPER';
          statusTitleAr = '🔴 Punched Friday/Holiday but Missing in Paper';
          statusTitleEn = 'Punched Friday/Holiday but Missing in Paper';
          severity = 'danger';
          explanationAr = `Worker attended and punched on Friday/Holiday (${punch.inTime} to ${punch.outTime}) earning (${bioOt}h), but supervisor omitted them from paper sheet!`;
          suggestedActionAr = 'Verify Friday work permit approved by Production Manager and credit entitled hours.';
        } else if (hasPaperRecord && paperHoursSum > 0 && bioOt === 0) {
          status = 'IN_PAPER_NO_PUNCH';
          statusTitleAr = '🟠 In Paper but No Friday Punch';
          statusTitleEn = 'In Paper but No Friday Punch';
          severity = 'warning';
          approvedOtHours = 0;
          explanationAr = `Supervisor claimed (${paperHoursSum}h) on Friday/Holiday but there is no attendance punch on biometric machine!`;
          suggestedActionAr = 'Immediately cancel Friday hours pending ghost entry inquiry.';
        } else if (hasPaperRecord && Math.abs(paperHoursSum - bioOt) <= 0.1) {
          status = 'FULLY_MATCHED';
          statusTitleAr = '🟢 Fully Matched Friday/Holiday';
          statusTitleEn = 'Fully Matched Friday/Holiday';
          severity = 'success';
          explanationAr = `Paper sheet hours (${paperHoursSum}h) match biometric punch for Friday/Holiday (${bioOt}h).`;
          suggestedActionAr = 'Approved for payroll disbursement.';
        } else if (hasPaperRecord && bioOt > 0) {
          status = 'HOURS_MISMATCH';
          statusTitleAr = '🟡 Hours Mismatch on Friday/Holiday';
          statusTitleEn = 'Hours Mismatch on Friday/Holiday';
          severity = 'warning';
          explanationAr = `Paper sheet hours (${paperHoursSum}h) differ from biometric punch (${bioOt}h).`;
          suggestedActionAr = 'Adopt documented biometric machine hours.';
        }
      } else {
        // Normal Working Day: Apply Governing Biometric Authority Rules:
        if (!broken5.exceeded5pm) {
          // Employee did NOT break 5:00 PM (departed at 3:30 PM / 15:30 or before 17:00)
          bioOt = 0; // ZERO overtime earned
          approvedOtHours = 0; // Biometric governs: 0 overtime!

          if (isShift3NightWorker) {
            // Shift 3 Night Shift worker: strictly 0 overtime and NO_OVERTIME
            isLeftAt330Unearned = false;
            status = 'NO_OVERTIME';
            statusTitleAr = 'Shift 3 Night Shift (No Overtime)';
            statusTitleEn = 'Shift 3 Night Shift (No Overtime)';
            severity = 'neutral';
            calculatedOtRule = 'Shift 3 Night Shift (11:05 PM - 07:30 AM) - Excluded from Overtime';
            explanationAr = `Worker is on Shift 3 Night Shift (punch ${punch.outTime}). Scheduled night shift, excluded from overtime calculation.`;
            suggestedActionAr = 'Standard verified Shift 3 regular schedule.';
          } else if (hasPaperRecord && paperHoursSum > 0) {
            // Supervisor claimed OT for someone who left at 3:30 or before 5 PM!
            isLeftAt330Unearned = true;
            status = 'IN_PAPER_NO_PUNCH';
            statusTitleAr = '🚫 Left at 3:30 PM (Normal Schedule) - Zero Overtime Entitled';
            statusTitleEn = 'Claimed Paper OT but Departed at 3:30 PM';
            severity = 'danger';
            calculatedOtRule = 'Departed 3:30 PM (Normal shift) - Biometric governs (0 OT)';
            explanationAr = `Worker punched departure at (${punch.outTime}) at standard shift end (3:30 PM) and did not stay for overtime or break 5:00 PM. Under strict biometric authority rule, zero overtime is earned (0h) and supervisor claim (${paperHoursSum}h) is voided!`;
            suggestedActionAr = `Enforce biometric punch (0 OT) and immediately strike out paper claim (${paperHoursSum}h).`;
          } else {
            // Normal departure at 3:30 PM and not in paper -> NORMAL DAY
            isLeftAt330Unearned = false;
            status = 'NO_OVERTIME';
            statusTitleAr = '⚪ Departed 3:30 PM (Normal Day No Overtime)';
            statusTitleEn = 'Normal Day - Left at 3:30 PM';
            severity = 'neutral';
            calculatedOtRule = 'Departed before 5:00 PM (0 OT)';
            explanationAr = `Worker departed at (${punch.outTime}) at scheduled shift end (normal 8-hour workday), properly omitted from overtime sheets.`;
            suggestedActionAr = 'Standard verified schedule without overtime.';
          }
        } else {
          // Employee BROKE 5:00 PM or 7:30 PM!
          bioOt = broken5.creditedOtHours;
          approvedOtHours = bioOt; // Biometric punch is the governing authority!
          calculatedOtRule = broken5.ruleTitle;

          if (!hasPaperRecord || paperHoursSum === 0) {
            // User Rule: In "Shift 1 Broke 5 PM (No Paper)" ONLY, remove anyone whose OUT is 11.05
            // (Shift 3 Night Shift: stayed from 11.05 PM to 7.30 AM, so exclude from this category!)
            if (isShift3Out1105(punch.outTime)) {
              status = 'NO_OVERTIME';
              statusTitleAr = 'Shift 3 Night Shift (11:05 PM - 07:30 AM)';
              statusTitleEn = 'Shift 3 Night Shift (11:05 PM - 07:30 AM)';
              severity = 'neutral';
              calculatedOtRule = 'Shift 3 Night Shift (Excluded from Shift 1 Overtime)';
              bioOt = 0;
              approvedOtHours = 0;
              explanationAr = `Worker is on Shift 3 Night Shift (checkout punch ${punch.outTime}). Regular shift scheduled from 11:05 PM to 07:30 AM, excluded from Shift 1 broken 5:00 PM overtime category.`;
              suggestedActionAr = 'No action required - regular Shift 3 night shift schedule.';
            } else {
              // PUNCHED & BROKE 5:00 PM, BUT MISSING IN PAPER!
              status = 'PUNCHED_NOT_IN_PAPER';
              statusTitleAr = broken5.is8pmTier 
                ? '🔴 Broke 7.5 (8:00 PM Shift) Missing in Paper (4.5h)' 
                : '🔴 Broke 5:00 PM Missing in Paper (2.0h)';
              statusTitleEn = 'Punched & Broke 5 PM but Missing in Paper Sheet';
              severity = 'danger';
              explanationAr = `Worker attended Shift 1 and broke 5:00 PM (checkout ${punch.outTime}) entitled to (${bioOt}h overtime), but supervisor omitted them from paper sheet!`;
              suggestedActionAr = `Approve worker entitlement (${bioOt}h) based on biometric machine punch and add to disbursement report.`;
            }
          } else if (Math.abs(paperHoursSum - bioOt) <= 0.1) {
            // FULLY MATCHED!
            status = 'FULLY_MATCHED';
            statusTitleAr = broken5.is8pmTier 
              ? '🟢 Fully Matched & Approved (4.5h - 8:00 PM Shift)' 
              : '🟢 Fully Matched & Approved (2.0h - Broke 5:00 PM)';
            statusTitleEn = 'Fully Matched Overtime';
            severity = 'success';
            explanationAr = `Paper sheet hours (${paperHoursSum}h) precisely match entitled biometric punch (${bioOt}h) for departure after 5:00 PM (${punch.outTime}).`;
            suggestedActionAr = 'Approved for payroll disbursement with executive sign-off.';
          } else {
            // HOURS MISMATCH!
            status = 'HOURS_MISMATCH';
            statusTitleAr = '🟡 Overtime Hours Discrepancy';
            statusTitleEn = 'Overtime Hours Discrepancy';
            severity = 'warning';
            const diff = Number((paperHoursSum - bioOt).toFixed(2));
            if (paperHoursSum > bioOt) {
              explanationAr = `Supervisor requested (${paperHoursSum}h) in paper, whereas biometric checkout (${punch.outTime}) entitles (${bioOt}h), leaving (+${diff}h excess in paper). Final biometric decision: ${bioOt}h only!`;
              suggestedActionAr = `Approve biometric hours (${bioOt}h) only and deduct excess (+${diff}h) from paper claims.`;
            } else {
              explanationAr = `Worker stayed until (${punch.outTime}) entitled to (${bioOt}h) on machine, while supervisor logged (${paperHoursSum}h only) in paper with variance (-${Math.abs(diff)}h).`;
              suggestedActionAr = `Confirm whether worker was tasked for (${paperHoursSum}h) only or is entitled to full biometric hours (${bioOt}h).`;
            }
          }
        }
      }
    }

    const diff = isExcludedDept ? 0 : Number((paperHoursSum - bioOt).toFixed(2));

    rawItems.push({
      id: `rec_${punch.code}_${punch.date}`,
      code: punch.code,
      name: punch.name,
      department: punchDept,
      line: punch.line || '',
      date: punch.date,
      formattedDate: punch.formattedDate,
      dayName: punch.dayName,
      isFriday: punch.isFriday,
      isHoliday: Boolean(punch.isOfficialHoliday),
      isShift1: isShift3Out1105(punch.outTime) && !hasPaperRecord ? false : isShift1,
      shiftName: isShift3Out1105(punch.outTime) && !hasPaperRecord ? 'Shift 3 Night (11:05 PM - 07:30 AM)' : shiftName,
      continuedOvertime: isShift3Out1105(punch.outTime) && !hasPaperRecord ? false : continuedOvertime,
      isShift1ContinuedOt: isShift3Out1105(punch.outTime) && !hasPaperRecord ? false : isShift1ContinuedOt,
      biometricIn: punch.inTime,
      biometricOut: punch.outTime,
      biometricWorkedHours: punch.totalWorkedHours,
      biometricOtHours: bioOt,
      approvedOtHours,
      rate135Hours: punch.rate135Hours,
      rate170Hours: punch.rate170Hours,
      rate200Hours: punch.rate200Hours,
      biometricStatus: punch.status,
      isSingleSwipe: Boolean(punch.isSingleSwipe),
      exceeded5pm: isShift3Out1105(punch.outTime) && !hasPaperRecord ? false : broken5.exceeded5pm,
      isLeftAt330Unearned,
      calculatedOtRule,
      isExcludedDept,
      departmentType,
      hasPaperRecord,
      paperOtHours: paperHoursSum,
      paperSupervisor,
      paperNotes,
      diffHours: diff,
      status,
      statusTitleAr,
      statusTitleEn,
      severity,
      explanationAr,
      suggestedActionAr
    });
  }

  // 2. Process paper entries that have NO match in biometric dataset (completely missing in device)
  for (const entry of paperEntries) {
    const normCode = normalizeWorkerCode(entry.code);
    const key = `${normCode}_${entry.date}`;
    if (!processedKeys.has(key)) {
      processedKeys.add(key);

      const paperHoursSum = entry.hours || 0;
      if (paperHoursSum > 0) {
        const entryDept = (entry.department || 'General').trim();
        const isExcludedDept = excludedDeptsSet.has(entryDept.toLowerCase());
        const isDeptAdmin = isAdministrativeDepartment(entryDept);
        const departmentType = isDeptAdmin ? 'admin' : 'production';

        rawItems.push({
          id: `rec_ghost_${entry.code}_${entry.date}`,
          code: entry.code,
          name: entry.name,
          department: entryDept,
          line: entry.line || '',
          date: entry.date,
          formattedDate: entry.date,
          dayName: '',
          isFriday: false,
          isHoliday: false,
          isShift1: true, // Claimed in paper
          shiftName: 'Shift 1 Morning (Paper Claim)',
          continuedOvertime: true,
          isShift1ContinuedOt: true,
          biometricIn: '',
          biometricOut: '',
          biometricWorkedHours: 0,
          biometricOtHours: 0,
          approvedOtHours: 0, // Unapproved because there is no biometric punch
          rate135Hours: 0,
          rate170Hours: 0,
          rate200Hours: 0,
          biometricStatus: 'NO_RECORD',
          isSingleSwipe: false,
          exceeded5pm: false,
          isLeftAt330Unearned: false,
          calculatedOtRule: 'Missing in biometric database',
          isExcludedDept,
          departmentType,
          hasPaperRecord: true,
          paperOtHours: paperHoursSum,
          paperSupervisor: entry.supervisor,
          paperNotes: entry.notes,
          diffHours: paperHoursSum,
          status: 'IN_PAPER_NO_PUNCH',
          statusTitleAr: '🟠 In Paper Sheet but No Biometric Record',
          statusTitleEn: 'In Paper Sheet but No Biometric Record',
          severity: 'danger',
          explanationAr: `Worker claimed for (${paperHoursSum}h) in paper sheet for Shift 1, but has zero attendance or punch in biometric machine for this date!`,
          suggestedActionAr: 'Immediately void overtime hours and query supervisor on actual worker presence.'
        });
      }
    }
  }

  // If user requested Shift 1 Only: filter down to Shift 1 workers who continued for overtime (or were claimed in paper)
  const items = isShift1OnlyFilter
    ? rawItems.filter((i) => i.isShift1ContinuedOt || (i.hasPaperRecord && i.paperOtHours > 0))
    : rawItems;

  // Sort items: High-priority discrepancies first, then by date and code
  const priorityWeight: Record<DiscrepancyStatus, number> = {
    PUNCHED_NOT_IN_PAPER: 1,
    IN_PAPER_NO_PUNCH: 2,
    HOURS_MISMATCH: 3,
    FULLY_MATCHED: 4,
    EXCLUDED_ADMIN: 5,
    NO_OVERTIME: 6
  };

  items.sort((a, b) => {
    const pA = priorityWeight[a.status];
    const pB = priorityWeight[b.status];
    if (pA !== pB) return pA - pB;
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    return a.code.localeCompare(b.code, 'en');
  });

  // Calculate Summary KPIs
  let totalBioHours = 0;
  let totalPaperHours = 0;
  let totalApprovedOtHours = 0;
  let punchedNotInPaper = 0;
  let inPaperNoPunch = 0;
  let hoursMismatch = 0;
  let fullyMatched = 0;
  let noOt = 0;
  let excludedAdmin = 0;
  let broken5pmCount = 0;
  let unearnedLeftAt330Count = 0;
  let shift1Workers = 0;
  let shift1ContinuedOt = 0;
  const uniqueEmps = new Set<string>();

  for (const item of rawItems) {
    if (item.isShift1) shift1Workers++;
    if (item.isShift1ContinuedOt) shift1ContinuedOt++;
  }

  for (const item of items) {
    uniqueEmps.add(item.code);
    if (!item.isExcludedDept) {
      totalBioHours += item.biometricOtHours;
      totalPaperHours += item.paperOtHours;
      totalApprovedOtHours += item.approvedOtHours;
    }

    if (item.exceeded5pm) broken5pmCount++;
    if (item.isLeftAt330Unearned) unearnedLeftAt330Count++;

    if (item.status === 'PUNCHED_NOT_IN_PAPER') punchedNotInPaper++;
    else if (item.status === 'IN_PAPER_NO_PUNCH') inPaperNoPunch++;
    else if (item.status === 'HOURS_MISMATCH') hoursMismatch++;
    else if (item.status === 'FULLY_MATCHED') fullyMatched++;
    else if (item.status === 'NO_OVERTIME') noOt++;
    else if (item.status === 'EXCLUDED_ADMIN') excludedAdmin++;
  }

  const hoursVariance = Number((totalPaperHours - totalBioHours).toFixed(2));
  
  // Financial risk estimation (unapproved claims in paper + unverified punches for eligible departments)
  const suspiciousHours = items
    .filter((i) => !i.isExcludedDept && (i.status === 'IN_PAPER_NO_PUNCH' || (i.status === 'HOURS_MISMATCH' && i.diffHours > 0)))
    .reduce((acc, i) => acc + Math.max(0, i.diffHours), 0);
  
  const estimatedRiskEgp = Number((suspiciousHours * hourlyRateEgp * 1.5).toFixed(2));

  return {
    items,
    summary: {
      totalEmployees: uniqueEmps.size,
      totalDaysEvaluated: items.length,
      totalBiometricOtHours: Number(totalBioHours.toFixed(2)),
      totalPaperOtHours: Number(totalPaperHours.toFixed(2)),
      totalApprovedOtHours: Number(totalApprovedOtHours.toFixed(2)),
      hoursVariance,
      punchedNotInPaperCount: punchedNotInPaper,
      inPaperNoPunchCount: inPaperNoPunch,
      hoursMismatchCount: hoursMismatch,
      fullyMatchedCount: fullyMatched,
      noOvertimeCount: noOt,
      excludedAdminCount: excludedAdmin,
      broken5pmCount,
      unearnedLeftAt330Count,
      shift1WorkersCount: shift1Workers,
      shift1ContinuedOtCount: shift1ContinuedOt,
      estimatedFinancialRiskEGP: estimatedRiskEgp
    }
  };
}

/**
 * Generates realistic sample paper overtime sheets matching the biometric sample data
 * so the user can test the cross-audit feature with 1 click!
 */
export function getSamplePaperOvertimeData(biometricDataset?: BiometricMonthlyDataset): PaperOvertimeEntry[] {
  // Typical supervisor entries matching sample employees 3935, 3936, 3937, 3938, etc.
  return [
    // Employee 3935 (Protima - Finishing Supervisor)
    {
      id: 'p_3935_2026-05-28',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-05-28',
      hours: 3.0,
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Finishing high-priority batch 104'
    },
    // Case 1: Matching 4.5h on 2026-05-30
    {
      id: 'p_3935_2026-05-30',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-05-30',
      hours: 4.5,
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Overtime shift till 8:00 PM'
    },
    // Case 1.5: 3:30 PM Departure Claimed in Paper (Worker left 3.5 / 15:30 -> 0 OT even if logged in paper)
    {
      id: 'p_3935_2026-05-31',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-05-31',
      hours: 2.0, // Supervisor wrote 2h, but punch checkout was 15:30 (3:30 PM)!
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Claimed 2h, but punch checkout was 15:30 (3:30 PM)'
    },
    // Case 2: In paper as 4.5h, but worker left at 5:30 (Tier 1 = 2.0h) -> HOURS MISMATCH!
    {
      id: 'p_3935_2026-06-08',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-06-08',
      hours: 4.5, // Supervisor claimed 4.5h, but machine checkout is 17:30 (2h)!
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Finishing urgent lot'
    },
    // Case 3: In paper as 2.0h on 2026-06-16, but employee was ABSENT on device! -> GHOST PAPER!
    {
      id: 'p_3935_2026-06-16',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-06-16',
      hours: 2.0, // Employee was absent in biometric!
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Claimed emergency rework'
    },
    // Case 4: Matched 4.5h on 2026-06-11
    {
      id: 'p_3935_2026-06-11',
      code: '3935',
      name: 'Sree Moti Protima Rani',
      department: 'Finishing',
      line: 'Line A',
      date: '2026-06-11',
      hours: 4.5,
      supervisor: 'Eng. Mahmoud Hassan',
      notes: '8:00 PM shift'
    },
    // Case 5: Worker punched on 2026-06-22 (out 17:05 = 2.0h), but supervisor forgot to log them in paper! -> PUNCHED NOT IN PAPER!
    // (We intentionally omit 2026-06-22 from paper to create this exact real-world scenario)

    // Employee 3936 (Mohamed Tarek - Quality Inspector)
    {
      id: 'p_3936_2026-05-28',
      code: '3936',
      name: 'Mohamed Tarek Mahmoud',
      department: 'Quality',
      line: 'Line A',
      date: '2026-05-28',
      hours: 2.0,
      supervisor: 'Tamer Adel',
      notes: 'Inspection inspection audit'
    },
    {
      id: 'p_3936_2026-05-30',
      code: '3936',
      name: 'Mohamed Tarek Mahmoud',
      department: 'Quality',
      line: 'Line A',
      date: '2026-05-30',
      hours: 3.5, // Mismatch with machine
      supervisor: 'Tamer Adel',
      notes: 'Audit shipment'
    },
    // Employee 3937 (Fatma - Sewing Operator)
    {
      id: 'p_3937_2026-05-28',
      code: '3937',
      name: 'Fatma Ali El-Sayed',
      department: 'Sewing',
      line: 'Line B',
      date: '2026-05-28',
      hours: 2.0,
      supervisor: 'Hossam El-Din',
      notes: 'Sewing shirts line'
    },
    {
      id: 'p_3937_2026-06-08',
      code: '3937',
      name: 'Fatma Ali El-Sayed',
      department: 'Sewing',
      line: 'Line B',
      date: '2026-06-08',
      hours: 2.0,
      supervisor: 'Hossam El-Din',
      notes: 'Normal overtime'
    },
    // Employee 3938 (Hassan - Cutting Technician)
    {
      id: 'p_3938_2026-05-28',
      code: '3938',
      name: 'Hassan Mahmoud Radwan',
      department: 'Cutting',
      line: 'Line D',
      date: '2026-05-28',
      hours: 4.5,
      supervisor: 'Khaled Nabil',
      notes: 'Fabric spreading & cutting'
    },
    // Ghost Employee 9999 (In paper sheet, not in biometric database!)
    {
      id: 'p_9999_2026-06-08',
      code: '9999',
      name: 'Ibrahim Sabry Moustafa',
      department: 'Finishing',
      line: 'Line C',
      date: '2026-06-08',
      hours: 4.5,
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Temporary worker - manual entry'
    },
    // Case 6: Administrative employee 3939 claimed by supervisor on paper -> EXCLUDED_ADMIN!
    {
      id: 'p_3939_2026-05-28',
      code: '3939',
      name: 'Mona Ibrahim El-Sayed',
      department: 'Human Resources & Admin',
      line: 'Main Office',
      date: '2026-05-28',
      hours: 2.0,
      supervisor: 'Eng. Mahmoud Hassan',
      notes: 'Monthly payroll prep'
    }
  ];
}
