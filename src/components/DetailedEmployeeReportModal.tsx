import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Calendar, 
  Building, 
  User, 
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { EmployeeOvertimeSummary } from '../types/overtime';
import { formatDisplayDate } from '../utils/dateExtractor';
import { exportSingleEmployeeExcel } from '../utils/simpleExcelExport';
import { checkIsFriday } from '../utils/biometricParser';
import { ErogluLogo } from './ErogluLogo';

interface DetailedEmployeeReportModalProps {
  employee: EmployeeOvertimeSummary | null;
  allDates: string[];
  allEmployees: EmployeeOvertimeSummary[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (emp: EmployeeOvertimeSummary) => void;
}

export const DetailedEmployeeReportModal: React.FC<DetailedEmployeeReportModalProps> = ({
  employee,
  allDates,
  allEmployees,
  isOpen,
  onClose,
  onSelectEmployee
}) => {
  const [showAllDays, setShowAllDays] = useState(true);

  if (!isOpen || !employee) return null;

  // Process all days of the period (all days and hours verbatim)
  const allDaysProcessed = allDates.map((d) => {
    const hours = employee.dailyHours[d] || 0;
    const fmt = formatDisplayDate(d);
    return {
      date: d,
      shortDate: fmt.shortDate,
      dayName: fmt.dayName,
      hours,
      hasHours: hours > 0
    };
  });

  const displayedDays = showAllDays 
    ? allDaysProcessed 
    : allDaysProcessed.filter((d) => d.hasHours);

  // Prev / Next employee
  const currentIndex = allEmployees.findIndex((e) => e.code === employee.code);
  const prevEmp = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmp = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportSingleEmployeeExcel(employee, allDates);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto text-left">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
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
                Official Overtime Audit Statement • Employee Code: <strong className="text-amber-400 font-mono">{employee.code}</strong>
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
                    Official Daily Overtime Audit Statement • Friday Rest Day: 2.0x Double Time
                  </p>
                </div>
              </div>
              <div className="text-left text-xs border border-black p-2 font-mono">
                <div><strong>Employee Code:</strong> {employee.code}</div>
                <div><strong>Name:</strong> {employee.name}</div>
                <div><strong>Department:</strong> {employee.department}</div>
                <div><strong>Friday 2x Hours:</strong> {employee.fridayHours || 0} hrs</div>
                <div><strong>Total Overtime Hours:</strong> {employee.totalHours} hrs</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Screen) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left">
              <span className="text-xs text-amber-300 font-semibold block mb-1">Total Overtime Hours</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {employee.totalHours} <span className="text-xs font-normal text-amber-300/80 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-left">
              <span className="text-xs text-indigo-300 font-black block mb-1">Friday 2x (Double Time)</span>
              <div className="text-2xl font-black text-indigo-400 font-mono">
                {employee.fridayHours || 0} <span className="text-xs font-normal text-indigo-300 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Recorded OT Days</span>
              <div className="text-xl font-black text-white font-mono">
                {employee.daysCount} <span className="text-xs font-normal text-slate-400 font-sans">days</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Total Period Days</span>
              <div className="text-xl font-black text-white font-mono">
                {allDates.length} <span className="text-xs font-normal text-slate-400 font-sans">days</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Daily Average</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {employee.daysCount > 0 ? (employee.totalHours / employee.daysCount).toFixed(1) : 0} <span className="text-xs font-normal text-slate-400 font-sans">hrs/day</span>
              </div>
            </div>
          </div>

