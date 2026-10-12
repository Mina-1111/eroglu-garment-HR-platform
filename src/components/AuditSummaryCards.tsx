import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';
import { EmployeeAuditSummary } from '../types/audit';

interface AuditSummaryCardsProps {
  summaries: EmployeeAuditSummary[];
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const AuditSummaryCards: React.FC<AuditSummaryCardsProps> = ({
  summaries,
  selectedFilter,
  onSelectFilter
}) => {
  const totalEmployees = summaries.length;
  const totalPresentDays = summaries.reduce((acc, curr) => acc + curr.presentDays, 0);
  const totalAbsentDays = summaries.reduce((acc, curr) => acc + curr.absentDays, 0);
  const totalOvertimeHours = Number(
    summaries.reduce((acc, curr) => acc + curr.totalOvertimeHours, 0).toFixed(1)
  );

  // Anomaly & Warning counts
  const employeesWithDanger = summaries.filter((s) => s.flags.some((f) => f.type === 'danger'));
  const employeesWithWarning = summaries.filter((s) => s.flags.some((f) => f.type === 'warning'));
  const employeesClean = summaries.filter((s) => s.flags.length === 0);

  const totalRecordedWork = totalPresentDays + totalAbsentDays;
  const overallAttendanceRate = totalRecordedWork > 0 
    ? Math.round((totalPresentDays / totalRecordedWork) * 100) 
    : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Total Employees */}
      <button
        onClick={() => onSelectFilter('all')}
        className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
          selectedFilter === 'all'
            ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-slate-400 font-medium">Total Employees</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-white">{totalEmployees}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">enrolled in report</div>
        </div>
      </button>

      {/* 2. Total Attended Days */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 text-left flex flex-col justify-between">
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-slate-400 font-medium">Actual Present Days</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-400">{totalPresentDays}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Attendance Rate: {overallAttendanceRate}%</div>
        </div>
      </div>

      {/* 3. Total Absent Days */}
      <button
        onClick={() => onSelectFilter('high_absence')}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          selectedFilter === 'high_absence'
            ? 'bg-slate-800/90 border-rose-500 shadow-md ring-1 ring-rose-500/50'
            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-slate-400 font-medium">Total Absent Days</span>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <UserX className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-rose-400">{totalAbsentDays}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Unexcused Absence</div>
        </div>
      </button>

      {/* 4. Total Overtime Hours */}
      <button
        onClick={() => onSelectFilter('has_overtime')}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          selectedFilter === 'has_overtime'
            ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-slate-400 font-medium">Total Overtime Hours</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-amber-400">{totalOvertimeHours} <span className="text-sm font-normal">hrs</span></div>
          <div className="text-[11px] text-slate-500 mt-0.5">Consolidated from sheets</div>
        </div>
      </button>

      {/* 5. Critical Audit Discrepancies */}
      <button
        onClick={() => onSelectFilter('danger')}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          selectedFilter === 'danger'
            ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/50'
            : employeesWithDanger.length > 0
            ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-rose-300 font-medium">Critical Audit Conflicts</span>
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-rose-400">{employeesWithDanger.length}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">
            {employeesWithDanger.length > 0 ? 'OT on Absent Days!' : 'Zero Conflicts'}
          </div>
        </div>
      </button>

      {/* 6. Clean / Audited employees */}
      <button
        onClick={() => onSelectFilter('clean')}
        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
          selectedFilter === 'clean'
            ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs text-slate-400 font-medium">Clean & Reconciled</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-400">{employeesClean.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready for Certification</div>
        </div>
      </button>
    </div>
  );
};
