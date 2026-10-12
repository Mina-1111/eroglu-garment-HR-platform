import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Layers, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  Activity, 
  ArrowUpRight, 
  Filter,
  ShieldAlert,
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';
import { BiometricEmployeeMonthlySummary, BiometricPunchRecord } from '../types/biometric';
import { exportProductionCostAnalyticsExcel } from '../utils/biometricExcelExport';

interface ProductionCostAnalyticsProps {
  employees: BiometricEmployeeMonthlySummary[];
  allPunches: BiometricPunchRecord[];
  allDates: string[];
  defaultBaseSalary?: number;
  officialHolidays?: string[];
  onSelectEmployee?: (emp: BiometricEmployeeMonthlySummary) => void;
}

export const ProductionCostAnalytics: React.FC<ProductionCostAnalyticsProps> = ({
  employees,
  allPunches,
  allDates,
  defaultBaseSalary = 0,
  officialHolidays = [],
  onSelectEmployee
}) => {
  // Navigation sub-tab inside analytics
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'departments' | 'lines' | 'dailyShortage'>('overview');
  
  // Department filter
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Factory totals
  const factoryTotals = useMemo(() => {
    let totalBase = 0;
    let totalOtPay = 0;
    let totalGross = 0;
    let totalOtHours = 0;
    let total135 = 0;
    let total170 = 0;
    let total200 = 0;
    let totalWorked = 0;

    employees.forEach((e) => {
      totalBase += e.baseSalary || 0;
      totalOtPay += e.totalOtAmount || 0;
      totalGross += e.grossSalary || (e.baseSalary || 0);
      totalOtHours += e.totalOtHours || 0;
      total135 += e.totalRate135Hours || 0;
      total170 += e.totalRate170Hours || 0;
      total200 += e.totalRate200Hours || 0;
      totalWorked += e.totalWorkedHours || 0;
    });

    const otToPayrollRatio = totalGross > 0 ? (totalOtPay / totalGross) * 100 : 0;
    const avgOtHoursPerWorker = employees.length > 0 ? totalOtHours / employees.length : 0;
    const avgOtCostPerWorker = employees.length > 0 ? totalOtPay / employees.length : 0;

    return {
      totalWorkers: employees.length,
      totalBase: Number(totalBase.toFixed(2)),
      totalOtPay: Number(totalOtPay.toFixed(2)),
      totalGross: Number(totalGross.toFixed(2)),
      totalOtHours: Number(totalOtHours.toFixed(2)),
      total135: Number(total135.toFixed(2)),
      total170: Number(total170.toFixed(2)),
      total200: Number(total200.toFixed(2)),
      totalWorked: Number(totalWorked.toFixed(2)),
      otToPayrollRatio: Number(otToPayrollRatio.toFixed(1)),
      avgOtHoursPerWorker: Number(avgOtHoursPerWorker.toFixed(1)),
      avgOtCostPerWorker: Number(avgOtCostPerWorker.toFixed(2))
    };
  }, [employees]);

  // 1. Department Breakdown Statistics
  const departmentStats = useMemo(() => {
    const deptMap = new Map<string, {
      department: string;
      workerCount: number;
      totalBaseSalary: number;
      totalOtCost: number;
      grossPayroll: number;
      otHours135: number;
      otHours170: number;
      otHours200: number;
      totalOtHours: number;
      totalWorkedHours: number;
      employees: BiometricEmployeeMonthlySummary[];
    }>();

    employees.forEach((emp) => {
      const dName = emp.department || 'General';
      if (!deptMap.has(dName)) {
        deptMap.set(dName, {
          department: dName,
          workerCount: 0,
          totalBaseSalary: 0,
          totalOtCost: 0,
          grossPayroll: 0,
          otHours135: 0,
          otHours170: 0,
          otHours200: 0,
          totalOtHours: 0,
          totalWorkedHours: 0,
          employees: []
        });
      }

      const item = deptMap.get(dName)!;
      item.workerCount += 1;
      item.totalBaseSalary += (emp.baseSalary || 0);
      item.totalOtCost += (emp.totalOtAmount || 0);
      item.grossPayroll += (emp.grossSalary || (emp.baseSalary || 0));
      item.otHours135 += (emp.totalRate135Hours || 0);
      item.otHours170 += (emp.totalRate170Hours || 0);
      item.otHours200 += (emp.totalRate200Hours || 0);
      item.totalOtHours += (emp.totalOtHours || 0);
      item.totalWorkedHours += (emp.totalWorkedHours || 0);
      item.employees.push(emp);
    });

    const list = Array.from(deptMap.values()).map((d) => {
      const otBudgetShare = factoryTotals.totalOtPay > 0 ? (d.totalOtCost / factoryTotals.totalOtPay) * 100 : 0;
      const otToDeptSalaryRatio = d.grossPayroll > 0 ? (d.totalOtCost / d.grossPayroll) * 100 : 0;
      const avgOtCostPerWorker = d.workerCount > 0 ? d.totalOtCost / d.workerCount : 0;
      const avgOtHoursPerWorker = d.workerCount > 0 ? d.totalOtHours / d.workerCount : 0;

      return {
        ...d,
        totalBaseSalary: Number(d.totalBaseSalary.toFixed(2)),
        totalOtCost: Number(d.totalOtCost.toFixed(2)),
        grossPayroll: Number(d.grossPayroll.toFixed(2)),
        otHours135: Number(d.otHours135.toFixed(2)),
        otHours170: Number(d.otHours170.toFixed(2)),
        otHours200: Number(d.otHours200.toFixed(2)),
        totalOtHours: Number(d.totalOtHours.toFixed(2)),
        totalWorkedHours: Number(d.totalWorkedHours.toFixed(2)),
        otBudgetShare: Number(otBudgetShare.toFixed(1)),
        otToDeptSalaryRatio: Number(otToDeptSalaryRatio.toFixed(1)),
        avgOtCostPerWorker: Number(avgOtCostPerWorker.toFixed(2)),
        avgOtHoursPerWorker: Number(avgOtHoursPerWorker.toFixed(1))
      };
    });

    // Sort descending by Overtime Cost
    return list.sort((a, b) => b.totalOtCost - a.totalOtCost);
  }, [employees, factoryTotals.totalOtPay]);

  // 2. Production Line Breakdown & Root-Cause Diagnosis
  const lineStats = useMemo(() => {
    const lineMap = new Map<string, {
      line: string;
      department: string;
      workerCount: number;
      totalOtHours: number;
      totalOtCost: number;
      otHours135: number;
      otHours170: number;
      otHours200: number;
      totalAbsentDays: number;
      employees: BiometricEmployeeMonthlySummary[];
    }>();

    employees.forEach((emp) => {
      const lName = emp.line && emp.line !== 'Nil' ? emp.line : `General (${emp.department || 'Line'})`;
      if (!lineMap.has(lName)) {
        lineMap.set(lName, {
          line: lName,
          department: emp.department || 'General',
          workerCount: 0,
          totalOtHours: 0,
          totalOtCost: 0,
          otHours135: 0,
          otHours170: 0,
          otHours200: 0,
          totalAbsentDays: 0,
          employees: []
        });
      }

      const item = lineMap.get(lName)!;
      item.workerCount += 1;
      item.totalOtHours += (emp.totalOtHours || 0);
      item.totalOtCost += (emp.totalOtAmount || 0);
      item.otHours135 += (emp.totalRate135Hours || 0);
      item.otHours170 += (emp.totalRate170Hours || 0);
      item.otHours200 += (emp.totalRate200Hours || 0);
      item.totalAbsentDays += (emp.absentDaysCount || 0);
      item.employees.push(emp);
    });

    const list = Array.from(lineMap.values()).map((l) => {
      const avgOtHoursPerWorker = l.workerCount > 0 ? l.totalOtHours / l.workerCount : 0;
      const avgAbsenteeism = l.workerCount > 0 ? l.totalAbsentDays / l.workerCount : 0;
      const otBudgetShare = factoryTotals.totalOtPay > 0 ? (l.totalOtCost / factoryTotals.totalOtPay) * 100 : 0;

      // Smart Root-Cause Diagnostic Logic:
      let rootCause = 'Standard overtime within Tier 1 (up to 2 hours at 1.35x)';
      let recommendation = 'Continue routine monitoring and verify departures after 5:00 PM';
      let severity: 'high' | 'medium' | 'normal' = 'normal';

      if (l.totalOtHours > 0) {
        const doubleTimeRatio = l.otHours200 / l.totalOtHours;
        const tier2Ratio = l.otHours170 / l.totalOtHours;

        if (doubleTimeRatio >= 0.25) {
          severity = 'high';
          rootCause = 'High weekend/holiday hours (2.0x Double Time) to expedite urgent deliveries';
          recommendation = 'Reschedule production orders to minimize expensive 2.0x weekend hours and distribute workloads to weekdays';
        } else if (tier2Ratio >= 0.35) {
          severity = 'high';
          rootCause = 'Extended overtime beyond 2 hours/day into 1.70x night tier (departures past 7:30 PM)';
          recommendation = 'Cap daily overtime at 2 hours to avoid 1.70x tier and consider staggered relief shifts';
        } else if (avgAbsenteeism >= 2.0) {
          severity = 'medium';
          rootCause = 'Elevated worker absenteeism requiring remaining team to work compensatory overtime';
          recommendation = 'Reinforce attendance incentive programs and address absenteeism drivers to reduce overtime costs';
        } else if (avgOtHoursPerWorker >= 30) {
          severity = 'medium';
          rootCause = 'High overtime intensity per worker exceeding factory benchmark';
          recommendation = 'Reinforce line with temporary labor to reduce worker fatigue and overtime budget exposure';
        }
      }

      return {
        line: l.line,
        department: l.department,
        workerCount: l.workerCount,
        totalOtHours: Number(l.totalOtHours.toFixed(2)),
        totalOtCost: Number(l.totalOtCost.toFixed(2)),
        otHours135: Number(l.otHours135.toFixed(2)),
        otHours170: Number(l.otHours170.toFixed(2)),
        otHours200: Number(l.otHours200.toFixed(2)),
        avgOtHoursPerWorker: Number(avgOtHoursPerWorker.toFixed(1)),
        avgAbsenteeism: Number(avgAbsenteeism.toFixed(1)),
        otBudgetShare: Number(otBudgetShare.toFixed(1)),
        rootCause,
        recommendation,
        severity,
        employees: l.employees
      };
    });

    return list.sort((a, b) => b.totalOtCost - a.totalOtCost);
  }, [employees, factoryTotals.totalOtPay]);

  // Top Consuming Line & Top Consuming Dept
  const topConsumingLine = lineStats.length > 0 ? lineStats[0] : null;
  const topConsumingDept = departmentStats.length > 0 ? departmentStats[0] : null;

  // 3. Daily Attendance & Labor Shortage Timeline
  const dailyShortageStats = useMemo(() => {
    // If department filter is active, only consider punches of matching employees
    const targetEmpCodes = new Set(
      selectedDeptFilter === 'ALL'
        ? employees.map((e) => e.code)
        : employees.filter((e) => e.department === selectedDeptFilter).map((e) => e.code)
    );

    const relevantPunches = allPunches.filter((p) => targetEmpCodes.has(p.code));

    const dayPunchMap = new Map<string, BiometricPunchRecord[]>();
    relevantPunches.forEach((p) => {
      if (!dayPunchMap.has(p.date)) dayPunchMap.set(p.date, []);
      dayPunchMap.get(p.date)!.push(p);
    });

    const activeTotalWorkers = targetEmpCodes.size;

    return allDates.map((dateStr) => {
      const dayPunches = dayPunchMap.get(dateStr) || [];
      const firstPunch = dayPunches[0];
      const isFriday = firstPunch ? firstPunch.isFriday : false;
      const isHoliday = Boolean(
        (firstPunch && firstPunch.isOfficialHoliday) ||
        (officialHolidays && officialHolidays.includes(dateStr))
      );
      const dayName = firstPunch ? firstPunch.weekDay : 'Day';

      let presentCount = 0;
      let absentCount = 0;
      let dayOtHours = 0;

      dayPunches.forEach((p) => {
        if (p.status === 'P') presentCount++;
        else if (p.status === 'A') absentCount++;
        dayOtHours += p.otHours || 0;
      });

      const scheduledCount = presentCount + absentCount;
      const totalWorkersForDay = scheduledCount > 0 ? scheduledCount : activeTotalWorkers;
      const attendanceRate = totalWorkersForDay > 0 ? (presentCount / totalWorkersForDay) * 100 : 0;
      const absenteeismRate = totalWorkersForDay > 0 ? (absentCount / totalWorkersForDay) * 100 : 0;

      let shortageLevel: 'normal' | 'moderate' | 'critical' | 'holiday' = 'normal';
      let shortageLabel = 'Stable & Fully Staffed (Normal)';

      if (isFriday) {
        shortageLevel = 'holiday';
        shortageLabel = presentCount > 0 ? `Friday Weekend Shift (${presentCount} workers)` : 'Weekly Rest Day';
      } else if (isHoliday) {
        shortageLevel = 'holiday';
        shortageLabel = 'Official Paid Public Holiday';
      } else if (absenteeismRate >= 20 || absentCount >= Math.max(2, Math.ceil(totalWorkersForDay * 0.2))) {
        shortageLevel = 'critical';
        shortageLabel = `Severe Labor Shortage (${absenteeismRate.toFixed(0)}% absent)`;
      } else if (absenteeismRate >= 10) {
        shortageLevel = 'moderate';
        shortageLabel = `Moderate Shortage (${absenteeismRate.toFixed(0)}% absent)`;
      }

      return {
        date: dateStr,
        dayName,
        isFriday,
        isHoliday,
        scheduledCount: totalWorkersForDay,
        presentCount,
        absentCount,
        attendanceRate: Number(attendanceRate.toFixed(1)),
        absenteeismRate: Number(absenteeismRate.toFixed(1)),
        totalOtHours: Number(dayOtHours.toFixed(2)),
        shortageLevel,
        shortageLabel
      };
    });
  }, [allDates, allPunches, employees, selectedDeptFilter, officialHolidays]);

  // Overall attendance statistics
  const attendanceOverall = useMemo(() => {
    const regularWorkdays = dailyShortageStats.filter((d) => !d.isFriday && !d.isHoliday);
    if (regularWorkdays.length === 0) return { avgAttendanceRate: 100, avgAbsenteeismRate: 0, criticalShortageDays: 0 };

    const sumAttendance = regularWorkdays.reduce((acc, d) => acc + d.attendanceRate, 0);
    const sumAbsenteeism = regularWorkdays.reduce((acc, d) => acc + d.absenteeismRate, 0);
    const criticalDays = regularWorkdays.filter((d) => d.shortageLevel === 'critical').length;

    return {
      avgAttendanceRate: Number((sumAttendance / regularWorkdays.length).toFixed(1)),
      avgAbsenteeismRate: Number((sumAbsenteeism / regularWorkdays.length).toFixed(1)),
      criticalShortageDays: criticalDays
    };
  }, [dailyShortageStats]);

  // Handle Excel Export of full analytics report
  const handleExportAnalyticsExcel = () => {
    exportProductionCostAnalyticsExcel(
      departmentStats,
      lineStats,
      dailyShortageStats,
      `Eroglu_Factory_Production_Analytics_${new Date().toISOString().split('T')[0]}`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 text-left">
      
      {/* Executive Header & Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden no-print">
        <div className="p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  PRODUCTION COST & OVERTIME ANALYTICS
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Executive cost benchmarking across departments (Finishing, Sewing, Cutting, Quality), line consumption drivers, and daily labor shortages
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Print executive analytics report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print Report</span>
            </button>

            <button
              onClick={handleExportAnalyticsExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export complete analytics workbook with Department, Line, and Shortage sheets"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Analytics Excel</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs & Department Filter */}
        <div className="p-3 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-slate-200/80 border border-slate-300 rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Executive Overview </span>
            </button>

            <button
              onClick={() => setActiveSubTab('departments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'departments'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Department Cost Benchmark</span>
            </button>

            <button
              onClick={() => setActiveSubTab('lines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'lines'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Production Lines & Root Causes </span>
            </button>

            <button
              onClick={() => setActiveSubTab('dailyShortage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'dailyShortage'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Daily Labor Shortage Index </span>
            </button>
          </div>

          {/* Department Quick Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600 font-bold">Filter Dept:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Departments </option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Overtime Spend */}
        <div className="p-3.5 rounded-2xl bg-white border border-amber-300 shadow-xs">
          <div className="text-[11px] text-amber-800 font-bold mb-1 flex items-center justify-between">
            <span>Total OT Spend</span>
            <Coins className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {factoryTotals.totalOtPay.toLocaleString()} <span className="text-xs font-sans text-amber-600 font-normal">EGP</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1 font-medium">
            {factoryTotals.otToPayrollRatio}% of total payroll
          </div>
        </div>

        {/* Total OT Hours */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-600 font-bold mb-1 flex items-center justify-between">
            <span>Total OT Hours</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-800 font-mono">
            {factoryTotals.totalOtHours} <span className="text-xs font-sans text-slate-500 font-normal">hrs</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Avg {factoryTotals.avgOtHoursPerWorker}h per worker
          </div>
        </div>

        {/* Top Spending Department */}
        <div className="p-3.5 rounded-2xl bg-white border border-rose-300 shadow-xs">
          <div className="text-[11px] text-rose-800 font-bold mb-1 flex items-center justify-between">
            <span>Top Consuming Dept</span>
            <Flame className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-base font-black text-rose-700 truncate" title={topConsumingDept?.department || 'N/A'}>
            {topConsumingDept ? topConsumingDept.department : 'N/A'}
          </div>
          <div className="text-[10px] text-rose-600 mt-1 font-mono font-bold">
            {topConsumingDept ? `${topConsumingDept.totalOtCost.toLocaleString()} EGP (${topConsumingDept.otBudgetShare}%)` : '0 EGP'}
          </div>
        </div>

        {/* Top Spending Production Line */}
        <div className="p-3.5 rounded-2xl bg-white border border-orange-300 shadow-xs">
          <div className="text-[11px] text-orange-800 font-bold mb-1 flex items-center justify-between">
            <span>Top Consuming Line</span>
            <Award className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-base font-black text-orange-700 truncate" title={topConsumingLine?.line || 'N/A'}>
            {topConsumingLine ? topConsumingLine.line : 'N/A'}
          </div>
          <div className="text-[10px] text-orange-600 mt-1 font-mono font-bold">
            {topConsumingLine ? `${topConsumingLine.totalOtCost.toLocaleString()} EGP (${topConsumingLine.otBudgetShare}%)` : '0 EGP'}
          </div>
        </div>

        {/* Factory Attendance Index */}
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-300 shadow-xs">
          <div className="text-[11px] text-emerald-800 font-bold mb-1 flex items-center justify-between">
            <span>Attendance Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {attendanceOverall.avgAttendanceRate}%
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">
            Absenteeism: {attendanceOverall.avgAbsenteeismRate}%
          </div>
        </div>

        {/* Critical Shortage Days */}
        <div className="p-3.5 rounded-2xl bg-white border border-purple-300 shadow-xs">
          <div className="text-[11px] text-purple-800 font-bold mb-1 flex items-center justify-between">
            <span>Labor Shortage Days</span>
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-800 font-mono">
            {attendanceOverall.criticalShortageDays} <span className="text-xs font-sans text-purple-600 font-normal">days</span>
          </div>
          <div className="text-[10px] text-purple-600 mt-1">
            Overtime surge triggers
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: EXECUTIVE OVERVIEW */}
      {/* ======================================================== */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Overtime Tiers Cost & Hours Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Overtime Tiers Payroll Burden</h3>
                <p className="text-xs text-slate-500 mt-0.5">Analysis across 1.35x (Day), 1.70x (Night), and 2.0x (Friday Double Time)</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                Total: {factoryTotals.totalOtHours}h
              </div>
            </div>

            <div className="space-y-4">
              {/* 1.35x Tier */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-sky-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    Tier 1 (1.35x Day Overtime)
                  </span>
                  <span className="font-mono text-slate-900">
                    {factoryTotals.total135} hrs ({factoryTotals.totalOtHours > 0 ? ((factoryTotals.total135 / factoryTotals.totalOtHours) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${factoryTotals.totalOtHours > 0 ? (factoryTotals.total135 / factoryTotals.totalOtHours) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>Standard 2 hours OT shift after 5:00 PM</span>
                  <span className="font-semibold text-slate-700">Estimated Pay: {employees.reduce((s, e) => s + (e.otAmount135 || 0), 0).toLocaleString()} EGP</span>
                </div>
              </div>

              {/* 1.70x Tier */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-orange-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    Tier 2 (1.70x Extended & Night Overtime)
                  </span>
                  <span className="font-mono text-slate-900">
                    {factoryTotals.total170} hrs ({factoryTotals.totalOtHours > 0 ? ((factoryTotals.total170 / factoryTotals.totalOtHours) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${factoryTotals.totalOtHours > 0 ? (factoryTotals.total170 / factoryTotals.totalOtHours) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>Extended shifts beyond 2 hours OT & night hours</span>
                  <span className="font-semibold text-slate-700">Estimated Pay: {employees.reduce((s, e) => s + (e.otAmount170 || 0), 0).toLocaleString()} EGP</span>
                </div>
              </div>

              {/* 2.0x Tier */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-indigo-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    Double Time (2.0x Friday & Public Holiday 2x)
                  </span>
                  <span className="font-mono text-slate-900">
                    {factoryTotals.total200} hrs ({factoryTotals.totalOtHours > 0 ? ((factoryTotals.total200 / factoryTotals.totalOtHours) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${factoryTotals.totalOtHours > 0 ? (factoryTotals.total200 / factoryTotals.totalOtHours) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>Urgent weekend export shipments & holiday shifts</span>
                  <span className="font-semibold text-slate-700">Estimated Pay: {employees.reduce((s, e) => s + (e.otAmount200 || 0), 0).toLocaleString()} EGP</span>
                </div>
              </div>

            </div>
          </div>

          {/* Department Overtime Spending Share Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Department Overtime Budget Share </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Comparing overtime cost consumption across manufacturing units</p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {departmentStats.length} Departments
                </span>
              </div>

              <div className="space-y-3">
                {departmentStats.map((dept, idx) => (
                  <div key={dept.department} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">#{idx + 1}</span>
                        <span>{dept.department}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({dept.workerCount} workers)</span>
                      </span>
                      <span className="font-mono text-slate-900">
                        {dept.totalOtCost.toLocaleString()} EGP <span className="text-amber-600 font-bold font-sans">({dept.otBudgetShare}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-sky-500' : idx === 2 ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, dept.otBudgetShare))}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>Total OT: {dept.totalOtHours} hrs</span>
                      <span>Avg/Worker: {dept.avgOtCostPerWorker.toLocaleString()} EGP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Factory Total Overtime Payroll:</span>
              <span className="font-black font-mono text-slate-900 text-sm">{factoryTotals.totalOtPay.toLocaleString()} EGP</span>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DEPARTMENT COST BENCHMARK */}
      {/* ======================================================== */}
      {activeSubTab === 'departments' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">Department Cost Comparison</h3>
              <p className="text-xs text-slate-500 mt-0.5">Detailed breakdown of worker count, base wages, overtime tiers (1.35x, 1.70x, 2.0x), and cost averages</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total Payroll: {factoryTotals.totalGross.toLocaleString()} EGP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Department </th>
                  <th className="py-2.5 px-3 text-center">Workers</th>
                  <th className="py-2.5 px-3 text-right">Base Salary (EGP)</th>
                  <th className="py-2.5 px-3 text-right bg-amber-50/60 text-amber-900">Total OT Cost (EGP)</th>
                  <th className="py-2.5 px-3 text-right">Gross Payroll (EGP)</th>
                  <th className="py-2.5 px-3 text-center bg-amber-50/40">OT Share %</th>
                  <th className="py-2.5 px-3 text-right text-sky-700">1.35x (hrs)</th>
                  <th className="py-2.5 px-3 text-right text-orange-700">1.70x (hrs)</th>
                  <th className="py-2.5 px-3 text-right text-indigo-700 font-black">2.0x (hrs)</th>
                  <th className="py-2.5 px-3 text-right font-black">Total OT (hrs)</th>
                  <th className="py-2.5 px-3 text-right text-slate-800">Avg Cost/Worker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentStats.map((dept, idx) => (
                  <tr key={dept.department} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dept.department}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">{dept.workerCount}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{dept.totalBaseSalary.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 bg-amber-50/60">
                      +{dept.totalOtCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{dept.grossPayroll.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold bg-amber-50/40 text-amber-800">
                      {dept.otBudgetShare}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sky-700 font-bold">{dept.otHours135}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-orange-700 font-bold">{dept.otHours170}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-black">{dept.otHours200}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{dept.totalOtHours}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {dept.avgOtCostPerWorker.toLocaleString()} EGP
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-3">Factory Grand Total </td>
                  <td className="py-2.5 px-3 text-center font-mono">{factoryTotals.totalWorkers}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{factoryTotals.totalBase.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-black">+{factoryTotals.totalOtPay.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">{factoryTotals.totalGross.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center font-mono">100%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-800">{factoryTotals.total135}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-orange-800">{factoryTotals.total170}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-900">{factoryTotals.total200}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">{factoryTotals.totalOtHours}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">{factoryTotals.avgOtCostPerWorker.toLocaleString()} EGP</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: PRODUCTION LINES & ROOT-CAUSE ANALYSIS */}
      {/* ======================================================== */}
      {activeSubTab === 'lines' && (
        <div className="space-y-4">
          
          {/* Top Line Spotlight Hero Card */}
          {topConsumingLine && (
            <div className="p-5 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-slate-900/5 border-2 border-amber-400 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black shadow-sm">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300">
                        #1 HIGHEST OVERTIME CONSUMER
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                      <span>{topConsumingLine.line}</span>
                      <span className="text-xs font-semibold text-slate-500">({topConsumingLine.department})</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      This production line absorbed <strong className="text-amber-800 font-mono">{topConsumingLine.otBudgetShare}%</strong> of the entire factory overtime budget this month ({topConsumingLine.totalOtCost.toLocaleString()} EGP).
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 bg-white border border-amber-200 rounded-xl p-3 shadow-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Total Line OT</span>
                    <strong className="text-base font-black text-amber-700">{topConsumingLine.totalOtHours}h</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Overtime Spend</span>
                    <strong className="text-base font-black text-slate-900">{topConsumingLine.totalOtCost.toLocaleString()} EGP</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Avg/Worker</span>
                    <strong className="text-base font-black text-slate-700">{topConsumingLine.avgOtHoursPerWorker}h</strong>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Recommended Action */}
              <div className="mt-4 pt-4 border-t border-amber-200/80 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-rose-200">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Root-Cause Driver</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {topConsumingLine.rootCause}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Managerial Action Plan</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {topConsumingLine.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Complete Production Lines Comparative Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Production Lines Overtime Diagnostic Ranking</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ranked by total overtime expenditure with actionable causes and solutions</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">{lineStats.length} Lines Evaluated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Line Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Workers</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 font-black">OT Cost (EGP)</th>
                    <th className="py-2.5 px-3 text-right">OT Hours</th>
                    <th className="py-2.5 px-3 text-right">Avg h/Worker</th>
                    <th className="py-2.5 px-3">Primary Cause / Diagnosis</th>
                    <th className="py-2.5 px-3">Action / Solution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineStats.map((l, idx) => (
                    <tr key={l.line} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.line}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{l.department}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">{l.workerCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 bg-amber-50">
                        {l.totalOtCost.toLocaleString()} EGP <span className="text-[10px] text-amber-600 font-normal">({l.otBudgetShare}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{l.totalOtHours}h</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">{l.avgOtHoursPerWorker}h</td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-800">
                        <div className="flex items-start gap-1.5">
                          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                            l.severity === 'high' ? 'bg-rose-500' : l.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                          <span className="line-clamp-2 text-[11px] leading-tight font-medium">{l.rootCause}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-600">
                        <span className="line-clamp-2 text-[11px] leading-tight font-normal text-emerald-800">{l.recommendation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: DAILY ATTENDANCE & LABOR SHORTAGE */}
      {/* ======================================================== */}
      {activeSubTab === 'dailyShortage' && (
        <div className="space-y-4">
          
          {/* Daily Shortage Correlation Banner */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Daily Workforce Attendance & Overtime Surge Tracker</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring daily manpower deficits and their direct correlation with overtime spikes to fulfill production lines quotas
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Normal (&gt;90% present)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-slate-600">Moderate Shortage (10-20% absent)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="text-slate-900 font-bold">Critical Shortage (&gt;20% absent)</span>
              </div>
            </div>
          </div>

          {/* Daily Table of the Entire Month */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Month Attendance & Labor Balance Log ({dailyShortageStats.length} calendar days)</span>
              <span className="text-xs text-slate-500 font-mono">Avg Attendance: {attendanceOverall.avgAttendanceRate}%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Week Day</th>
                    <th className="py-2.5 px-3 text-center">Scheduled Staff</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700 font-bold">Present (P)</th>
                    <th className="py-2.5 px-3 text-center text-rose-700 font-bold">Absent (A)</th>
                    <th className="py-2.5 px-3 text-center font-bold">Attendance Rate</th>
                    <th className="py-2.5 px-3 w-40">Attendance Visual Bar</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50 font-black text-amber-900">Day OT Hours</th>
                    <th className="py-2.5 px-3">Labor Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyShortageStats.map((d) => {
                    const isAlert = d.shortageLevel === 'critical';
                    const isModerate = d.shortageLevel === 'moderate';
                    const isFri = d.isFriday;
                    const isHol = d.isHoliday;

                    return (
                      <tr 
                        key={d.date}
                        className={`transition-colors ${
                          isAlert 
                            ? 'bg-rose-50/50 hover:bg-rose-50' 
                            : isFri 
                            ? 'bg-slate-50/60 hover:bg-slate-100/60' 
                            : isHol
                            ? 'bg-indigo-50/50 hover:bg-indigo-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{d.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>{d.dayName}</span>
                          {isFri && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">Friday</span>
                          )}
                          {isHol && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">Holiday</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">{d.scheduledCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{d.presentCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">{d.absentCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          {isFri || isHol ? '-' : `${d.attendanceRate}%`}
                        </td>
                        <td className="py-2.5 px-3">
                          {!isFri && !isHol ? (
                            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  d.attendanceRate >= 90 ? 'bg-emerald-500' : d.attendanceRate >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, d.attendanceRate))}%` }}
                              ></div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">Weekend / Holiday</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 bg-amber-50">
                          {d.totalOtHours > 0 ? `+${d.totalOtHours}h` : '0h'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            isAlert 
                              ? 'text-rose-700 font-bold' 
                              : isModerate 
                              ? 'text-amber-700 font-bold' 
                              : isFri || isHol
                              ? 'text-slate-500'
                              : 'text-emerald-700'
                          }`}>
                            {isAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                            <span>{d.shortageLabel}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
