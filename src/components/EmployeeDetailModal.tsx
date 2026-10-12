import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Printer, 
  Download, 
  Clock, 
  Calendar, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Building,
  Save,
  Check,
  FileCheck
} from 'lucide-react';
import { EmployeeAuditSummary, AuditCompanyInfo } from '../types/audit';
import { exportSingleEmployeeAuditToExcel } from '../utils/excelExporter';

interface EmployeeDetailModalProps {
  employee: EmployeeAuditSummary | null;
  allEmployees: EmployeeAuditSummary[];
  companyInfo: AuditCompanyInfo;
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (emp: EmployeeAuditSummary) => void;
  onSaveManualNote: (code: string, note: string) => void;
  onToggleAuditMark: (code: string) => void;
  onPrintSlip: (emp: EmployeeAuditSummary) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  allEmployees,
  companyInfo,
  isOpen,
  onClose,
  onSelectEmployee,
  onSaveManualNote,
  onToggleAuditMark,
  onPrintSlip
}) => {
  const [noteText, setNoteText] = useState(employee?.manualNote || '');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    setNoteText(employee?.manualNote || '');
  }, [employee?.code, employee?.manualNote]);

  if (!isOpen || !employee) return null;

  // Find index for Prev / Next navigation
  const currentIndex = allEmployees.findIndex((e) => e.code === employee.code);
  const prevEmployee = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmployee = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  const handleSaveNote = () => {
    onSaveManualNote(employee.code, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleExportSingleExcel = () => {
    exportSingleEmployeeAuditToExcel(employee, companyInfo);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-lg">
              {employee.code}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">
                  {employee.name}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>{employee.department}</span>
                </span>
                {employee.isAudited && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Approved & Audited</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed Employee Audit Statement for (Code: <span className="font-mono text-amber-400 font-bold">{employee.code}</span>) • {companyInfo.auditPeriod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next navigation */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 ml-2">
              <button
                disabled={!prevEmployee}
                onClick={() => prevEmployee && onSelectEmployee(prevEmployee)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Employee"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-400">
                {currentIndex + 1} / {allEmployees.length}
              </span>
              <button
                disabled={!nextEmployee}
                onClick={() => nextEmployee && onSelectEmployee(nextEmployee)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Employee"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Key Metrics Cards for this single employee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Actual Present Days</span>
              <div className="text-xl font-black text-emerald-400">
                {employee.presentDays} <span className="text-xs font-normal text-slate-400">days</span>
              </div>
              <span className="text-[11px] text-slate-500">Attendance: {employee.attendanceRate}%</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Absent Days</span>
              <div className="text-xl font-black text-rose-400">
                {employee.absentDays} <span className="text-xs font-normal text-slate-400">days</span>
              </div>
              <span className="text-[11px] text-slate-500">Unexcused</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
              <span className="text-xs text-amber-300 block mb-1">Total Overtime Hours</span>
              <div className="text-xl font-black text-amber-400">
                {employee.totalOvertimeHours} <span className="text-xs font-normal text-amber-300/80">hrs</span>
              </div>
              <span className="text-[11px] text-amber-400/80">Across {employee.overtimeDaysCount} OT days</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
              <span className="text-xs text-slate-400 block mb-1">Daily OT Average</span>
              <div className="text-xl font-black text-white">
                {employee.avgDailyOvertime} <span className="text-xs font-normal text-slate-400">hrs/day</span>
              </div>
              <span className="text-[11px] text-slate-500">Max Day: {employee.maxSingleDayOvertime} hrs</span>
            </div>

          </div>

          {/* Audit Flags for this specific employee */}
          {employee.flags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Audit Alerts & Discrepancies ({employee.flags.length})</span>
              </h4>
              <div className="space-y-2">
                {employee.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                      flag.type === 'danger'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : 'bg-amber-950/30 border-amber-800 text-amber-200'
                    }`}
                  >
                    {flag.type === 'danger' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block font-bold">{flag.title}</strong>
                      <span className="opacity-90">{flag.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day by Day Log Table */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Daily Log Detail (Attendance, Punches & Overtime Hours)</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                {employee.dailyEntries.length} logged days
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Punch Times</th>
                    <th className="py-2.5 px-3 text-amber-300 bg-amber-500/5">Overtime Hours</th>
                    <th className="py-2.5 px-3">Source Sheet</th>
                    <th className="py-2.5 px-3">Remarks & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {employee.dailyEntries.map((day) => {
                    const isOtDay = day.overtimeHours > 0;
                    return (
                      <tr
                        key={day.date}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          day.isConflict
                            ? 'bg-rose-950/30 text-rose-200'
                            : isOtDay
                            ? 'bg-amber-500/5'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                          {day.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-sans text-slate-400">
                          {day.dayName}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                          {day.attendanceStatus === 'present' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                              Present
                            </span>
                          ) : day.attendanceStatus === 'absent' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                              Absent
                            </span>
                          ) : day.attendanceStatus === 'rest_day' ? (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                              Weekend
                            </span>
                          ) : day.attendanceStatus === 'sick' ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
                              Sick Leave
                            </span>
                          ) : day.attendanceStatus === 'leave' ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
                              Annual Leave
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                          {day.checkIn || day.checkOut ? (
                            <span>{day.checkIn || '--:--'} to {day.checkOut || '--:--'}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold bg-amber-500/5">
                          {day.overtimeHours > 0 ? (
                            <span className="text-amber-400">
                              {day.overtimeHours} <span className="text-[10px] font-normal text-amber-500 font-sans">hrs</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-400 font-sans truncate max-w-xs">
                          {day.overtimeSourceFiles.length > 0 ? (
                            <span>{day.overtimeSourceFiles.join(', ')}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-sans">
                          {day.conflictReason ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{day.conflictReason}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">{day.notes || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* HR Note & Audit Verification Box */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>HR Auditor Notes & Justification for this Employee</span>
              </span>
              <button
                onClick={() => onToggleAuditMark(employee.code)}
                className={`text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  employee.isAudited
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{employee.isAudited ? 'Employee Certified for Audit' : 'Mark as Certified'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add audit justification note (e.g. Overtime authorization slip #401 verified)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSaveNote}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>

            {noteSaved && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Note saved and included in Excel export and official audit report!</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Print this statement individually for external auditor submission or personnel file attachment
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSingleExcel}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Employee Report (Excel)</span>
            </button>

            <button
              onClick={() => onPrintSlip(employee)}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print Audit Slip</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
