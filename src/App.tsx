import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  Calendar, 
  Download, 
  Upload, 
  Sparkles, 
  Fingerprint, 
  Layers, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Building,
  Table as TableIcon,
  LayoutGrid,
  Printer,
  Coins,
  Activity,
  Building2,
  ArrowRightLeft
} from 'lucide-react';

import { RawDailyRecord, EmployeeOvertimeSummary } from './types/overtime';
import { BiometricMonthlyDataset, BiometricEmployeeMonthlySummary } from './types/biometric';
import { processSimpleOvertime, getSampleSimpleOvertimeData } from './utils/simpleOvertimeEngine';
import { getSampleBiometricData } from './utils/biometricSampleData';
import { exportMatrixOvertimeExcel } from './utils/simpleExcelExport';
import { exportBiometricPunchesExcel, exportProductionCostAnalyticsExcel } from './utils/biometricExcelExport';
import { recomputeBiometricDataset, calculateSalaryAndOvertime } from './utils/biometricParser';

import { SimpleTableView } from './components/SimpleTableView';
import { DetailedEmployeeReportModal } from './components/DetailedEmployeeReportModal';
import { BiometricTableView } from './components/BiometricTableView';
import { BiometricPaperReconcileView } from './components/BiometricPaperReconcileView';
import { ProductionCostAnalytics } from './components/ProductionCostAnalytics';
import { OfficialAttendanceSlip } from './components/OfficialAttendanceSlip';
import { SimpleUploaderModal } from './components/SimpleUploaderModal';
import { OfficialHolidaysModal } from './components/OfficialHolidaysModal';
import { ErogluLogo } from './components/ErogluLogo';

const LOCAL_STORAGE_KEY_DAILY = 'simple_overtime_data_en_v4';
const LOCAL_STORAGE_KEY_BIOMETRIC = 'biometric_overtime_data_v1';
const LOCAL_STORAGE_KEY_HOLIDAYS = 'biometric_official_holidays_v1';
const LOCAL_STORAGE_KEY_BASE_SALARY = 'biometric_base_salary_v1';
const LOCAL_STORAGE_KEY_EMP_SALARIES = 'biometric_emp_salaries_v1';

const EMPTY_BIOMETRIC_DATA: BiometricMonthlyDataset = {
  allDates: [],
  employees: [],
  allPunches: [],
  grandTotalWorkedHours: 0,
  grandTotalOtHours: 0,
  grandTotal135Hours: 0,
  grandTotal170Hours: 0,
  grandTotal200Hours: 0
};

