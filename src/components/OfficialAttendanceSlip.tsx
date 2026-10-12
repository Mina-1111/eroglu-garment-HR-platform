import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ChevronRight, 
  ChevronLeft
} from 'lucide-react';
import { BiometricEmployeeMonthlySummary } from '../types/biometric';
import { exportSingleBiometricEmployeeExcel } from '../utils/biometricExcelExport';
import { calculateSalaryAndOvertime, isOfficialHolidayDate } from '../utils/biometricParser';
import { ErogluLogo } from './ErogluLogo';
import { Calendar } from 'lucide-react';

interface OfficialAttendanceSlipProps {
  employee: BiometricEmployeeMonthlySummary | null;
  allEmployees: BiometricEmployeeMonthlySummary[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (emp: BiometricEmployeeMonthlySummary) => void;
  onUpdateSalary?: (code: string, newSalary: number) => void;
  officialHolidays?: string[];
  onOpenOfficialHolidays?: () => void;
}

export const OfficialAttendanceSlip: React.FC<OfficialAttendanceSlipProps> = ({
  employee,
  allEmployees,
  isOpen,
  onClose,
  onSelectEmployee,
  onUpdateSalary,
  officialHolidays = [],
  onOpenOfficialHolidays
}) => {
  const [salaryStr, setSalaryStr] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync only when switching employee code to avoid interrupting user while typing
  useEffect(() => {
    if (employee && employee.baseSalary && employee.baseSalary > 0) {
      setSalaryStr(String(employee.baseSalary));
    } else {
      setSalaryStr('');
    }
  }, [employee?.code, employee?.baseSalary]);

  // Immediate local calculation for 0ms lag while typing
  const currentBaseNum = Number(salaryStr) || 0;
  const localSalaryStats = useMemo(() => {
    if (!employee) {
      return {
        baseSalary: 0,
        hourlyRate: 0,
        otAmount135: 0,
        otAmount170: 0,
        otAmount200: 0,
        totalOtAmount: 0,
        grossSalary: 0
      };
    }
    return calculateSalaryAndOvertime(
      currentBaseNum,
      employee.totalRate135Hours,
      employee.totalRate170Hours,
      employee.totalRate200Hours
    );
  }, [currentBaseNum, employee?.totalRate135Hours, employee?.totalRate170Hours, employee?.totalRate200Hours]);

  if (!isOpen || !employee) return null;

  const handleSalaryInput = (val: string) => {
    setSalaryStr(val);
    const num = val === '' ? 0 : Number(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!isNaN(num) && onUpdateSalary) {
      debounceRef.current = setTimeout(() => {
        onUpdateSalary(employee.code, num);
      }, 350);
    }
  };

  const handleSalaryBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const num = salaryStr === '' ? 0 : Number(salaryStr);
    if (!isNaN(num) && onUpdateSalary) {
      onUpdateSalary(employee.code, num);
    }
  };

