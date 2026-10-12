import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Download, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Filter, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Layers, 
  Coins,
  DollarSign,
  AlertCircle,
  Activity
} from 'lucide-react';
import { BiometricPunchRecord, BiometricEmployeeMonthlySummary } from '../types/biometric';
import { exportBiometricPunchesExcel } from '../utils/biometricExcelExport';

interface BiometricTableViewProps {
  punches: BiometricPunchRecord[];
  employees: BiometricEmployeeMonthlySummary[];
  onSelectEmployee: (emp: BiometricEmployeeMonthlySummary) => void;
  officialHolidays?: string[];
  onOpenOfficialHolidays?: () => void;
  defaultBaseSalary?: number;
  onUpdateDefaultSalary?: (salary: number) => void;
  onUpdateEmployeeSalary?: (code: string, salary: number) => void;
  onOpenAnalytics?: () => void;
}

const EmployeeSalaryInputCell: React.FC<{
  code: string;
  salary?: number;
  onUpdate?: (code: string, newSalary: number) => void;
}> = ({ code, salary, onUpdate }) => {
  const [val, setVal] = useState<string>(salary && salary > 0 ? String(salary) : '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVal(salary && salary > 0 ? String(salary) : '');
  }, [salary]);

  const commitValue = (valueToCommit: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const num = valueToCommit === '' ? 0 : Number(valueToCommit);
    if (!isNaN(num) && onUpdate) {
      onUpdate(code, num);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      commitValue(v);
    }, 450);
  };

  const handleBlur = () => {
    commitValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(val);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5">
      <input
        type="number"
        min="0"
        step="100"
        placeholder="0"
        value={val}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-16 bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 font-semibold"
      />
      <span className="text-[10px] text-slate-400 ml-1">EGP</span>
    </div>
  );
};

const DefaultSalaryBannerInput: React.FC<{
  defaultSalary?: number;
  onUpdate?: (newSalary: number) => void;
}> = ({ defaultSalary = 0, onUpdate }) => {
  const [val, setVal] = useState<string>(defaultSalary && defaultSalary > 0 ? String(defaultSalary) : '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVal(defaultSalary && defaultSalary > 0 ? String(defaultSalary) : '');
  }, [defaultSalary]);

  const commitValue = (valueToCommit: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const num = valueToCommit === '' ? 0 : Number(valueToCommit);
    if (!isNaN(num) && onUpdate) {
      onUpdate(num);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      commitValue(v);
    }, 450);
  };

  const handleBlur = () => {
    commitValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(val);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
      <input
        type="number"
        min="0"
        step="100"
        placeholder="0"
        value={val}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-20 bg-transparent text-amber-400 font-mono font-bold text-xs focus:outline-none text-right"
      />
      <span className="text-[11px] text-slate-400 ml-1 font-semibold">EGP</span>
    </div>
  );
};

