/**
 * Smart Date Extractor from Filenames
 * Extracts actual overtime and attendance dates directly from filename patterns.
 */

export function normalizeDigits(str: string): string {
  const arabicDigits = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
  return str.replace(/[\u0660-\u0669]/g, (d) => `${arabicDigits.indexOf(d)}`);
}

const MONTH_NAMES: Record<string, string> = {
  '\u0627\u0643\u062a\u0648\u0628\u0631': '10', '\u0623\u0643\u062a\u0648\u0628\u0631': '10', 'oct': '10', 'october': '10',
  '\u0633\u0628\u062a\u0645\u0628\u0631': '09', 'sep': '09', 'september': '09',
  '\u0646\u0648\u0641\u0645\u0628\u0631': '11', 'nov': '11', 'november': '11',
  '\u062f\u064a\u0633\u0645\u0628\u0631': '12', 'dec': '12', 'december': '12',
  '\u064a\u0646\u0627\u064a\u0631': '01', 'jan': '01', 'january': '01',
  '\u0641\u0628\u0631\u0627\u064a\u0631': '02', 'feb': '02', 'february': '02',
  '\u0645\u0627\u0631\u0633': '03', 'mar': '03', 'march': '03',
  '\u0627\u0628\u0631\u064a\u0644': '04', '\u0625\u0628\u0631\u064a\u0644': '04', 'apr': '04', 'april': '04',
  '\u0645\u0627\u064a\u0648': '05', 'may': '05',
  '\u064a\u0648\u0646\u064a\u0648': '06', '\u064a\u0648\u0646\u064a\u0629': '06', 'jun': '06', 'june': '06',
  '\u064a\u0648\u0644\u064a\u0648': '07', '\u064a\u0648\u0644\u064a\u0629': '07', 'jul': '07', 'july': '07',
  '\u0627\u063a\u0633\u0637\u0633': '08', '\u0623\u063a\u0633\u0637\u0633': '08', 'aug': '08', 'august': '08'
};

export function extractDateFromFilenameSmart(
  fileName: string,
  preferredYear: number = 2026,
  preferredMonth: number = 10
): string {
  if (!fileName) return '2026-10-01';

  // 1. Clean filename and remove extension
  let clean = normalizeDigits(fileName)
    .replace(/\.(xlsx|xls|csv)$/i, '')
    .trim();

  // 2. Check pattern YYYY-MM-DD or YYYY_MM_DD or YYYY.MM.DD (e.g. 2026-10-01)
  const matchIso = clean.match(/(\d{4})[-_.\/](\d{1,2})[-_.\/](\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. Check pattern DD-MM-YYYY or DD_MM_YYYY or DD.MM.YYYY (e.g. 01-10-2026)
  const matchDmy = clean.match(/(\d{1,2})[-_.\/](\d{1,2})[-_.\/](\d{4})/);
  if (matchDmy) {
    const d = matchDmy[1].padStart(2, '0');
    const m = matchDmy[2].padStart(2, '0');
    const y = matchDmy[3];
    return `${y}-${m}-${d}`;
  }

  // 4. Check month names written as text in English or Arabic (e.g. 1 October or 5-Oct)
  for (const [mName, mCode] of Object.entries(MONTH_NAMES)) {
    const r1 = new RegExp(`(\\d{1,2})\\s*[-_\\s]?\\s*${mName}`, 'i');
    const m1 = clean.match(r1);
    if (m1) {
      const d = m1[1].padStart(2, '0');
      return `${preferredYear}-${mCode}-${d}`;
    }

    const r2 = new RegExp(`${mName}\\s*[-_\\s]?\\s*(\\d{1,2})`, 'i');
    const m2 = clean.match(r2);
    if (m2) {
      const d = m2[1].padStart(2, '0');
      return `${preferredYear}-${mCode}-${d}`;
    }
  }

  // 5. Check pattern day and month without year (e.g. 1-10, 01-10, 25-10)
  const matchDayMonth = clean.match(/(?:^|[^\d])(\d{1,2})[-_.\/](\d{1,2})(?:[^\d]|$)/);
  if (matchDayMonth) {
    const n1 = parseInt(matchDayMonth[1], 10);
    const n2 = parseInt(matchDayMonth[2], 10);

    // If n2 is valid month (1 to 12) and n1 is valid day (1 to 31)
    if (n2 >= 1 && n2 <= 12 && n1 >= 1 && n1 <= 31) {
      const d = String(n1).padStart(2, '0');
      const m = String(n2).padStart(2, '0');
      return `${preferredYear}-${m}-${d}`;
    }

    // Vice versa if n1 is month and n2 is day
    if (n2 >= 1 && n2 <= 31 && n1 >= 1 && n1 <= 12) {
      const m = String(n1).padStart(2, '0');
      const d = String(n2).padStart(2, '0');
      return `${preferredYear}-${m}-${d}`;
    }
  }

  // 6. Check words like "Day X" (e.g. Day 1, Day 05)
  const matchWordDay = clean.match(/(?:\u064a\u0648\u0645|day)\s*[-_]?\s*(\d{1,2})/i);
  if (matchWordDay) {
    const dNum = parseInt(matchWordDay[1], 10);
    if (dNum >= 1 && dNum <= 31) {
      const d = String(dNum).padStart(2, '0');
      const m = String(preferredMonth).padStart(2, '0');
      return `${preferredYear}-${m}-${d}`;
    }
  }

  // 7. Check if filename contains a single integer representing the day (e.g. 1.xlsx, 01.xlsx, 15.xlsx)
  const matchAnyNum = clean.match(/(?:^|[^\d])(\d{1,2})(?:$|[^\d])/);
  if (matchAnyNum) {
    const dNum = parseInt(matchAnyNum[1], 10);
    if (dNum >= 1 && dNum <= 31) {
      const d = String(dNum).padStart(2, '0');
      const m = String(preferredMonth).padStart(2, '0');
      return `${preferredYear}-${m}-${d}`;
    }
  }

  // 8. If no number detected at all, use clean filename as date identifier
  return clean || `Day_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Formats date for display in table (e.g. DD/MM with day name)
 */
export function formatDisplayDate(dateStr: string): { shortDate: string; fullDate: string; dayName: string } {
  const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const y = parseInt(parts[1], 10);
      const m = parseInt(parts[2], 10) - 1;
      const d = parseInt(parts[3], 10);
      const dt = new Date(y, m, d);
      const dayName = englishDays[dt.getDay()] || '';
      return {
        shortDate: `${parts[3]}/${parts[2]}`,
        fullDate: dateStr,
        dayName
      };
    }
  } catch {
    // fallback
  }

  return {
    shortDate: dateStr,
    fullDate: dateStr,
    dayName: ''
  };
}
