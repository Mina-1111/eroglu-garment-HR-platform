import React from 'react';
import { EmployeeAuditSummary, AuditCompanyInfo } from '../types/audit';

interface PrintableAuditSlipProps {
  employee: EmployeeAuditSummary | null;
  masterSummaries?: EmployeeAuditSummary[];
  companyInfo: AuditCompanyInfo;
  mode: 'single' | 'master';
}

export const PrintableAuditSlip: React.FC<PrintableAuditSlipProps> = ({
  employee,
  masterSummaries,
  companyInfo,
  mode
}) => {
  if (mode === 'single' && employee) {
    return (
      <div id="printable-audit-slip" className="hidden print:block text-black bg-white p-8 font-sans text-sm">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black">{companyInfo.companyName}</h1>
            <p className="text-xs text-gray-700 font-semibold mt-1">Human Resources & Administrative Affairs Department</p>
            <p className="text-xs text-gray-600 font-medium">Reconciled Attendance & Overtime Operating Hours — Official Audit Statement</p>
          </div>
          <div className="text-left border border-black p-3 text-xs leading-relaxed">
            <div><strong>Review Type:</strong> {companyInfo.auditName}</div>
            <div><strong>Audit Period:</strong> {companyInfo.auditPeriod}</div>
            <div><strong>Generated Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Employee Info Block */}
        <div className="bg-gray-100 border border-gray-400 p-4 rounded mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-600 block">Employee Code:</span>
              <span className="text-base font-black font-mono">{employee.code}</span>
            </div>
            <div>
              <span className="text-xs text-gray-600 block">Employee Full Name:</span>
              <span className="text-base font-bold">{employee.name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-600 block">Department / Section:</span>
              <span className="text-base font-bold">{employee.department}</span>
            </div>
          </div>
        </div>

        {/* KPI Audit Summary Table */}
        <table className="w-full border-collapse border border-black mb-6 text-center text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2">Actual Present Days</th>
              <th className="border border-black p-2">Unexcused Absent Days</th>
              <th className="border border-black p-2">Leaves & Holidays</th>
              <th className="border border-black p-2">Total Overtime Hours</th>
              <th className="border border-black p-2">OT Days Count</th>
              <th className="border border-black p-2">Attendance Rate</th>
              <th className="border border-black p-2">Audit Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold">
              <td className="border border-black p-2 text-sm">{employee.presentDays} days</td>
              <td className="border border-black p-2 text-sm">{employee.absentDays} days</td>
              <td className="border border-black p-2">{employee.restDays + employee.leaveDays} days</td>
              <td className="border border-black p-2 text-sm text-black">{employee.totalOvertimeHours} hrs</td>
              <td className="border border-black p-2">{employee.overtimeDaysCount} days</td>
              <td className="border border-black p-2">{employee.attendanceRate}%</td>
              <td className="border border-black p-2">
                {employee.flags.length === 0 ? 'Compliant & Approved' : `${employee.flags.length} Flag(s) Detected`}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Audit Remarks if any */}
        {employee.flags.length > 0 && (
          <div className="border border-black p-3 mb-6 bg-gray-50 text-xs">
            <strong className="block font-bold mb-1 text-black">Audit Review Team Findings:</strong>
            <ul className="list-disc list-inside space-y-1">
              {employee.flags.map((f) => (
                <li key={f.id}>
                  <strong>{f.title}:</strong> {f.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {employee.manualNote && (
          <div className="border border-black p-3 mb-6 bg-gray-50 text-xs">
            <strong>HR Manager Justification & Certification:</strong>
            <p className="mt-1">{employee.manualNote}</p>
          </div>
        )}

        {/* Daily Breakdown for Overtime & Attendance */}
        <h3 className="font-bold text-xs mb-2">Detailed Log of Overtime or Absent Days:</h3>
        <table className="w-full border-collapse border border-black mb-8 text-xs text-left">
          <thead>
            <tr className="bg-gray-200 text-center">
              <th className="border border-black p-1.5 w-10">#</th>
              <th className="border border-black p-1.5">Date</th>
              <th className="border border-black p-1.5">Day</th>
              <th className="border border-black p-1.5">Attendance Status</th>
              <th className="border border-black p-1.5">Overtime Hours</th>
              <th className="border border-black p-1.5">Source Daily Sheet</th>
              <th className="border border-black p-1.5">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {employee.dailyEntries
              .filter((d) => d.overtimeHours > 0 || d.attendanceStatus === 'absent' || d.isConflict)
              .map((d, idx) => (
                <tr key={d.date} className="text-center">
                  <td className="border border-black p-1.5">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-mono">{d.date}</td>
                  <td className="border border-black p-1.5">{d.dayName}</td>
                  <td className="border border-black p-1.5">
                    {d.attendanceStatus === 'present' ? 'Present' : d.attendanceStatus === 'absent' ? 'Absent' : d.attendanceStatus}
                  </td>
                  <td className="border border-black p-1.5 font-bold font-mono">
                    {d.overtimeHours > 0 ? `${d.overtimeHours} hrs` : '-'}
                  </td>
                  <td className="border border-black p-1.5 text-[10px] text-left">{d.overtimeSourceFiles.join(', ') || '-'}</td>
                  <td className="border border-black p-1.5 text-left">{d.conflictReason || d.notes || '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Master Summary Print
  if (mode === 'master' && masterSummaries) {
    return (
      <div id="printable-master-audit" className="hidden print:block text-black bg-white p-8 font-sans text-sm">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black">{companyInfo.companyName}</h1>
            <p className="text-xs text-gray-700 font-semibold mt-1">Consolidated Master Attendance & Overtime Reconciliation Sheet</p>
          </div>
          <div className="text-left border border-black p-2 text-xs">
            <div><strong>Audit Period:</strong> {companyInfo.auditPeriod}</div>
            <div><strong>Total Enrolled:</strong> {masterSummaries.length} employees</div>
            <div><strong>Printed Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Master Table */}
        <table className="w-full border-collapse border border-black text-xs text-left">
          <thead>
            <tr className="bg-gray-200 text-center">
              <th className="border border-black p-1 w-8">#</th>
              <th className="border border-black p-1">Code</th>
              <th className="border border-black p-1">Employee Name</th>
              <th className="border border-black p-1">Department</th>
              <th className="border border-black p-1">Present</th>
              <th className="border border-black p-1">Absent</th>
              <th className="border border-black p-1">Total OT Hours</th>
              <th className="border border-black p-1">OT Days</th>
              <th className="border border-black p-1">Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {masterSummaries.map((emp, i) => (
              <tr key={emp.code} className="text-center">
                <td className="border border-black p-1">{i + 1}</td>
                <td className="border border-black p-1 font-mono font-bold">{emp.code}</td>
                <td className="border border-black p-1 text-left font-medium">{emp.name}</td>
                <td className="border border-black p-1 text-left">{emp.department}</td>
                <td className="border border-black p-1">{emp.presentDays}</td>
                <td className="border border-black p-1 font-bold">{emp.absentDays}</td>
                <td className="border border-black p-1 font-bold font-mono">{emp.totalOvertimeHours}</td>
                <td className="border border-black p-1">{emp.overtimeDaysCount}</td>
                <td className="border border-black p-1 text-[10px]">
                  {emp.flags.some(f => f.type === 'danger') ? 'Conflict!' : emp.flags.length > 0 ? 'Warning' : 'Compliant'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
};
