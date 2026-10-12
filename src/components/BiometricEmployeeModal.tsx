import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Calendar, 
  Building, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { BiometricEmployeeMonthlySummary } from '../types/biometric';
import { exportSingleBiometricEmployeeExcel } from '../utils/biometricExcelExport';
import { ErogluLogo } from './ErogluLogo';

interface BiometricEmployeeModalProps {
  employee: BiometricEmployeeMonthlySummary | null;
  allEmployees: BiometricEmployeeMonthlySummary[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (emp: BiometricEmployeeMonthlySummary) => void;
}

export const BiometricEmployeeModal: React.FC<BiometricEmployeeModalProps> = ({
  employee,
  allEmployees,
  isOpen,
  onClose,
  onSelectEmployee
}) => {
  if (!isOpen || !employee) return null;

  const currentIndex = allEmployees.findIndex((e) => e.code === employee.code);
  const prevEmp = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmp = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportSingleBiometricEmployeeExcel(employee);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto text-left">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header - Screen only */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-mono font-black flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
              {employee.code}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">{employee.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>{employee.department}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Biometric Punch Dossier & Overtime Tier Audit • Code: <strong className="text-amber-400 font-mono">{employee.code}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next buttons */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-1">
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
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Interactive Area */}
        <div id="printable-employee-slip" className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-900 text-slate-100">
          
          {/* Printable Official Header (Shows when printed) */}
          <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black text-left">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <ErogluLogo size="md" variant="print" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">EROĞLU GARMENT EGYPT S.A.E.</h1>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Official Biometric Overtime Audit Dossier • Friday Rest Day: 2.0x Double Time
                  </p>
                </div>
              </div>
              <div className="text-left text-xs border border-black p-2 font-mono">
                <div><strong>Employee Code:</strong> {employee.code}</div>
                <div><strong>Employee Name:</strong> {employee.name}</div>
                <div><strong>Department:</strong> {employee.department}</div>
                <div><strong>Total Overtime Hours:</strong> {employee.totalOtHours} hrs</div>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left">
              <span className="text-xs text-amber-300 font-semibold block mb-1">Total Overtime (OT)</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {employee.totalOtHours} <span className="text-xs font-normal text-amber-300/80 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-left">
              <span className="text-xs text-cyan-300 font-semibold block mb-1">1.35x Tier (≤2h OT)</span>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {employee.totalRate135Hours} <span className="text-xs font-normal text-cyan-300/80 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-left">
              <span className="text-xs text-orange-300 font-semibold block mb-1">1.70x Tier (&gt;10h Total)</span>
              <div className="text-2xl font-black text-orange-400 font-mono">
                {employee.totalRate170Hours} <span className="text-xs font-normal text-orange-300/80 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-left">
              <span className="text-xs text-indigo-300 font-black block mb-1">2.0x Friday Tier (Double Time)</span>
              <div className="text-2xl font-black text-indigo-400 font-mono">
                {employee.totalRate200Hours} <span className="text-xs font-normal text-indigo-300 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Normal Days (8h)</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {employee.normalDaysCount} <span className="text-xs font-normal text-slate-400 font-sans">days</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-left">
              <span className="text-xs text-indigo-300 block mb-1">Fridays Worked</span>
              <div className="text-xl font-black text-indigo-400 font-mono">
                {employee.fridayWorkedCount} <span className="text-xs font-normal text-indigo-300 font-sans">days</span>
              </div>
            </div>
          </div>

          {/* Itemized Daily Punch Log Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 print:border-black print:bg-white">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Monthly Biometric Log with Check In, Check Out, OT, 1.35x, 1.70x, 2.0x (Fri), &amp; Remark</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {employee.punches.length} logged records
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-bold print:bg-gray-200 print:text-black print:border-black">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800 print:border-black">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black">Date</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black">Day</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center">Check In</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center">Check Out</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center">Worked (h)</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center bg-amber-500/10 text-amber-300">OT (&gt;8h)</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center bg-cyan-500/10 text-cyan-300">1.35x</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center bg-orange-500/10 text-orange-300">1.70x</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 print:border-black text-center bg-indigo-500/15 text-indigo-300 font-black">2.0x (Fri)</th>
                  <th className="py-2.5 px-4">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono print:divide-black print:text-black">
                {employee.punches.map((p, idx) => (
                  <tr 
                    key={p.id} 
                    className={`transition-colors print:hover:bg-transparent ${
                      p.isFriday ? 'bg-indigo-950/15' : p.otHours > 0 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-sans border-r border-slate-800/60 print:border-black print:text-black">
                      {idx + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 font-bold border-r border-slate-800/60 print:border-black print:text-black">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 print:bg-transparent print:border-none print:text-black">
                        {p.date}
                      </span>
                    </td>

                    {/* Day */}
                    <td className="py-2.5 px-3 font-sans text-slate-400 border-r border-slate-800/60 print:border-black print:text-black">
                      {p.dayName}
                    </td>