export const BiometricTableView: React.FC<BiometricTableViewProps> = ({
  punches,
  employees,
  onSelectEmployee,
  officialHolidays = [],
  onOpenOfficialHolidays,
  defaultBaseSalary = 0,
  onUpdateDefaultSalary,
  onUpdateEmployeeSalary,
  onOpenAnalytics
}) => {
  const [viewMode, setViewMode] = useState<'employees' | 'punches'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ot' | 'normal' | 'friday' | 'holiday'>('all');
  
  // Pagination state to solve lagging/freezing completely
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Extract unique departments verbatim from sheet
  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    return Array.from(s).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (selectedDept !== 'all' && e.department !== selectedDept) return false;
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const mCode = e.code.toLowerCase().includes(t);
        const mName = e.name.toLowerCase().includes(t);
        const mDept = e.department.toLowerCase().includes(t);
        if (!mCode && !mName && !mDept) return false;
      }
      return true;
    });
  }, [employees, selectedDept, searchTerm]);

  // Filter punches
  const filteredPunches = useMemo(() => {
    return punches.filter((p) => {
      if (selectedDept !== 'all' && p.department !== selectedDept) return false;
      if (statusFilter === 'ot' && p.otHours <= 0) return false;
      if (statusFilter === 'normal' && !p.isNormalDay) return false;
      if (statusFilter === 'friday' && !p.isFriday) return false;
      if (statusFilter === 'holiday' && !p.isOfficialHoliday) return false;

      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const mCode = p.code.toLowerCase().includes(t);
        const mName = p.name.toLowerCase().includes(t);
        const mDept = p.department.toLowerCase().includes(t);
        const mDate = p.date.toLowerCase().includes(t);
        if (!mCode && !mName && !mDept && !mDate) return false;
      }
      return true;
    });
  }, [punches, selectedDept, statusFilter, searchTerm]);

  // Paginated punches slice (renders only 50 rows, eliminating lag!)
  const totalPunchPages = Math.ceil(filteredPunches.length / pageSize) || 1;
  const paginatedPunches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPunches.slice(start, start + pageSize);
  }, [filteredPunches, currentPage, pageSize]);

  // Totals
  const totals = useMemo(() => {
    let worked = 0;
    let ot = 0;
    let r135 = 0;
    let r170 = 0;
    let r200 = 0;
    let totalBaseSalary = 0;
    let totalOtPay = 0;
    let totalGrossSalary = 0;

    filteredEmployees.forEach((e) => {
      const bSalary = e.baseSalary ?? defaultBaseSalary;
      const gSalary = e.grossSalary ?? (bSalary + (e.totalOtAmount || 0));
      totalBaseSalary += bSalary;
      totalOtPay += (e.totalOtAmount || 0);
      totalGrossSalary += gSalary;
    });

    filteredPunches.forEach((p) => {
      worked += p.totalWorkedHours;
      ot += p.otHours;
      r135 += p.rate135Hours;
      r170 += p.rate170Hours;
      r200 += p.rate200Hours;
    });

    return {
      worked: Number(worked.toFixed(2)),
      ot: Number(ot.toFixed(2)),
      r135: Number(r135.toFixed(2)),
      r170: Number(r170.toFixed(2)),
      r200: Number(r200.toFixed(2)),
      totalBaseSalary: Number(totalBaseSalary.toFixed(2)),
      totalOtPay: Number(totalOtPay.toFixed(2)),
      totalGrossSalary: Number(totalGrossSalary.toFixed(2))
    };
  }, [filteredPunches, filteredEmployees]);

  const handleExport = () => {
    exportBiometricPunchesExcel(filteredPunches, employees);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col text-left">
      
      {/* Top Switcher: Employee Monthly Slips vs Raw Punches Log */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-200/70 border border-slate-300 rounded-xl p-1">
          <button
            onClick={() => setViewMode('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'employees'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Monthly Statements ({employees.length})</span>
          </button>

          <button
            onClick={() => setViewMode('punches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'punches'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Daily Punch Logs ({punches.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenOfficialHolidays && (
            <button
              onClick={onOpenOfficialHolidays}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                officialHolidays.length > 0
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Designate Official Paid Public Holidays (2.0x Double Time)"
            >
              <Calendar className={`w-3.5 h-3.5 ${officialHolidays.length > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>Official Holidays</span>
              {officialHolidays.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                  {officialHolidays.length}
                </span>
              )}
            </button>
          )}

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-xs"
              title="Open Production Cost & Line Overtime Analytics"
            >
              <Activity className="w-3.5 h-3.5 text-slate-950" />
              <span>Production Analytics</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Export biometric calculations to Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Salary & Overtime Quick Calculator Banner */}
      <div className="px-4 py-2.5 bg-slate-900 text-white border-b border-slate-300 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Default Base Salary:</span>
            <DefaultSalaryBannerInput defaultSalary={defaultBaseSalary} onUpdate={onUpdateDefaultSalary} />
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Hourly Rate = Base / 240 hrs • 1.35x (Day) • 1.70x (Night) • 2.0x (Fri / Holiday)
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 font-sans text-[11px]">Total OT Pay: </span>
            <strong className="text-amber-100 text-sm font-black">{totals.totalOtPay.toLocaleString()} EGP</strong>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
          <div>
            <span className="text-slate-400 font-sans text-[11px]">Total Gross Payroll: </span>
            <strong className="text-emerald-400 text-sm font-black">{totals.totalGrossSalary.toLocaleString()} EGP</strong>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, name, department..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Department Filter (Verbatim from sheet) */}
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {viewMode === 'punches' && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Logs</option>
              <option value="ot">Overtime Days Only (&gt; 8h)</option>
              <option value="normal">Normal Working Days (8h)</option>
              <option value="friday">Fridays Only (Day Off / Friday OT)</option>
              <option value="holiday">Official Paid Holidays Only</option>
            </select>
          )}
        </div>

        {/* Counter */}
        <div className="text-xs text-slate-500 font-mono">
          {viewMode === 'employees' 
            ? `Showing ${filteredEmployees.length} of ${employees.length} employees`
            : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredPunches.length)} of ${filteredPunches.length} records`}
        </div>

      </div>

      {/* VIEW 1: EMPLOYEES DIRECTORY (Fastest & direct match to Attendance Form!) */}
      {viewMode === 'employees' ? (
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">#</th>
                <th className="py-2.5 px-3 border-r border-slate-200 font-bold text-amber-700 whitespace-nowrap">Cardno</th>
                <th className="py-2.5 px-3 border-r border-slate-200 font-bold whitespace-nowrap min-w-[160px]">Employee Name</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Section / Dept (Sheet)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap">Present Days</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap">Worked Hours</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-amber-50 text-amber-900 font-black">
                  Total OT Hours
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-sky-50 text-sky-900 font-bold">
                  1.35x Tier
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-orange-50 text-orange-900 font-bold">
                  1.70x Tier
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-indigo-50 text-indigo-900 font-bold">
                  2.0x (Fri/Hol)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-slate-50 text-slate-800 font-bold">
                  Base Salary
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-amber-50/80 text-amber-900 font-bold">
                  OT Pay
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center whitespace-nowrap bg-emerald-50 text-emerald-950 font-black">
                  Net Salary
                </th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">
                  Exact Form Slip
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">Table is empty and ready for upload</span>
                      <span className="text-xs text-slate-500 leading-relaxed">
                        Click the <strong className="text-amber-700">"Upload Sheet"</strong> button at the top to upload biometric attendance sheets and calculate overtime automatically.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.code} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-200 font-sans">
                      {idx + 1}
                    </td>

                    <td className="py-2 px-3 font-bold text-amber-700 border-r border-slate-200 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 font-mono">
                        {emp.code}
                      </span>
                    </td>

                    <td className="py-2 px-3 font-sans font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="hover:text-amber-600 transition-colors text-left cursor-pointer"
                      >
                        {emp.name}
                      </button>
                    </td>

                    <td className="py-2 px-3 font-sans text-slate-700 border-r border-slate-200 whitespace-nowrap text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {emp.department}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap text-slate-800 font-bold">
                      {emp.presentDaysCount} days
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap text-slate-700 font-bold">
                      {emp.totalWorkedHours}h
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-amber-50 font-black text-amber-800 text-sm">
                      {emp.totalOtHours} hrs
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-sky-50/50 font-bold text-sky-800">
                      {emp.totalRate135Hours}h
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-orange-50/50 font-bold text-orange-800">
                      {emp.totalRate170Hours}h
                    </td>

                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-indigo-50/50 font-black text-indigo-900">
                      {emp.totalRate200Hours > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-100/80 text-indigo-900 border border-indigo-300">
                          {emp.totalRate200Hours}h
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0h</span>
                      )}
                    </td>

                    {/* Base Salary editable column */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                      <EmployeeSalaryInputCell
                        code={emp.code}
                        salary={emp.baseSalary}
                        onUpdate={onUpdateEmployeeSalary}
                      />
                    </td>

                    {/* Calculated Overtime Pay */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-amber-50/40 text-amber-800 font-bold">
                      {emp.totalOtAmount ? emp.totalOtAmount.toLocaleString() : 0} EGP
                    </td>

                    {/* Calculated Gross Net Total Salary */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-emerald-50/50 text-emerald-800 font-black">
                      {emp.grossSalary ? emp.grossSalary.toLocaleString() : (emp.baseSalary ?? defaultBaseSalary).toLocaleString()} EGP
                    </td>

                    <td className="py-2 px-4 text-center whitespace-nowrap font-sans">
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 mx-auto transition-all shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Open &amp; Print Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW 2: ALL DAILY PUNCHES (Paginated for instantaneous 60fps scrolling) */
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">SL</th>
                <th className="py-2.5 px-3 border-r border-slate-200 font-bold text-amber-700 whitespace-nowrap">Cardno</th>
                <th className="py-2.5 px-3 border-r border-slate-200 font-bold whitespace-nowrap min-w-[150px]">Employee Name</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Section</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap font-mono">Date</th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Week Day</th>
                
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap font-mono text-center bg-slate-50 text-emerald-700 font-bold">
                  In Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap font-mono text-center bg-slate-50 text-rose-700 font-bold">
                  Out Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-center font-mono bg-amber-50 text-amber-900 font-black">
                  OT Hr
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-center font-mono bg-indigo-50 text-indigo-900 font-bold">
                  2.0x (Fri/Hol)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-center font-mono">Status</th>
                <th className="py-2.5 px-4 border-r border-slate-200 whitespace-nowrap">Remarks</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Slip</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
              {paginatedPunches.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">No biometric records registered yet</span>
                      <span className="text-xs text-slate-500 leading-relaxed">
                        Upload an attendance sheet to view itemized check-in and check-out logs for each day.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPunches.map((p, idx) => {
                  const parentEmp = employees.find((e) => e.code === p.code);

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors hover:bg-amber-50/30 ${
                        p.isOfficialHoliday 
                          ? 'bg-indigo-50/70' 
                          : p.isFriday 
                          ? 'bg-indigo-50/40' 
                          : p.otHours > 0 
                          ? 'bg-amber-50/30' 
                          : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-200 font-sans">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      <td className="py-2 px-3 font-bold text-amber-700 border-r border-slate-200 whitespace-nowrap">
                        {p.code}
                      </td>

                      <td className="py-2 px-3 font-sans font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        <button
                          onClick={() => parentEmp && onSelectEmployee(parentEmp)}
                          className="hover:text-amber-600 transition-colors text-left cursor-pointer"
                        >
                          {p.name}
                        </button>
                      </td>

                      <td className="py-2 px-3 font-sans text-slate-600 border-r border-slate-200 whitespace-nowrap text-[11px]">
                        {p.department}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-700 font-bold">
                        {p.formattedDate}
                      </td>

                      <td className="py-2 px-3 font-sans text-slate-600 border-r border-slate-200 whitespace-nowrap text-[11px]">
                        {p.weekDay}
                      </td>

                      {/* In Time */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap font-bold text-emerald-700">
                        {p.isFriday && (!p.otHours || p.otHours <= 0) ? '' : (p.inTime || '-')}
                      </td>

                      {/* Out Time - Handles single swipe with missing out */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap font-bold text-rose-700">
                        {p.isSingleSwipe ? (
                          <span className="text-slate-400 italic text-[11px]">- (Missing Out)</span>
                        ) : p.isFriday && (!p.otHours || p.otHours <= 0) ? (
                          ''
                        ) : (
                          p.outTime || '-'
                        )}
                      </td>

                      {/* OT Hr */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-amber-50 font-black text-amber-800">
                        {p.isSingleSwipe ? (
                          0
                        ) : p.isFriday && (!p.otHours || p.otHours <= 0) ? (
                          ''
                        ) : (
                          p.otHours > 0 ? p.otHours : 0
                        )}
                      </td>

                      {/* 2.0x Double Time (Friday or Official Holiday) */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap font-black text-indigo-900 bg-indigo-50/20">
                        {p.rate200Hours > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs">
                            {p.rate200Hours}h
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap font-bold">
                        {p.isFriday && (!p.otHours || p.otHours <= 0) && !p.isOfficialHoliday ? (
                          ''
                        ) : p.status === 'P' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">P</span>
                        ) : p.status === 'A' ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs">A</span>
                        ) : (
                          p.status
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-2 px-4 border-r border-slate-200 whitespace-nowrap font-sans text-[11px]">
                        {p.isSingleSwipe ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            Single Swipe (No OT)
                          </span>
                        ) : p.isOfficialHoliday ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                            {p.rate200Hours > 0 ? 'G.Holiday (Worked 2x)' : 'G.Holiday (Paid)'}
                          </span>
                        ) : (
                          p.remarks || (p.isFriday ? 'W.Holiday' : '')
                        )}
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => parentEmp && onSelectEmployee(parentEmp)}
                          className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 cursor-pointer transition-colors"
                          title="View Employee Monthly Slip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls for punch view */}
      {viewMode === 'punches' && filteredPunches.length > pageSize && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <strong>{currentPage}</strong> of <strong>{totalPunchPages}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={currentPage >= totalPunchPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPunchPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table Footer with Summary Stats */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            Total OT Hours:{' '}
            <strong className="text-amber-800 font-black text-sm">
              {totals.ot} hrs
            </strong>
          </div>
          <div>
            1.35x Tier:{' '}
            <strong className="text-sky-800 font-bold">
              {totals.r135} hrs
            </strong>
          </div>
          <div>
            1.70x Tier:{' '}
            <strong className="text-orange-800 font-bold">
              {totals.r170} hrs
            </strong>
          </div>
          <div>
            2.0x Double Time:{' '}
            <strong className="text-indigo-900 font-black">
              {totals.r200} hrs
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-700">
          <div>
            Base Salaries:{' '}
            <strong className="text-slate-900 font-bold">
              {totals.totalBaseSalary.toLocaleString()} EGP
            </strong>
          </div>
          <div>
            Total Gross Payroll:{' '}
            <strong className="text-emerald-700 font-black text-sm">
              {totals.totalGrossSalary.toLocaleString()} EGP
            </strong>
          </div>
        </div>
      </div>

    </div>
  );
};
