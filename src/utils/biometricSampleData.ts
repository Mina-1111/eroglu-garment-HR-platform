import { BiometricMonthlyDataset, BiometricPunchRecord, BiometricEmployeeMonthlySummary } from '../types/biometric';
import { formatDateToDmy, getEnglishDayName, checkIsFriday } from './biometricParser';

export function getSampleBiometricData(): BiometricMonthlyDataset {
  // Payroll month cycle: Starts on 27th and ends on 26th! (e.g. 27/05/2026 to 26/06/2026)
  const cycleDates: string[] = [];
  const start = new Date(2026, 4, 27); // 27 May 2026
  const end = new Date(2026, 5, 26);   // 26 June 2026

  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    cycleDates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }

  // Employee 1 (Cardno 3935): Sree Moti Protima Rani - Finishing (Line A)
  const shifts1: Record<string, { in: string; out: string; ot: number; status: string; rem: string }> = {
    '2026-05-27': { in: '07:51:20 AM', out: '16:30:00 PM', ot: 0, status: 'P', rem: '' }, // Left before 5:00 PM -> 0 OT
    '2026-05-28': { in: '07:50:44 AM', out: '18:30:00 PM', ot: 3, status: 'P', rem: '' },
    '2026-05-29': { in: '', out: '', ot: 0, status: '', rem: 'W.Holiday' }, // Friday Off
    '2026-05-30': { in: '07:48:11 AM', out: '19:30:08 PM', ot: 4.5, status: 'P', rem: '' }, // Punched after 7.5 (19:30) -> Tier 2 (8:00 PM = 4.5h OT)
    '2026-05-31': { in: '07:52:00 AM', out: '15:30:00 PM', ot: 0, status: 'P', rem: '' }, // Normal day
    '2026-06-01': { in: '', out: '', ot: 0, status: '', rem: 'G.Holiday' },
    '2026-06-02': { in: '', out: '', ot: 0, status: '', rem: 'G.Holiday' },
    '2026-06-03': { in: '', out: '', ot: 0, status: '', rem: 'G.Holiday' },
    '2026-06-04': { in: '', out: '', ot: 0, status: '', rem: 'G.Holiday' },
    '2026-06-05': { in: '', out: '', ot: 0, status: '', rem: 'W.Holiday' }, // Friday Off
    '2026-06-06': { in: '07:52:24 AM', out: '16:35:01 PM', ot: 0, status: 'P', rem: '' }, // Left before 5:00 PM -> 0 OT
    '2026-06-07': { in: '07:48:11 AM', out: '19:31:08 PM', ot: 4.5, status: 'P', rem: '' }, // Punched after 7.5 (19:31) -> Tier 2 (8:00 PM = 4.5h OT)
    '2026-06-08': { in: '07:51:59 AM', out: '17:30:00 PM', ot: 2, status: 'P', rem: '' }, // Punched after 5:00 PM -> 2h OT (Tier 1 @ 1.35x)
    '2026-06-09': { in: '07:50:44 AM', out: '23:02:04 PM', ot: 0, status: 'P', rem: 'Shift 3' }, // Shift 3 Night Shift (started 7.5 finished ~11.5) -> 0 OT
    '2026-06-10': { in: '07:47:10 AM', out: '20:06:01 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-11': { in: '07:48:30 AM', out: '20:07:30 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-12': { in: '', out: '', ot: 0, status: '', rem: 'W.Holiday' }, // Friday Off
    '2026-06-13': { in: '07:48:01 AM', out: '20:10:57 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-14': { in: '07:45:36 AM', out: '20:02:11 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-15': { in: '07:49:40 AM', out: '19:13:06 PM', ot: 2, status: 'P', rem: '' },
    '2026-06-16': { in: '', out: '', ot: 0, status: 'A', rem: 'Absent' }, // Absent day
    '2026-06-17': { in: '07:50:33 AM', out: '20:05:26 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-18': { in: '07:51:43 AM', out: '20:02:58 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-19': { in: '07:54:25 AM', out: '16:29:22 PM', ot: 7, status: 'P', rem: 'W.Holiday' }, // Friday Worked OT!
    '2026-06-20': { in: '07:51:22 AM', out: '00:02:49 AM', ot: 0, status: 'P', rem: 'Shift 3' }, // Shift 3 Night punch -> 0 OT
    '2026-06-21': { in: '07:51:06 AM', out: '00:01:50 AM', ot: 0, status: 'P', rem: 'Shift 3' }, // Shift 3 Night punch -> 0 OT
    '2026-06-22': { in: '07:53:07 AM', out: '17:05:00 PM', ot: 2, status: 'P', rem: '' }, // Punched after 5:00 PM -> Tier 1 (2h OT @ 1.35x)
    '2026-06-23': { in: '07:50:12 AM', out: '20:05:56 PM', ot: 4.5, status: 'P', rem: '' }, // Punched at 8:00 PM -> 4.5h OT
    '2026-06-24': { in: '07:51:01 AM', out: '00:03:19 AM', ot: 0, status: 'P', rem: 'Shift 3' }, // Shift 3 Night punch -> 0 OT
    '2026-06-25': { in: '07:51:04 AM', out: '17:00:00 PM', ot: 2, status: 'P', rem: '' }, // Punched at 5:00 PM -> Tier 1 (2h OT @ 1.35x)
    '2026-06-26': { in: '', out: '', ot: 0, status: '', rem: 'W.Holiday' } // Friday Cycle End (26th)
  };

  const emp1Punches: BiometricPunchRecord[] = cycleDates.map((dateStr, idx) => {
    const isFriday = checkIsFriday(dateStr);
    const weekDay = getEnglishDayName(dateStr);
    const shift = shifts1[dateStr] || { in: '', out: '', ot: 0, status: isFriday ? '' : 'A', rem: isFriday ? 'W.Holiday' : 'Absent' };
    
    const r135 = isFriday ? 0 : (shift.ot <= 2 ? shift.ot : 2);
    const r170 = isFriday ? 0 : (shift.ot > 2 ? shift.ot - 2 : 0);
    const r200 = isFriday ? shift.ot : 0;

    return {
      id: `3935_${dateStr}`,
      sl: idx + 1,
      code: '3935',
      name: 'Sree Moti Protima Rani',
      designation: 'Finishing Supervisor',
      department: 'Finishing',
      line: 'Line A',
      date: dateStr,
      formattedDate: formatDateToDmy(dateStr),
      weekDay,
      dayName: weekDay,
      isFriday,
      inTime: shift.in,
      checkIn: shift.in,
      outTime: shift.out,
      checkOut: shift.out,
      totalWorkedHours: shift.in ? 8 + shift.ot : 0,
      isNormalDay: shift.ot === 0 && !!shift.in,
      otHours: shift.ot,
      rate135Hours: r135,
      rate170Hours: r170,
      rate200Hours: r200,
      status: shift.status,
      remarks: shift.rem,
      remark: shift.rem,
      sourceFile: 'Attendance_27to26_Cycle.xlsx'
    };
  });

  const emp1Summary: BiometricEmployeeMonthlySummary = {
    code: '3935',
    name: 'Sree Moti Protima Rani',
    designation: 'Finishing Supervisor',
    department: 'Finishing',
    line: 'Line A',
    daysOfMonth: cycleDates.length,
    presentDaysCount: emp1Punches.filter((p) => p.status === 'P').length,
    absentDaysCount: emp1Punches.filter((p) => p.status === 'A').length,
    lateDaysCount: 0,
    leaveDaysCount: 0,
    holidayDaysCount: emp1Punches.filter((p) => p.remarks.includes('G.Holiday')).length,
    weekEndDaysCount: emp1Punches.filter((p) => p.isFriday).length,
    fridayWorkedCount: emp1Punches.filter((p) => p.isFriday && p.status === 'P').length,
    normalDaysCount: emp1Punches.filter((p) => p.isNormalDay).length,
    totalWorkedHours: emp1Punches.reduce((acc, p) => acc + p.totalWorkedHours, 0),
    totalOtHours: emp1Punches.reduce((acc, p) => acc + p.otHours, 0),
    totalRate135Hours: emp1Punches.reduce((acc, p) => acc + p.rate135Hours, 0),
    totalRate170Hours: emp1Punches.reduce((acc, p) => acc + p.rate170Hours, 0),
    totalRate200Hours: emp1Punches.reduce((acc, p) => acc + p.rate200Hours, 0),
    baseSalary: 6500,
    hourlyRate: 27.08,
    otAmount135: Number((emp1Punches.reduce((acc, p) => acc + p.rate135Hours, 0) * 27.08 * 1.35).toFixed(2)),
    otAmount170: Number((emp1Punches.reduce((acc, p) => acc + p.rate170Hours, 0) * 27.08 * 1.70).toFixed(2)),
    otAmount200: Number((emp1Punches.reduce((acc, p) => acc + p.rate200Hours, 0) * 27.08 * 2.0).toFixed(2)),
    totalOtAmount: 0,
    grossSalary: 0,
    punches: emp1Punches,
    dailyOtMap: {}
  };
  emp1Summary.totalOtAmount = Number(((emp1Summary.otAmount135 || 0) + (emp1Summary.otAmount170 || 0) + (emp1Summary.otAmount200 || 0)).toFixed(2));
  emp1Summary.grossSalary = Number(((emp1Summary.baseSalary || 0) + (emp1Summary.totalOtAmount || 0)).toFixed(2));
  emp1Punches.forEach((p) => { emp1Summary.dailyOtMap[p.date] = p.otHours; });

  // Employee 2 (Cardno 3936) - Quality Control (Line A)
  const emp2Punches: BiometricPunchRecord[] = cycleDates.map((dateStr, idx) => {
    const isFriday = checkIsFriday(dateStr);
    const weekDay = getEnglishDayName(dateStr);
    const baseP = shifts1[dateStr];
    
    let inT = baseP && baseP.in ? '07:48:00 AM' : '';
    let outT = baseP && baseP.out ? '17:30:00 PM' : '';
    const rawOt = baseP && baseP.ot > 0 ? Math.max(0, baseP.ot - 1) : 0;
    let ot = rawOt < 2 ? 0 : rawOt;
    if (inT && ot === 0) outT = '15:30:00 PM';
    
    if (isFriday) {
      inT = '';
      outT = '';
      ot = 0;
    }

    let st = inT ? 'P' : isFriday ? '' : 'A';
    let rem = isFriday ? 'W.Holiday' : !inT ? 'Absent' : '';
    if (baseP && baseP.rem.includes('G.Holiday')) {
      rem = 'G.Holiday';
      st = '';
    }

    return {
      id: `3936_${dateStr}`,
      sl: idx + 1,
      code: '3936',
      name: 'Mohamed Tarek Mahmoud',
      designation: 'Quality Inspector',
      department: 'Quality',
      line: 'Line A',
      date: dateStr,
      formattedDate: formatDateToDmy(dateStr),
      weekDay,
      dayName: weekDay,
      isFriday,
      inTime: inT,
      checkIn: inT,
      outTime: outT,
      checkOut: outT,
      totalWorkedHours: inT ? 8 + ot : 0,
      isNormalDay: ot === 0 && !!inT,
      otHours: ot,
      rate135Hours: isFriday ? 0 : (ot <= 2 ? ot : 2),
      rate170Hours: isFriday ? 0 : (ot > 2 ? ot - 2 : 0),
      rate200Hours: isFriday ? ot : 0,
      status: st,
      remarks: rem,
      remark: rem,
      sourceFile: 'Attendance_27to26_Cycle.xlsx'
    };
  });

  const emp2Summary: BiometricEmployeeMonthlySummary = {
    code: '3936',
    name: 'Mohamed Tarek Mahmoud',
    designation: 'Quality Inspector',
    department: 'Quality',
    line: 'Line A',
    daysOfMonth: cycleDates.length,
    presentDaysCount: emp2Punches.filter((p) => p.status === 'P').length,
    absentDaysCount: emp2Punches.filter((p) => p.status === 'A').length,
    lateDaysCount: 0,
    leaveDaysCount: 0,
    holidayDaysCount: emp2Punches.filter((p) => p.remarks.includes('G.Holiday')).length,
    weekEndDaysCount: emp2Punches.filter((p) => p.isFriday).length,
    fridayWorkedCount: emp2Punches.filter((p) => p.isFriday && p.status === 'P').length,
    normalDaysCount: emp2Punches.filter((p) => p.isNormalDay).length,
    totalWorkedHours: emp2Punches.reduce((acc, p) => acc + p.totalWorkedHours, 0),
    totalOtHours: emp2Punches.reduce((acc, p) => acc + p.otHours, 0),
    totalRate135Hours: emp2Punches.reduce((acc, p) => acc + p.rate135Hours, 0),
    totalRate170Hours: emp2Punches.reduce((acc, p) => acc + p.rate170Hours, 0),
    totalRate200Hours: emp2Punches.reduce((acc, p) => acc + p.rate200Hours, 0),
    baseSalary: 6200,
    hourlyRate: 25.83,
    otAmount135: Number((emp2Punches.reduce((acc, p) => acc + p.rate135Hours, 0) * 25.83 * 1.35).toFixed(2)),
    otAmount170: Number((emp2Punches.reduce((acc, p) => acc + p.rate170Hours, 0) * 25.83 * 1.70).toFixed(2)),
    otAmount200: 0,
    totalOtAmount: 0,
    grossSalary: 0,
    punches: emp2Punches,
    dailyOtMap: {}
  };
  emp2Summary.totalOtAmount = Number(((emp2Summary.otAmount135 || 0) + (emp2Summary.otAmount170 || 0)).toFixed(2));
  emp2Summary.grossSalary = Number(((emp2Summary.baseSalary || 0) + (emp2Summary.totalOtAmount || 0)).toFixed(2));
  emp2Punches.forEach((p) => { emp2Summary.dailyOtMap[p.date] = p.otHours; });

  // Employee 3 (Cardno 3937): Hassan Farouk Salem - Sewing (Line B) [Heavy Overtime Consumer]
  const emp3Punches: BiometricPunchRecord[] = cycleDates.map((dateStr, idx) => {
    const isFriday = checkIsFriday(dateStr);
    const weekDay = getEnglishDayName(dateStr);
    
    // Sewing Line B has urgent production export shipments: frequent 4h and Friday overtime!
    let inT = '07:30:00 AM';
    let outT = '19:30:00 PM'; // 4 hours overtime
    let ot = 4;
    
    if (isFriday) {
      if (idx === 9 || idx === 23) {
        // Worked Friday Double Time to complete shipment!
        inT = '07:30:00 AM';
        outT = '15:30:00 PM';
        ot = 8;
      } else {
        inT = '';
        outT = '';
        ot = 0;
      }
    } else if (idx === 14) {
      // Absent day
      inT = '';
      outT = '';
      ot = 0;
    }

    const st = inT ? 'P' : isFriday ? '' : 'A';
    const rem = isFriday ? (ot > 0 ? 'W.Holiday (Friday 2x)' : 'W.Holiday') : inT ? '' : 'Absent';

    return {
      id: `3937_${dateStr}`,
      sl: idx + 1,
      code: '3937',
      name: 'Hassan Farouk Salem',
      designation: 'Sewing Senior Operator',
      department: 'Sewing',
      line: 'Line B',
      date: dateStr,
      formattedDate: formatDateToDmy(dateStr),
      weekDay,
      dayName: weekDay,
      isFriday,
      inTime: inT,
      checkIn: inT,
      outTime: outT,
      checkOut: outT,
      totalWorkedHours: inT ? 8 + ot : 0,
      isNormalDay: ot === 0 && !!inT,
      otHours: ot,
      rate135Hours: isFriday ? 0 : (ot <= 2 ? ot : 2),
      rate170Hours: isFriday ? 0 : (ot > 2 ? ot - 2 : 0),
      rate200Hours: isFriday ? ot : 0,
      status: st,
      remarks: rem,
      remark: rem,
      sourceFile: 'Attendance_27to26_Cycle.xlsx'
    };
  });

  const emp3Summary: BiometricEmployeeMonthlySummary = {
    code: '3937',
    name: 'Hassan Farouk Salem',
    designation: 'Sewing Senior Operator',
    department: 'Sewing',
    line: 'Line B',
    daysOfMonth: cycleDates.length,
    presentDaysCount: emp3Punches.filter((p) => p.status === 'P').length,
    absentDaysCount: emp3Punches.filter((p) => p.status === 'A').length,
    lateDaysCount: 0,
    leaveDaysCount: 0,
    holidayDaysCount: 0,
    weekEndDaysCount: emp3Punches.filter((p) => p.isFriday).length,
    fridayWorkedCount: emp3Punches.filter((p) => p.isFriday && p.status === 'P').length,
    normalDaysCount: emp3Punches.filter((p) => p.isNormalDay).length,
    totalWorkedHours: emp3Punches.reduce((acc, p) => acc + p.totalWorkedHours, 0),
    totalOtHours: emp3Punches.reduce((acc, p) => acc + p.otHours, 0),
    totalRate135Hours: emp3Punches.reduce((acc, p) => acc + p.rate135Hours, 0),
    totalRate170Hours: emp3Punches.reduce((acc, p) => acc + p.rate170Hours, 0),
    totalRate200Hours: emp3Punches.reduce((acc, p) => acc + p.rate200Hours, 0),
    baseSalary: 6000,
    hourlyRate: 25.00,
    otAmount135: Number((emp3Punches.reduce((acc, p) => acc + p.rate135Hours, 0) * 25.00 * 1.35).toFixed(2)),
    otAmount170: Number((emp3Punches.reduce((acc, p) => acc + p.rate170Hours, 0) * 25.00 * 1.70).toFixed(2)),
    otAmount200: Number((emp3Punches.reduce((acc, p) => acc + p.rate200Hours, 0) * 25.00 * 2.0).toFixed(2)),
    totalOtAmount: 0,
    grossSalary: 0,
    punches: emp3Punches,
    dailyOtMap: {}
  };
  emp3Summary.totalOtAmount = Number(((emp3Summary.otAmount135 || 0) + (emp3Summary.otAmount170 || 0) + (emp3Summary.otAmount200 || 0)).toFixed(2));
  emp3Summary.grossSalary = Number(((emp3Summary.baseSalary || 0) + (emp3Summary.totalOtAmount || 0)).toFixed(2));
  emp3Punches.forEach((p) => { emp3Summary.dailyOtMap[p.date] = p.otHours; });

  // Employee 4 (Cardno 3938): Ahmed Gamal Mansour - Cutting (Line C)
  const emp4Punches: BiometricPunchRecord[] = cycleDates.map((dateStr, idx) => {
    const isFriday = checkIsFriday(dateStr);
    const weekDay = getEnglishDayName(dateStr);
    
    // Cutting Line C operates with moderate overtime (exit 17:30 / 2h OT)
    let inT = '07:35:00 AM';
    let outT = (idx % 2 === 0) ? '17:30:00 PM' : '15:30:00 PM';
    let ot = (idx % 2 === 0) ? 2 : 0;

    if (isFriday) {
      inT = '';
      outT = '';
      ot = 0;
    }

    const st = inT ? 'P' : isFriday ? '' : 'A';
    const rem = isFriday ? 'W.Holiday' : '';

    return {
      id: `3938_${dateStr}`,
      sl: idx + 1,
      code: '3938',
      name: 'Ahmed Gamal Mansour',
      designation: 'Fabric Cutting Master',
      department: 'Cutting',
      line: 'Line C',
      date: dateStr,
      formattedDate: formatDateToDmy(dateStr),
      weekDay,
      dayName: weekDay,
      isFriday,
      inTime: inT,
      checkIn: inT,
      outTime: outT,
      checkOut: outT,
      totalWorkedHours: inT ? 8 + ot : 0,
      isNormalDay: ot === 0 && !!inT,
      otHours: ot,
      rate135Hours: isFriday ? 0 : (ot <= 2 ? ot : 2),
      rate170Hours: 0,
      rate200Hours: 0,
      status: st,
      remarks: rem,
      remark: rem,
      sourceFile: 'Attendance_27to26_Cycle.xlsx'
    };
  });

  const emp4Summary: BiometricEmployeeMonthlySummary = {
    code: '3938',
    name: 'Ahmed Gamal Mansour',
    designation: 'Fabric Cutting Master',
    department: 'Cutting',
    line: 'Line C',
    daysOfMonth: cycleDates.length,
    presentDaysCount: emp4Punches.filter((p) => p.status === 'P').length,
    absentDaysCount: emp4Punches.filter((p) => p.status === 'A').length,
    lateDaysCount: 0,
    leaveDaysCount: 0,
    holidayDaysCount: 0,
    weekEndDaysCount: emp4Punches.filter((p) => p.isFriday).length,
    fridayWorkedCount: 0,
    normalDaysCount: emp4Punches.filter((p) => p.isNormalDay).length,
    totalWorkedHours: emp4Punches.reduce((acc, p) => acc + p.totalWorkedHours, 0),
    totalOtHours: emp4Punches.reduce((acc, p) => acc + p.otHours, 0),
    totalRate135Hours: emp4Punches.reduce((acc, p) => acc + p.rate135Hours, 0),
    totalRate170Hours: 0,
    totalRate200Hours: 0,
    baseSalary: 5800,
    hourlyRate: 24.17,
    otAmount135: Number((emp4Punches.reduce((acc, p) => acc + p.rate135Hours, 0) * 24.17 * 1.35).toFixed(2)),
    otAmount170: 0,
    otAmount200: 0,
    totalOtAmount: 0,
    grossSalary: 0,
    punches: emp4Punches,
    dailyOtMap: {}
  };
  emp4Summary.totalOtAmount = emp4Summary.otAmount135 || 0;
  emp4Summary.grossSalary = Number(((emp4Summary.baseSalary || 0) + (emp4Summary.totalOtAmount || 0)).toFixed(2));
  emp4Punches.forEach((p) => { emp4Summary.dailyOtMap[p.date] = p.otHours; });

  // Employee 5 (Cardno 3939): Mona Ibrahim - Administration & HR (HR Department - Excluded from Overtime)
  const emp5Punches: BiometricPunchRecord[] = cycleDates.map((dateStr, idx) => {
    const isFriday = checkIsFriday(dateStr);
    const weekDay = getEnglishDayName(dateStr);
    
    // Administrative staff: Works 8:00 AM to 5:30 PM (or 4:30 PM)
    // Non-OT eligible!
    let inT = '08:00:00 AM';
    let outT = (idx % 3 === 0) ? '17:30:00 PM' : '16:30:00 PM';
    let ot = 0; // Admin staff do NOT earn overtime

    if (isFriday) {
      inT = '';
      outT = '';
      ot = 0;
    }

    const st = inT ? 'P' : isFriday ? '' : 'A';
    const rem = isFriday ? 'W.Holiday' : '';

    return {
      id: `3939_${dateStr}`,
      sl: idx + 1,
      code: '3939',
      name: 'Mona Ibrahim El-Sayed',
      designation: 'HR & Administrative Specialist',
      department: 'Human Resources & Admin',
      line: 'Main Office',
      date: dateStr,
      formattedDate: formatDateToDmy(dateStr),
      weekDay,
      dayName: weekDay,
      isFriday,
      inTime: inT,
      checkIn: inT,
      outTime: outT,
      checkOut: outT,
      totalWorkedHours: inT ? 8 : 0,
      isNormalDay: !!inT,
      otHours: 0,
      rate135Hours: 0,
      rate170Hours: 0,
      rate200Hours: 0,
      status: st,
      remarks: rem,
      remark: rem,
      sourceFile: 'Attendance_27to26_Cycle.xlsx'
    };
  });

  const emp5Summary: BiometricEmployeeMonthlySummary = {
    code: '3939',
    name: 'Mona Ibrahim El-Sayed',
    designation: 'HR & Administrative Specialist',
    department: 'Human Resources & Admin',
    line: 'Main Office',
    daysOfMonth: cycleDates.length,
    presentDaysCount: emp5Punches.filter((p) => p.status === 'P').length,
    absentDaysCount: 0,
    lateDaysCount: 0,
    leaveDaysCount: 0,
    holidayDaysCount: 0,
    weekEndDaysCount: emp5Punches.filter((p) => p.isFriday).length,
    fridayWorkedCount: 0,
    normalDaysCount: emp5Punches.filter((p) => p.isNormalDay).length,
    totalWorkedHours: emp5Punches.reduce((acc, p) => acc + p.totalWorkedHours, 0),
    totalOtHours: 0,
    totalRate135Hours: 0,
    totalRate170Hours: 0,
    totalRate200Hours: 0,
    baseSalary: 7500,
    hourlyRate: 31.25,
    otAmount135: 0,
    otAmount170: 0,
    otAmount200: 0,
    totalOtAmount: 0,
    grossSalary: 7500,
    punches: emp5Punches,
    dailyOtMap: {}
  };
  emp5Punches.forEach((p) => { emp5Summary.dailyOtMap[p.date] = 0; });

  const employees = [emp1Summary, emp2Summary, emp3Summary, emp4Summary, emp5Summary];
  const allPunches = [...emp1Punches, ...emp2Punches, ...emp3Punches, ...emp4Punches, ...emp5Punches];

  const totalWorked = employees.reduce((s, e) => s + e.totalWorkedHours, 0);
  const totalOt = employees.reduce((s, e) => s + e.totalOtHours, 0);
  const total135 = employees.reduce((s, e) => s + e.totalRate135Hours, 0);
  const total170 = employees.reduce((s, e) => s + e.totalRate170Hours, 0);
  const total200 = employees.reduce((s, e) => s + e.totalRate200Hours, 0);
  const totalBase = employees.reduce((s, e) => s + (e.baseSalary || 0), 0);
  const totalOtPay = employees.reduce((s, e) => s + (e.totalOtAmount || 0), 0);
  const totalGross = employees.reduce((s, e) => s + (e.grossSalary || 0), 0);

  return {
    allDates: cycleDates,
    employees,
    allPunches,
    grandTotalWorkedHours: totalWorked,
    grandTotalOtHours: totalOt,
    grandTotal135Hours: total135,
    grandTotal170Hours: total170,
    grandTotal200Hours: total200,
    grandTotalBaseSalary: totalBase,
    grandTotalOtPay: totalOtPay,
    grandTotalGrossSalary: totalGross
  };
}