                    {/* In */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black text-emerald-400 font-bold">
                      {p.checkIn}
                    </td>

                    {/* Out */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black text-rose-400 font-bold">
                      {p.checkOut}
                    </td>

                    {/* Total Worked */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black font-bold text-slate-100">
                      {p.totalWorkedHours > 0 ? `${p.totalWorkedHours}h` : '-'}
                    </td>

                    {/* OT */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black font-black text-amber-400 bg-amber-500/5">
                      {p.otHours > 0 ? `+${p.otHours}h` : '-'}
                    </td>

                    {/* 1.35x */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black font-bold text-cyan-300 bg-cyan-500/5">
                      {p.rate135Hours > 0 ? `${p.rate135Hours}h` : '-'}
                    </td>

                    {/* 1.70x */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black font-bold text-orange-400 bg-orange-500/5">
                      {p.rate170Hours > 0 ? `${p.rate170Hours}h` : '-'}
                    </td>

                    {/* 2.0x Friday */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-800/60 print:border-black print:text-black font-black text-indigo-300 bg-indigo-500/10">
                      {p.rate200Hours > 0 ? `${p.rate200Hours}h` : '-'}
                    </td>

                    {/* Remark */}
                    <td className="py-2.5 px-4 font-sans text-xs">
                      {p.isSingleSwipe ? (
                        <span className="font-bold text-rose-400 print:text-black">
                          Single Swipe (Forgot Out - No OT)
                        </span>
                      ) : p.isOfficialHoliday ? (
                        p.totalWorkedHours > 0 ? (
                          <span className="font-bold text-indigo-400 print:text-black">
                            Official Holiday (2x Double Time)
                          </span>
                        ) : (
                          <span className="font-semibold text-indigo-300 print:text-black">
                            Official Paid Holiday (Paid)
                          </span>
                        )
                      ) : p.isFriday ? (
                        p.totalWorkedHours > 0 ? (
                          <span className="font-semibold text-indigo-400 print:text-black">
                            Friday Overtime (2x Double Time)
                          </span>
                        ) : (
                          <span className="text-slate-500 print:text-black">
                            Friday (Weekly Day Off)
                          </span>
                        )
                      ) : p.isNormalDay ? (
                        <span className="font-semibold text-emerald-400 print:text-black">
                          ✓ Normal Day (8h)
                        </span>
                      ) : p.otHours > 0 ? (
                        <span className="text-amber-400 print:text-black font-medium">
                          Overtime (+{p.otHours}h)
                        </span>
                      ) : p.totalWorkedHours > 0 ? (
                        <span className="text-slate-400 print:text-black">Regular Work</span>
                      ) : (
                        <span className="text-slate-600 print:text-black">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Footer Row */}
              <tfoot>
                <tr className="bg-amber-500/10 border-t-2 border-amber-500/40 text-amber-300 font-bold print:bg-gray-100 print:text-black print:border-black">
                  <td colSpan={5} className="py-3 px-4 font-sans text-sm print:text-black text-left border-r border-slate-800 print:border-black">
                    Grand Totals for {employee.name}:
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-800 print:border-black font-black text-slate-100">
                    {employee.totalWorkedHours} hrs
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-800 print:border-black font-black text-amber-400 bg-amber-500/20">
                    {employee.totalOtHours} hrs
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-800 print:border-black font-black text-cyan-300 bg-cyan-500/10">
                    {employee.totalRate135Hours} hrs
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-800 print:border-black font-black text-orange-400 bg-orange-500/10">
                    {employee.totalRate170Hours} hrs
                  </td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-400 print:text-black">
                    Certified Totals
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between no-print flex-wrap gap-2">
          <div className="text-xs text-slate-400">
            Employee: <strong className="text-white">{employee.name}</strong> • Dept: <strong className="text-slate-300">{employee.department}</strong> • Total OT: <strong className="text-amber-400 font-mono">{employee.totalOtHours} hrs</strong> (1.35x: {employee.totalRate135Hours}h | 1.70x: {employee.totalRate170Hours}h)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier (Excel)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Biometric Audit Slip (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