export default function App() {
  // Mode selection: 'biometric' | 'reconcile' | 'analytics' | 'daily'
  const [activeSuiteMode, setActiveSuiteMode] = useState<'biometric' | 'reconcile' | 'analytics' | 'daily'>('biometric');

  // Biometric state - Starts empty ready for user sheet
  const [biometricData, setBiometricData] = useState<BiometricMonthlyDataset>(EMPTY_BIOMETRIC_DATA);
  const [selectedBioEmployee, setSelectedBioEmployee] = useState<BiometricEmployeeMonthlySummary | null>(null);

  // Official Holidays & Salary state
  const [officialHolidays, setOfficialHolidays] = useState<string[]>([]);
  const [defaultBaseSalary, setDefaultBaseSalary] = useState<number>(0);
  const [employeeSalaries, setEmployeeSalaries] = useState<Record<string, number>>({});
  const [isOfficialHolidaysModalOpen, setIsOfficialHolidaysModalOpen] = useState(false);

  // Daily OT state - Starts empty ready for user sheets
  const [records, setRecords] = useState<RawDailyRecord[]>([]);
  const [masterList, setMasterList] = useState<Record<string, { name: string; department: string }>>({});
  const [selectedDailyEmployee, setSelectedDailyEmployee] = useState<EmployeeOvertimeSummary | null>(null);

  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Load saved state only if user previously saved their own dataset (not sample data)
  useEffect(() => {
    try {
      let loadedHolidays: string[] = [];
      const savedHolidays = localStorage.getItem(LOCAL_STORAGE_KEY_HOLIDAYS);
      if (savedHolidays) {
        loadedHolidays = JSON.parse(savedHolidays);
        setOfficialHolidays(loadedHolidays);
      }
      let loadedBaseSalary = 0;
      const savedBaseSalary = localStorage.getItem(LOCAL_STORAGE_KEY_BASE_SALARY);
      if (savedBaseSalary !== null) {
        const parsedSalary = Number(savedBaseSalary);
        if (parsedSalary === 6000) {
          loadedBaseSalary = 0;
          setDefaultBaseSalary(0);
          localStorage.setItem(LOCAL_STORAGE_KEY_BASE_SALARY, '0');
        } else {
          loadedBaseSalary = parsedSalary || 0;
          setDefaultBaseSalary(loadedBaseSalary);
        }
      }
      let cleanEmpSalaries: Record<string, number> = {};
      const savedEmpSalaries = localStorage.getItem(LOCAL_STORAGE_KEY_EMP_SALARIES);
      if (savedEmpSalaries) {
        try {
          const parsed = JSON.parse(savedEmpSalaries);
          for (const [k, v] of Object.entries(parsed)) {
            if (v && Number(v) !== 6000) {
              cleanEmpSalaries[k] = Number(v);
            }
          }
          setEmployeeSalaries(cleanEmpSalaries);
        } catch (e) {
          console.error(e);
        }
      }

      const savedBio = localStorage.getItem(LOCAL_STORAGE_KEY_BIOMETRIC);
      if (savedBio) {
        const parsed = JSON.parse(savedBio);
        const isSample = parsed.employees?.some((e: any) => e.code === '3935' || e.code === '3936');
        if (parsed.employees && parsed.employees.length > 0 && !isSample) {
          const recomputed = recomputeBiometricDataset(
            parsed,
            loadedHolidays,
            cleanEmpSalaries,
            loadedBaseSalary
          );
          setBiometricData(recomputed);
        } else if (isSample) {
          localStorage.removeItem(LOCAL_STORAGE_KEY_BIOMETRIC);
        }
      }
    } catch (e) {
      console.error('Failed to load biometric data', e);
    }

    try {
      const savedDaily = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY);
      if (savedDaily) {
        const parsed = JSON.parse(savedDaily);
        const isSampleDaily = parsed.records?.some((r: any) => r.code === '101' && r.name === 'Ahmed Ibrahim');
        if (parsed.records && parsed.records.length > 0 && !isSampleDaily) {
          setRecords(parsed.records);
          if (parsed.masterList) setMasterList(parsed.masterList);
          return;
        } else if (isSampleDaily) {
          localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY);
        }
      }
    } catch (e) {
      console.error('Failed to load daily data', e);
    }
  }, []);

  // Save changes safely with debounce to eliminate typing lag
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (biometricData.employees.length > 0 && biometricData.allPunches.length < 400) {
          localStorage.setItem(LOCAL_STORAGE_KEY_BIOMETRIC, JSON.stringify(biometricData));
        }
      } catch (e) {
        console.warn('LocalStorage limit exceeded for biometric data, keeping in memory', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [biometricData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_HOLIDAYS, JSON.stringify(officialHolidays));
        localStorage.setItem(LOCAL_STORAGE_KEY_BASE_SALARY, String(defaultBaseSalary));
        localStorage.setItem(LOCAL_STORAGE_KEY_EMP_SALARIES, JSON.stringify(employeeSalaries));
      } catch (e) {
        console.warn('LocalStorage error saving preferences', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [officialHolidays, defaultBaseSalary, employeeSalaries]);

  useEffect(() => {
    try {
      if (records.length > 0 && records.length < 800) {
        localStorage.setItem(LOCAL_STORAGE_KEY_DAILY, JSON.stringify({ records, masterList }));
      }
    } catch (e) {
      console.warn('LocalStorage limit exceeded for daily records, keeping in memory', e);
    }
  }, [records, masterList]);

  // Process Daily dataset
  const dailyDataset = useMemo(() => {
    return processSimpleOvertime(records, masterList);
  }, [records, masterList]);

  const handleLoadBiometricSample = () => {
    const sample = getSampleBiometricData();
    setBiometricData(sample);
  };

  const handleLoadDailySample = () => {
    const sample = getSampleSimpleOvertimeData();
    setRecords(sample.records);
    setMasterList(sample.masterList);
  };

  const handleClearCurrent = () => {
    if (window.confirm('Do you want to reset current data and upload fresh files?')) {
      if (activeSuiteMode === 'biometric') {
        const empty: BiometricMonthlyDataset = {
          allDates: [],
          employees: [],
          allPunches: [],
          grandTotalWorkedHours: 0,
          grandTotalOtHours: 0,
          grandTotal135Hours: 0,
          grandTotal170Hours: 0,
          grandTotal200Hours: 0
        };
        setBiometricData(empty);
        setSelectedBioEmployee(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY_BIOMETRIC);
      } else {
        setRecords([]);
        setMasterList({});
        setSelectedDailyEmployee(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY_DAILY);
      }
    }
  };

  const handleFilesProcessed = (
    newRecords: RawDailyRecord[],
    newMaster: Record<string, { name: string; department: string }>
  ) => {
    setRecords(newRecords);
    if (Object.keys(newMaster).length > 0) {
      setMasterList(newMaster);
    }
    setActiveSuiteMode('daily');
  };

  const handleUpdateDefaultSalary = (newSalary: number) => {
    const safeSalary = Math.max(0, Number(newSalary) || 0);
    setDefaultBaseSalary(safeSalary);

    setBiometricData((prev) => {
      if (!prev.employees || prev.employees.length === 0) return prev;
      
      let grandBase = 0;
      let grandOtPay = 0;
      let grandGross = 0;

      const updatedEmps = prev.employees.map((emp) => {
        const empBase = employeeSalaries[emp.code] !== undefined ? employeeSalaries[emp.code] : safeSalary;
        const s = calculateSalaryAndOvertime(
          empBase,
          emp.totalRate135Hours,
          emp.totalRate170Hours,
          emp.totalRate200Hours
        );
        grandBase += s.baseSalary;
        grandOtPay += s.totalOtAmount;
        grandGross += s.grossSalary;
        return {
          ...emp,
          baseSalary: s.baseSalary,
          hourlyRate: s.hourlyRate,
          otAmount135: s.otAmount135,
          otAmount170: s.otAmount170,
          otAmount200: s.otAmount200,
          totalOtAmount: s.totalOtAmount,
          grossSalary: s.grossSalary
        };
      });

      return {
        ...prev,
        employees: updatedEmps,
        grandTotalBaseSalary: Number(grandBase.toFixed(2)),
        grandTotalOtPay: Number(grandOtPay.toFixed(2)),
        grandTotalGrossSalary: Number(grandGross.toFixed(2))
      };
    });

    if (selectedBioEmployee) {
      const empBase = employeeSalaries[selectedBioEmployee.code] !== undefined
        ? employeeSalaries[selectedBioEmployee.code]
        : safeSalary;
      const s = calculateSalaryAndOvertime(
        empBase,
        selectedBioEmployee.totalRate135Hours,
        selectedBioEmployee.totalRate170Hours,
        selectedBioEmployee.totalRate200Hours
      );
      setSelectedBioEmployee((prev) => prev ? {
        ...prev,
        baseSalary: s.baseSalary,
        hourlyRate: s.hourlyRate,
        otAmount135: s.otAmount135,
        otAmount170: s.otAmount170,
        otAmount200: s.otAmount200,
        totalOtAmount: s.totalOtAmount,
        grossSalary: s.grossSalary
      } : null);
    }
  };

  const handleUpdateEmployeeSalary = (code: string, newSalary: number) => {
    const safeSalary = Math.max(0, Number(newSalary) || 0);
    setEmployeeSalaries((prev) => ({ ...prev, [code]: safeSalary }));

    setBiometricData((prev) => {
      if (!prev.employees || prev.employees.length === 0) return prev;
      
      let grandBase = 0;
      let grandOtPay = 0;
      let grandGross = 0;

      const updatedEmps = prev.employees.map((emp) => {
        if (emp.code === code) {
          const s = calculateSalaryAndOvertime(
            safeSalary,
            emp.totalRate135Hours,
            emp.totalRate170Hours,
            emp.totalRate200Hours
          );
          grandBase += s.baseSalary;
          grandOtPay += s.totalOtAmount;
          grandGross += s.grossSalary;
          return {
            ...emp,
            baseSalary: s.baseSalary,
            hourlyRate: s.hourlyRate,
            otAmount135: s.otAmount135,
            otAmount170: s.otAmount170,
            otAmount200: s.otAmount200,
            totalOtAmount: s.totalOtAmount,
            grossSalary: s.grossSalary
          };
        }
        grandBase += (emp.baseSalary || 0);
        grandOtPay += (emp.totalOtAmount || 0);
        grandGross += (emp.grossSalary || 0);
        return emp;
      });

      return {
        ...prev,
        employees: updatedEmps,
        grandTotalBaseSalary: Number(grandBase.toFixed(2)),
        grandTotalOtPay: Number(grandOtPay.toFixed(2)),
        grandTotalGrossSalary: Number(grandGross.toFixed(2))
      };
    });

    setSelectedBioEmployee((prev) => {
      if (prev && prev.code === code) {
        const s = calculateSalaryAndOvertime(
          safeSalary,
          prev.totalRate135Hours,
          prev.totalRate170Hours,
          prev.totalRate200Hours
        );
        return {
          ...prev,
          baseSalary: s.baseSalary,
          hourlyRate: s.hourlyRate,
          otAmount135: s.otAmount135,
          otAmount170: s.otAmount170,
          otAmount200: s.otAmount200,
          totalOtAmount: s.totalOtAmount,
          grossSalary: s.grossSalary
        };
      }
      return prev;
    });
  };

  const handleApplyHolidays = (newHolidays: string[]) => {
    setOfficialHolidays(newHolidays);
    if (biometricData.employees.length > 0) {
      const recomputed = recomputeBiometricDataset(
        biometricData,
        newHolidays,
        employeeSalaries,
        defaultBaseSalary
      );
      setBiometricData(recomputed);
      if (selectedBioEmployee) {
        const found = recomputed.employees.find((e) => e.code === selectedBioEmployee.code);
        if (found) setSelectedBioEmployee(found);
      }
    }
  };

  const handleBiometricProcessed = (
    dataset: BiometricMonthlyDataset,
    holidays: string[] = [],
    baseSalary: number = 0
  ) => {
    setOfficialHolidays(holidays);
    setDefaultBaseSalary(baseSalary);
    setBiometricData(dataset);
    setActiveSuiteMode('biometric');
  };

  const handleExportAll = () => {
    if (activeSuiteMode === 'biometric' || activeSuiteMode === 'analytics' || activeSuiteMode === 'reconcile') {
      exportBiometricPunchesExcel(biometricData.allPunches, biometricData.employees);
    } else {
      exportMatrixOvertimeExcel(dailyDataset.employees, dailyDataset.allDates);
    }
  };

  return (
    <div dir="ltr" className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 text-left">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 no-print shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Title & Brand with Official Eroglu Logo */}
            <div className="flex items-center gap-4">
              <ErogluLogo size="lg" className="shrink-0" />
              <div className="h-9 w-px bg-slate-200 hidden sm:block"></div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>HR DASHBOARD</span>
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Sheet</span>
              </button>

              {/* Official Paid Holidays Button */}
              {activeSuiteMode === 'biometric' && (
                <button
                  onClick={() => setIsOfficialHolidaysModalOpen(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                    officialHolidays.length > 0
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title="Designate Official Paid Public Holidays (2.0x Double Time / Paid Attendance)"
                >
                  <Calendar className={`w-4 h-4 ${officialHolidays.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>Official Holidays</span>
                  {officialHolidays.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                      {officialHolidays.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={activeSuiteMode === 'biometric' ? handleLoadBiometricSample : handleLoadDailySample}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer shadow-xs"
                title="Load sample data"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Sample Data</span>
              </button>

              <button
                onClick={handleExportAll}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Export current table to Excel (.xlsx)"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={handleClearCurrent}
                className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-300 transition-all cursor-pointer shadow-xs"
                title="Reset current dataset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Suite Mode Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 no-print shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSuiteMode('biometric')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSuiteMode === 'biometric'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>Monthly Biometric Audit (In/Out, 8h, 1.35x, 1.70x, Friday 2x)</span>
            </button>

            <button
              onClick={() => setActiveSuiteMode('reconcile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSuiteMode === 'reconcile'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-slate-900" />
              <span>Biometric vs Paper Overtime Audit</span>
            </button>

            <button
              onClick={() => setActiveSuiteMode('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSuiteMode === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4 text-slate-900" />
              <span>Production Cost Analytics</span>
            </button>

            <button
              onClick={() => setActiveSuiteMode('daily')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSuiteMode === 'daily'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Daily Overtime Sheets (Dates from Filenames)</span>
            </button>

            {(activeSuiteMode === 'biometric' || activeSuiteMode === 'analytics') && biometricData.employees.length > 0 && (
              <button
                onClick={() => setSelectedBioEmployee(biometricData.employees[0])}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-amber-600" />
                <span>Preview Form Slip ({biometricData.employees[0].name})</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {activeSuiteMode === 'biometric' || activeSuiteMode === 'reconcile' || activeSuiteMode === 'analytics'
              ? `${biometricData.allPunches.length} punch records • ${biometricData.employees.length} employees`
              : `${dailyDataset.employees.length} employees • ${dailyDataset.allDates.length} days`}
          </div>

        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4 space-y-4 no-print">
        
        {activeSuiteMode === 'biometric' ? (
          /* ======================================================== */
          /* MODE 1: MONTHLY BIOMETRIC AUDIT (In/Out, 8h, 1.35x, 1.70x, Friday 2x) */
          /* ======================================================== */
          <>
            {/* Live Salary & Overtime Quick Calculator Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex items-center justify-between flex-wrap gap-4 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">Monthly Base Salary:</span>
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={defaultBaseSalary}
                        onChange={(e) => handleUpdateDefaultSalary(Number(e.target.value) || 0)}
                        className="w-24 bg-transparent text-amber-400 font-mono font-bold text-sm focus:outline-none text-right"
                      />
                      <span className="text-xs text-slate-400 ml-1.5 font-semibold">EGP</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Labor divisor: 240 hrs • Hourly rate: <strong className="text-slate-200">{(defaultBaseSalary / 240).toFixed(2)} EGP/h</strong> • Computes 1.35x, 1.70x, and Friday/Holiday 2x Double Time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <div className="text-slate-400 font-sans text-[11px]">Total Overtime Pay</div>
                  <div className="text-lg font-black text-amber-400">
                    +{biometricData.grandTotalOtPay ? biometricData.grandTotalOtPay.toLocaleString() : 0} EGP
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
                <div>
                  <div className="text-slate-400 font-sans text-[11px]">Total Payroll</div>
                  <div className="text-lg font-black text-emerald-400">
                    {biometricData.grandTotalGrossSalary ? biometricData.grandTotalGrossSalary.toLocaleString() : (defaultBaseSalary * (biometricData.employees.length || 1)).toLocaleString()} EGP
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards for Biometric */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
              
              {/* Total Overtime */}
              <div className="p-4 rounded-2xl bg-white border border-amber-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-semibold block mb-0.5">Total Overtime (OT &gt;8h)</span>
                  <div className="text-2xl font-black text-amber-700 font-mono">
                    {biometricData.grandTotalOtHours} <span className="text-xs font-normal text-amber-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              {/* 1.35x Tier */}
              <div className="p-4 rounded-2xl bg-white border border-sky-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-800 font-semibold block mb-0.5">1.35x Tier (≤2h OT)</span>
                  <div className="text-2xl font-black text-sky-700 font-mono">
                    {biometricData.grandTotal135Hours} <span className="text-xs font-normal text-sky-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 font-bold font-mono border border-sky-200">
                  1.35x
                </div>
              </div>

              {/* 1.70x Tier */}
              <div className="p-4 rounded-2xl bg-white border border-orange-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-orange-800 font-semibold block mb-0.5">1.70x Tier (&gt;10h Total)</span>
                  <div className="text-2xl font-black text-orange-700 font-mono">
                    {biometricData.grandTotal170Hours} <span className="text-xs font-normal text-orange-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-700 font-bold font-mono border border-orange-200">
                  1.70x
                </div>
              </div>

              {/* 2.0x Friday Tier */}
              <div className="p-4 rounded-2xl bg-white border border-indigo-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-900 font-black block mb-0.5">2.0x Friday (Double Time)</span>
                  <div className="text-2xl font-black text-indigo-800 font-mono">
                    {biometricData.grandTotal200Hours} <span className="text-xs font-normal text-indigo-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-900 font-black font-mono border border-indigo-200">
                  2.0x
                </div>
              </div>

              {/* Total Worked */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block mb-0.5">Total Worked Hours</span>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {biometricData.grandTotalWorkedHours} <span className="text-xs font-normal text-slate-500 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Biometric Table View (Always displayed directly as an empty table ready for upload) */}
            <BiometricTableView
              punches={biometricData.allPunches}
              employees={biometricData.employees}
              onSelectEmployee={(emp) => setSelectedBioEmployee(emp)}
              officialHolidays={officialHolidays}
              onOpenOfficialHolidays={() => setIsOfficialHolidaysModalOpen(true)}
              defaultBaseSalary={defaultBaseSalary}
              onUpdateDefaultSalary={handleUpdateDefaultSalary}
              onUpdateEmployeeSalary={handleUpdateEmployeeSalary}
              onOpenAnalytics={() => setActiveSuiteMode('analytics')}
            />
          </>
        ) : activeSuiteMode === 'reconcile' ? (
          /* ======================================================== */
          /* MODE 2: BIOMETRIC VS PAPER RECONCILIATION & CROSS-AUDIT */
          /* ======================================================== */
          <BiometricPaperReconcileView
            biometricData={biometricData}
            onOpenBiometricUploader={() => setIsUploaderOpen(true)}
            baseSalary={defaultBaseSalary}
          />
        ) : activeSuiteMode === 'analytics' ? (
          /* ======================================================== */
          /* MODE 3: PRODUCTION COST & LINE OVERTIME ANALYTICS       */
          /* ======================================================== */
          <ProductionCostAnalytics
            employees={biometricData.employees}
            allPunches={biometricData.allPunches}
            allDates={biometricData.allDates}
            defaultBaseSalary={defaultBaseSalary}
            officialHolidays={officialHolidays}
            onSelectEmployee={(emp) => setSelectedBioEmployee(emp)}
          />
        ) : (
          /* ======================================================== */
          /* MODE 3: DAILY OVERTIME SHEETS (Dates from Filenames)    */
          /* ======================================================== */
          <>
            {/* Daily KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
              <div className="p-4 rounded-2xl bg-white border border-amber-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-semibold block mb-0.5">Total Overtime Hours</span>
                  <div className="text-2xl font-black text-amber-700 font-mono">
                    {dailyDataset.grandTotalHours} <span className="text-xs font-normal text-amber-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              {/* Friday 2x Card */}
              <div className="p-4 rounded-2xl bg-white border border-indigo-300 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-900 font-black block mb-0.5">Friday 2x (Double Time)</span>
                  <div className="text-2xl font-black text-indigo-800 font-mono">
                    {dailyDataset.employees.reduce((acc, e) => acc + (e.fridayHours || 0), 0)}{' '}
                    <span className="text-xs font-normal text-indigo-700 font-sans">hrs</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-900 font-black font-mono border border-indigo-200">
                  2.0x
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block mb-0.5">Total Employees</span>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {dailyDataset.totalUniqueEmployees} <span className="text-xs font-normal text-slate-500 font-sans">staff</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block mb-0.5">Period Days</span>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {dailyDataset.allDates.length} <span className="text-xs font-normal text-slate-500 font-sans">days</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block mb-0.5">Average / Employee</span>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {dailyDataset.totalUniqueEmployees > 0 
                      ? Number((dailyDataset.grandTotalHours / dailyDataset.totalUniqueEmployees).toFixed(1))
                      : 0} <span className="text-xs font-normal text-slate-500 font-sans">hrs/emp</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Daily Matrix Table (Always displayed directly as an empty table ready for upload) */}
            <SimpleTableView
              employees={dailyDataset.employees}
              allDates={dailyDataset.allDates}
              grandTotalHours={dailyDataset.grandTotalHours}
              onSelectEmployee={(emp) => setSelectedDailyEmployee(emp)}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 text-center text-xs text-slate-500 mt-auto no-print">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-2">
          <span>REPORT</span>
          <span className="text-slate-600 font-mono font-medium">
            {activeSuiteMode === 'biometric' 
              ? `Total OT: ${biometricData.grandTotalOtHours} hrs (1.35x: ${biometricData.grandTotal135Hours}h | 1.70x: ${biometricData.grandTotal170Hours}h)`
              : `Total OT: ${dailyDataset.grandTotalHours} hrs`}
          </span>
        </div>
      </footer>

      {/* Universal Upload Modal */}
      <SimpleUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onFilesProcessed={handleFilesProcessed}
        onBiometricProcessed={handleBiometricProcessed}
        initialHolidays={officialHolidays}
        initialBaseSalary={defaultBaseSalary}
      />

      {/* Modal: Official Paid Public Holidays Designation */}
      <OfficialHolidaysModal
        isOpen={isOfficialHolidaysModalOpen}
        onClose={() => setIsOfficialHolidaysModalOpen(false)}
        allDates={biometricData.allDates}
        activeHolidays={officialHolidays}
        onApplyHolidays={handleApplyHolidays}
      />

      {/* Modal 1: Exact Attendance Card (Matching Photo Form) */}
      <OfficialAttendanceSlip
        employee={selectedBioEmployee}
        allEmployees={biometricData.employees}
        isOpen={!!selectedBioEmployee}
        onClose={() => setSelectedBioEmployee(null)}
        onSelectEmployee={(emp) => setSelectedBioEmployee(emp)}
        onUpdateSalary={handleUpdateEmployeeSalary}
        officialHolidays={officialHolidays}
        onOpenOfficialHolidays={() => setIsOfficialHolidaysModalOpen(true)}
      />

      {/* Modal 2: Daily Employee Overtime Report */}
      <DetailedEmployeeReportModal
        employee={selectedDailyEmployee}
        allDates={dailyDataset.allDates}
        allEmployees={dailyDataset.employees}
        isOpen={!!selectedDailyEmployee}
        onClose={() => setSelectedDailyEmployee(null)}
        onSelectEmployee={(emp) => setSelectedDailyEmployee(emp)}
      />

    </div>
  );
}
