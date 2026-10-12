import React from 'react';
import { X, Printer, Download, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { EmployeeOvertimeSummary } from '../types/overtime';
import { exportSingleEmployeeExcel } from '../utils/simpleExcelExport';

interface SimpleEmployeeModalProps {
  employee: EmployeeOvertimeSummary | null;
  allDates: string[];
  allEmployees: EmployeeOvertimeSummary[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (emp: EmployeeOvertimeSummary) => void;
}

export const SimpleEmployeeModal: React.FC<SimpleEmployeeModalProps> = ({
  employee,
  allDates,
  allEmployees,
  isOpen,
  onClose,
  onSelectEmployee
}) => {
  if (!isOpen || !employee) return null;

  // Filter only dates that have hours for this employee
  const activeDays = allDates
    .filter((d) => (employee.dailyHours[d] || 0) > 0)
    .map((d) => ({
      date: d,
      hours: employee.dailyHours[d]
    }));

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto text-left">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-base">
              {employee.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{employee.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {employee.department}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Itemized Daily Overtime Log &amp; Certified Total Hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next */}
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content */}
        <div id="printable-employee-slip" className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Top Quick Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
              <span className="text-xs text-amber-300 block mb-1">Total Overtime Hours</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {employee.totalHours} <span className="text-xs font-normal text-amber-300/80 font-sans">hrs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Recorded Overtime Days</span>
              <div className="text-2xl font-black text-white font-mono">
                {employee.daysCount} <span className="text-xs font-normal text-slate-400 font-sans">days</span>
              </div>
            </div>
          </div>

          {/* Table: Each day separately with hours, and total at the end */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-bold">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Overtime Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeDays.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 font-sans">
                      No overtime hours recorded for this employee
                    </td>
                  </tr>
                ) : (
                  activeDays.map((item, idx) => (
                    <tr key={item.date} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-slate-200 font-semibold flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.date}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-400 text-sm">
                        {item.hours} <span className="text-xs font-normal text-slate-400 font-sans">hrs</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Total Row at the End */}
              <tfoot>
                <tr className="bg-amber-500/10 border-t-2 border-amber-500/30 text-amber-300 font-bold">
                  <td colSpan={2} className="py-3 px-4 font-sans text-sm">
                    Total Overtime Hours:
                  </td>
                  <td className="py-3 px-4 text-right text-base font-black font-mono text-amber-400">
                    {employee.totalHours} <span className="text-xs font-normal text-amber-300 font-sans">hrs</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Employee Code: <strong className="text-white font-mono">{employee.code}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