          {/* Section 1: Horizontal Matrix Strip exactly like outside in table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 print:border-black print:bg-white no-print">
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Consolidated Period Row (Identical to outer table row)</span>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">Horizontal View</span>
            </div>

            <div className="overflow-x-auto p-2">
              <table className="w-full text-center text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-[11px]">
                    <th className="py-2 px-3 border border-slate-800 font-sans text-left">Code</th>
                    <th className="py-2 px-3 border border-slate-800 font-sans text-left">Name</th>
                    <th className="py-2 px-3 border border-slate-800 font-sans text-left">Department</th>
                    {allDates.map((d) => (
                      <th key={d} className="py-2 px-2 border border-slate-800 whitespace-nowrap">
                        <div>{d}</div>
                      </th>
                    ))}
                    <th className="py-2 px-3 border border-slate-800 bg-indigo-900/30 text-indigo-300 font-bold whitespace-nowrap">
                      Friday 2x
                    </th>
                    <th className="py-2 px-3 border border-slate-800 bg-amber-500/10 text-amber-300 font-bold whitespace-nowrap">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-950/40">
                    <td className="py-2 px-3 border border-slate-800 font-bold text-amber-400 text-left">
                      {employee.code}
                    </td>
                    <td className="py-2 px-3 border border-slate-800 font-sans font-medium text-white text-left whitespace-nowrap">
                      {employee.name}
                    </td>
                    <td className="py-2 px-3 border border-slate-800 font-sans text-slate-300 text-left whitespace-nowrap text-[11px]">
                      {employee.department}
                    </td>
                    {allDates.map((d) => {
                      const h = employee.dailyHours[d];
                      const isFri = checkIsFriday(d);
                      return (
                        <td key={d} className={`py-2 px-2 border border-slate-800 ${isFri ? 'bg-indigo-950/30' : ''}`}>
                          {h !== undefined && h > 0 ? (
                            <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">
                              {h}
                            </span>
                          ) : isFri ? (
                            ''
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 border border-slate-800 font-black text-indigo-300 text-sm bg-indigo-950/30 whitespace-nowrap">
                      {employee.fridayHours || 0} hrs
                    </td>
                    <td className="py-2 px-3 border border-slate-800 font-black text-amber-400 text-sm bg-amber-500/10 whitespace-nowrap">
                      {employee.totalHours} hrs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Detailed Day-by-Day Table Ready for Print */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 print:border-black print:bg-white">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Itemized Daily Overtime Log (Ready for Certified Audit Print)</span>
              </span>

              {/* Toggle to show all days vs only overtime days */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                <button
                  onClick={() => setShowAllDays(true)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    showAllDays ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Period Days ({allDates.length} days)
                </button>
                <button
                  onClick={() => setShowAllDays(false)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    !showAllDays ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overtime Days Only ({employee.daysCount} days)
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-bold print:bg-gray-200 print:text-black print:border-black">
                  <th className="py-2.5 px-4 w-12 text-center border-r border-slate-800 print:border-black">#</th>
                  <th className="py-2.5 px-4 border-r border-slate-800 print:border-black">Date (From File Name)</th>
                  <th className="py-2.5 px-4 border-r border-slate-800 print:border-black">Day of Week</th>
                  <th className="py-2.5 px-4 border-r border-slate-800 print:border-black">Status</th>
                  <th className="py-2.5 px-4 text-right">Overtime Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono print:divide-black print:text-black">
                {displayedDays.map((item, idx) => (
                  <tr 
                    key={item.date} 
                    className={`transition-colors print:hover:bg-transparent ${
                      item.hasHours ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center text-slate-500 font-sans border-r border-slate-800/60 print:border-black print:text-black">
                      {idx + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-4 font-bold border-r border-slate-800/60 print:border-black print:text-black">
                      <span className={`px-2 py-0.5 rounded ${
                        item.hasHours 
                          ? 'bg-slate-800 text-amber-300 border border-slate-700 print:bg-transparent print:border-none print:text-black' 
                          : 'text-slate-400 print:text-black'
                      }`}>
                        {item.date}
                      </span>
                    </td>

                    {/* Day Name */}
                    <td className="py-2.5 px-4 font-sans text-slate-300 border-r border-slate-800/60 print:border-black print:text-black">
                      {item.dayName || '-'}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-4 font-sans border-r border-slate-800/60 print:border-black print:text-black text-[11px]">
                      {item.hasHours ? (
                        <span className="text-emerald-400 font-black print:text-black">
                          ✓ Recorded Overtime
                        </span>
                      ) : checkIsFriday(item.date) ? (
                        <span className="text-indigo-400 print:text-black font-medium">
                          Weekly Holiday (Friday)
                        </span>
                      ) : (
                        <span className="text-slate-500 print:text-black">
                          No Overtime
                        </span>
                      )}
                    </td>

                    {/* Hours */}
                    <td className="py-2.5 px-4 text-right font-black text-sm">
                      {item.hasHours ? (
                        <span className="text-amber-400 print:text-black">
                          {item.hours} <span className="text-xs font-normal text-slate-400 font-sans print:text-black">hrs</span>
                        </span>
                      ) : checkIsFriday(item.date) ? (
                        ''
                      ) : (
                        <span className="text-slate-600 print:text-black font-normal">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Footer Row */}
              <tfoot>
                <tr className="bg-amber-500/10 border-t-2 border-amber-500/40 text-amber-300 font-bold print:bg-gray-100 print:text-black print:border-black">
                  <td colSpan={4} className="py-3 px-4 font-sans text-sm print:text-black text-left border-r border-slate-800 print:border-black">
                    Total Overtime Hours:
                  </td>
                  <td className="py-3 px-4 text-right text-base font-black font-mono text-amber-400 print:text-black">
                    {employee.totalHours} <span className="text-xs font-normal text-amber-300 font-sans print:text-black">hrs</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between no-print flex-wrap gap-2">
          <div className="text-xs text-slate-400">
            Dossier: <strong className="text-white">{employee.name}</strong> • Dept: <strong className="text-slate-300">{employee.department}</strong> • Total: <strong className="text-amber-400 font-mono">{employee.totalHours} hrs</strong> in <strong className="text-white font-mono">{employee.daysCount} days</strong>
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
              <span>Print Audit Statement (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
