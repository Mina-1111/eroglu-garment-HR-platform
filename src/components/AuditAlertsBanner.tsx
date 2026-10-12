import React from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import { EmployeeAuditSummary } from '../types/audit';

interface AuditAlertsBannerProps {
  summaries: EmployeeAuditSummary[];
  onSelectEmployee: (emp: EmployeeAuditSummary) => void;
  onFilterDanger: () => void;
}

export const AuditAlertsBanner: React.FC<AuditAlertsBannerProps> = ({
  summaries,
  onSelectEmployee,
  onFilterDanger
}) => {
  // Collect all danger flags (overtime on absent day, ghost workers, etc.)
  const criticalEmployees = summaries.filter((s) => s.flags.some((f) => f.type === 'danger'));
  const warningEmployees = summaries.filter((s) => 
    s.flags.some((f) => f.type === 'warning') && !s.flags.some((f) => f.type === 'danger')
  );

  if (criticalEmployees.length === 0 && warningEmployees.length === 0) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-300">
              Attendance & Overtime Records Fully Reconciled
            </h4>
            <p className="text-[11px] text-emerald-400/80">
              No conflicts detected between daily overtime sheets and master attendance records.
            </p>
          </div>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          Audit Ready
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {criticalEmployees.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-rose-200">
                    Urgent Audit Alert: Detected {criticalEmployees.length} employee(s) with severe attendance/overtime conflicts!
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black">
                    Audit Flag
                  </span>
                </div>
                <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                  Overtime hours are logged on days when the employee was marked absent or unlisted in the attendance roster. These discrepancies cause critical audit infractions!
                </p>
                
                {/* List affected employees chips */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-xs font-semibold text-rose-300">Flagged Employees:</span>
                  {criticalEmployees.map((emp) => (
                    <button
                      key={emp.code}
                      onClick={() => onSelectEmployee(emp)}
                      className="text-xs px-2.5 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-rose-100 border border-rose-700/60 flex items-center gap-1 transition-all"
                    >
                      <span className="font-mono font-bold">{emp.code}</span>
                      <span>({emp.name})</span>
                      <ArrowLeft className="w-3 h-3 text-rose-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onFilterDanger}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
            >
              Filter Critical Only
            </button>
          </div>
        </div>
      )}

      {warningEmployees.length > 0 && criticalEmployees.length === 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300">
                Notice: {warningEmployees.length} employee(s) have elevated overtime or frequent absences
              </h4>
              <p className="text-[11px] text-amber-400/80">
                Ensure authorized overtime work permits and valid leave documentation are attached to the audit dossier.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