  const currentIndex = allEmployees.findIndex((e) => e.code === employee.code);
  const prevEmp = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmp = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  const handlePrint = () => {
    handleSalaryBlur();
    const origTitle = document.title;
    const cleanName = employee.name.replace(/[^\w\u0600-\u06FF]/g, '_');
    document.title = `Attendance_Slip_${employee.code}_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1200);
  };

  const handleExport = () => {
    handleSalaryBlur();
    const updatedEmployeeForExport: BiometricEmployeeMonthlySummary = {
      ...employee,
      baseSalary: localSalaryStats.baseSalary,
      hourlyRate: localSalaryStats.hourlyRate,
      otAmount135: localSalaryStats.otAmount135,
      otAmount170: localSalaryStats.otAmount170,
      otAmount200: localSalaryStats.otAmount200,
      totalOtAmount: localSalaryStats.totalOtAmount,
      grossSalary: localSalaryStats.grossSalary
    };
    exportSingleBiometricEmployeeExcel(updatedEmployeeForExport);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto text-left">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Navigation & Controls Bar (Screen only) */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between no-print flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">
              {employee.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              Cardno: {employee.code}
            </span>
            <span className="text-xs text-slate-400">
              {employee.department}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Salary Input in Top Bar */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 mr-1">
              <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">Salary:</span>
              <input
                type="number"
                min="0"
                step="100"
                value={salaryStr}
                placeholder="0"
                onChange={(e) => handleSalaryInput(e.target.value)}
                onBlur={handleSalaryBlur}
                className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-amber-400 font-mono font-bold text-xs focus:outline-none text-right"
              />
              <span className="text-[10px] text-slate-400 font-semibold">EGP</span>
            </div>

            {/* Official Holidays Button in Slip Header */}
            {onOpenOfficialHolidays && (
              <button
                type="button"
                onClick={onOpenOfficialHolidays}
                className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Designate or adjust Official Paid Public Holidays"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Holidays ({officialHolidays.length})</span>
              </button>
            )}

            {/* Prev / Next buttons */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-2">
              <button
                disabled={!prevEmp}
                onClick={() => prevEmp && onSelectEmployee(prevEmp)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Previous Employee"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-400">
                {currentIndex + 1} / {allEmployees.length}
              </span>
              <button
                disabled={!nextEmp}
                onClick={() => nextEmp && onSelectEmployee(nextEmp)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Employee"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExport}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Print or Save Attendance Slip as PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview (Exact replica of Attendance.jpeg) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/80 flex justify-center">
          
          <div 
            id="printable-employee-slip" 
            className="w-full max-w-5xl bg-white text-black p-6 font-sans text-xs shadow-2xl rounded-sm print:p-0 print:shadow-none print:w-full print:max-w-none"
            style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}
          >
            {/* Top Official Company Branding Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
              <div className="flex items-center gap-3">
                <ErogluLogo size="md" variant="print" />
                <div className="text-left">
                  <div className="text-xs font-black tracking-wider uppercase text-black">EROĞLU GARMENT EG</div>
                </div>
              </div>
              <div className="text-right text-[10px] text-gray-800">
              </div>
            </div>
            
            {/* Top Employee Metadata Block (Matches image header exactly) */}
            <div className="border border-black p-3 mb-2 leading-relaxed bg-white text-black">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Cardno: </strong>
                  <span className="font-mono">{employee.code}</span>
                </div>
                <div>
                  <strong>Designation : </strong>
                  <span>{employee.designation || 'Staff'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <strong>Name : </strong>
                  <span className="font-semibold">{employee.name}</span>
                </div>
                <div>
                  <strong>Section : </strong>
                  <span>{employee.department}</span>
                </div>
              </div>
            </div>

            {/* Attendance Table (Exact columns with 1.35x, 1.70x and 2.0x Friday OT Tiers) */}
            <table className="w-full border-collapse border border-black text-[11px] text-center bg-white text-black" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-black" style={{ backgroundColor: '#f3f4f6', color: '#000000' }}>
                  <th className="border border-black py-1 px-1 w-7 text-black">SL</th>
                  <th className="border border-black py-1 px-1.5 w-20 text-black">Date</th>
                  <th className="border border-black py-1 px-1.5 w-20 text-black">Week Day</th>
                  <th className="border border-black py-1 px-1.5 w-20 text-black">In Time</th>
                  <th className="border border-black py-1 px-1.5 w-20 text-black">Out Time</th>
                  <th className="border border-black py-1 px-1 w-12 text-black">OV Total</th>
                  <th className="border border-black py-1 px-1 w-11 text-black bg-sky-50/50">1.35x</th>
                  <th className="border border-black py-1 px-1 w-11 text-black bg-orange-50/50">1.70x</th>
                  <th className="border border-black py-1 px-1 w-11 text-black bg-indigo-50/50 font-black">2.0x</th>
                  <th className="border border-black py-1 px-1 w-10 text-black">Status</th>
                  <th className="border border-black py-1 px-2 text-black">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white text-black" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                {employee.punches.map((p, idx) => {
                  const isFriday = p.isFriday;
                  const isOffHol = Boolean(p.isOfficialHoliday) || (Boolean(officialHolidays && officialHolidays.length > 0) && isOfficialHolidayDate(p.date, officialHolidays));
                  const isBlankFriday = isFriday && (!p.otHours || p.otHours <= 0) && !isOffHol;
                  return (
                    <tr 
                      key={p.id} 
                      className={`border-b border-black text-black ${
                        isOffHol ? 'is-holiday bg-indigo-50/60' : isFriday ? 'is-friday bg-gray-50' : 'bg-white'
                      }`}
                      style={{ 
                        backgroundColor: isOffHol ? '#eef2ff' : isFriday ? '#f9fafb' : '#ffffff', 
                        color: '#000000' 
                      }}
                    >
                      <td className="border border-black py-1 px-1 text-center font-mono text-black">
                        {idx + 1}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono text-[10px] text-black">
                        {p.formattedDate}
                      </td>
                      <td className="border border-black py-1 px-1 text-left font-medium text-black">
                        {p.weekDay} {isOffHol && <span className="text-[9.5px] font-bold text-indigo-900 font-sans">• Holiday</span>}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono text-[10px] text-black">
                        {isBlankFriday ? '' : (p.inTime || '')}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono text-[10px] text-black">
                        {isBlankFriday ? '' : (p.outTime || '')}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono font-bold text-center text-black">
                        {isBlankFriday ? (
                          ''
                        ) : p.otHours > 0 ? (
                          p.otHours
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono font-semibold text-center text-black">
                        {isBlankFriday ? (
                          ''
                        ) : p.rate135Hours > 0 ? (
                          p.rate135Hours
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="border border-black py-1 px-1 font-mono font-semibold text-center text-black">
                        {isBlankFriday ? (
                          ''
                        ) : p.rate170Hours > 0 ? (
                          p.rate170Hours
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className={`border border-black py-1 px-1 font-mono font-black text-center text-black ${
                        isOffHol && p.rate200Hours > 0 ? 'bg-indigo-100 font-black text-indigo-950' : ''
                      }`}>
                        {isBlankFriday ? (
                          ''
                        ) : p.rate200Hours > 0 ? (
                          p.rate200Hours
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono font-bold text-black">
                        {isOffHol ? (
                          <span className="font-black text-indigo-950">P</span>
                        ) : isBlankFriday ? (
                          ''
                        ) : (
                          p.status || ''
                        )}
                      </td>
                      <td className="border border-black py-1 px-2 text-left font-medium text-black text-[10.5px]">
                        {isOffHol ? (
                          <span className="font-bold text-indigo-950">
                            {p.rate200Hours > 0 || p.otHours > 0 ? 'G.Holiday (Worked 2x)' : 'G.Holiday (Paid)'}
                          </span>
                        ) : (
                          p.remarks || (isFriday ? 'W.Holiday' : '')
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total OT Hours, 1.35x, 1.70x, 2.0x and Week End row inside table footer */}
              <tfoot>
                <tr className="border-t-2 border-black font-bold bg-gray-100 text-black text-[11px]" style={{ backgroundColor: '#f3f4f6', color: '#000000' }}>
                  <td colSpan={5} className="border border-black py-1.5 px-2 text-right text-black">
                    OV Total :
                  </td>
                  <td className="border border-black py-1.5 px-1 font-mono text-center font-black text-black">
                    {employee.totalOtHours}
                  </td>
                  <td className="border border-black py-1.5 px-1 font-mono text-center font-black text-black">
                    {employee.totalRate135Hours}
                  </td>
                  <td className="border border-black py-1.5 px-1 font-mono text-center font-black text-black">
                    {employee.totalRate170Hours}
                  </td>
                  <td className="border border-black py-1.5 px-1 font-mono text-center font-black text-black bg-indigo-100/60">
                    {employee.totalRate200Hours}
                  </td>
                  <td className="border border-black py-1.5 px-1 text-right text-black">
                    W.End:
                  </td>
                  <td className="border border-black py-1.5 px-1 text-left font-mono text-black">
                    {employee.weekEndDaysCount}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Overtime Tier Breakdown Report (4-tier detailed analysis including Friday 2x) */}
            <div className="border border-black p-2 mt-2 bg-gray-50 text-black" style={{ backgroundColor: '#f9fafb', color: '#000000' }}>
              <div className="flex items-center justify-between font-bold text-[11px] mb-1.5 border-b border-black/30 pb-1">
                <span>Overtime Report:</span>
                <span className="font-mono text-xs">OV Total: <strong>{employee.totalOtHours} hrs</strong></span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-slate-700 font-bold">Total Overtime</div>
                  <div className="font-black text-sm text-black mt-0.5">{employee.totalOtHours} hrs</div>
                </div>
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-slate-700 font-bold">Tier 1.35x (Day ≤2h)</div>
                  <div className="font-black text-sm text-black mt-0.5">{employee.totalRate135Hours} hrs</div>
                </div>
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-slate-700 font-bold">Tier 1.70x (Night/Excess)</div>
                  <div className="font-black text-sm text-black mt-0.5">{employee.totalRate170Hours} hrs</div>
                </div>
                <div className="border border-black p-1 bg-indigo-50/40">
                  <div className="font-sans text-[10px] text-indigo-900 font-black">Tier 2.0x (Friday / Holiday 2x)</div>
                  <div className="font-black text-sm text-indigo-950 mt-0.5">{employee.totalRate200Hours} hrs</div>
                </div>
              </div>
            </div>

            {/* Summary Block (Exact replica of the bottom bar in Attendance.jpeg) */}
            <div className="border border-black p-2.5 mt-2 bg-gray-50 text-black" style={{ backgroundColor: '#f9fafb', color: '#000000' }}>
              <div className="font-bold mb-1">Summary :</div>
              <div className="flex items-center justify-around flex-wrap gap-4 text-xs font-mono text-black">
                <div>
                  <span className="font-sans font-semibold">Days Of Month : </span>
                  <span>{String(employee.daysOfMonth).padStart(2, '0')}</span>
                </div>
                <div>
                  <span className="font-sans font-semibold">Present : </span>
                  <span>{String(employee.presentDaysCount).padStart(2, '0')}</span>
                </div>
                <div>
                  <span className="font-sans font-semibold">Absent : </span>
                  <span>{String(employee.absentDaysCount).padStart(2, '0')}</span>
                </div>
                {(employee.officialHolidaysPaidCount !== undefined && employee.officialHolidaysPaidCount > 0) && (
                  <div>
                    <span className="font-sans font-semibold text-indigo-900">G.Holiday (Paid) : </span>
                    <span className="font-bold text-indigo-950">{String(employee.officialHolidaysPaidCount).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Salary & Net Wage Statement (Always shown, editable inline, auto-calculating) */}
            <div className="border border-black p-2.5 mt-2 bg-gray-50 text-black text-xs font-mono" style={{ backgroundColor: '#f9fafb', color: '#000000' }}>
              <div className="flex items-center justify-between font-bold mb-1.5 border-b border-black/30 pb-1 font-sans">
                <div className="flex items-center gap-2">
                  <span>Wage &amp; Overtime Compensation Statement:</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-950 font-bold">
                  Net Payroll: <strong>{(localSalaryStats.grossSalary || 0).toLocaleString()} EGP</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-gray-700 font-bold">Base Monthly Salary</div>
                  <div className="mt-0.5 flex items-center justify-center">
                    <span className="print:inline hidden font-black text-sm text-black">
                      {(localSalaryStats.baseSalary || 0).toLocaleString()} EGP
                    </span>
                    <div className="no-print flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={salaryStr}
                        placeholder="0"
                        onChange={(e) => handleSalaryInput(e.target.value)}
                        onBlur={handleSalaryBlur}
                        className="w-20 text-center font-black text-sm text-black border border-slate-400 rounded px-1 py-0.5 bg-amber-50 focus:outline-none focus:border-amber-600"
                      />
                      <span className="text-[10px] text-gray-600 font-sans font-bold">EGP</span>
                    </div>
                  </div>
                </div>
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-gray-700 font-bold">Hourly Rate (Base / 240)</div>
                  <div className="font-bold text-sm text-black mt-0.5">{localSalaryStats.hourlyRate || 0} EGP/h</div>
                </div>
                <div className="border border-black p-1 bg-white">
                  <div className="font-sans text-[10px] text-gray-700 font-bold">Total Overtime Pay</div>
                  <div className="font-black text-sm text-amber-900 mt-0.5">+{ (localSalaryStats.totalOtAmount || 0).toLocaleString()} EGP</div>
                </div>
                <div className="border border-black p-1 bg-emerald-50">
                  <div className="font-sans text-[10px] text-emerald-900 font-black">Gross Total Earnings</div>
                  <div className="font-black text-sm text-emerald-950 mt-0.5">{(localSalaryStats.grossSalary || 0).toLocaleString()} EGP</div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
