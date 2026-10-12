import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  User, 
  Clock, 
  FileText, 
  Printer, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { EmployeeAuditSummary } from '../types/audit';

interface AuditTableProps {
  summaries: EmployeeAuditSummary[];
  onSelectEmployee: (emp: EmployeeAuditSummary) => void;
  onPrintEmployeeSlip: (emp: EmployeeAuditSummary) => void;
  onToggleAuditMark: (code: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

type SortField = 'code' | 'name' | 'department' | 'overtime' | 'present' | 'absent' | 'flags';

export const AuditTable: React.FC<AuditTableProps> = ({
  summaries,
  onSelectEmployee,
  onPrintEmployeeSlip,
  onToggleAuditMark,
  activeFilter,
  onFilterChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Collect unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach((s) => {
      if (s.department && s.department !== 'Unspecified') {
        set.add(s.department);
      }
    });
    return Array.from(set).sort();
  }, [summaries]);

  // Filtering
  const filteredSummaries = useMemo(() => {
    return summaries.filter((emp) => {
      // 1. Text search
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchCode = emp.code.toLowerCase().includes(term);
        const matchName = emp.name.toLowerCase().includes(term);
        const matchDept = emp.department.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchDept) return false;
      }

      // 2. Department filter
      if (selectedDept !== 'all' && emp.department !== selectedDept) {
        return false;
      }

      // 3. Status filter
      if (activeFilter === 'danger') {
        return emp.flags.some((f) => f.type === 'danger');
      }
      if (activeFilter === 'warning') {
        return emp.flags.some((f) => f.type === 'warning');
      }
      if (activeFilter === 'clean') {
        return emp.flags.length === 0;
      }
      if (activeFilter === 'has_overtime') {
        return emp.totalOvertimeHours > 0;
      }
      if (activeFilter === 'high_absence') {
        return emp.absentDays >= 2;
      }
      if (activeFilter === 'audited') {
        return emp.isAudited;
      }

      return true;
    });
  }, [summaries, searchTerm, selectedDept, activeFilter]);

  // Sorting
  const sortedSummaries = useMemo(() => {
    return [...filteredSummaries].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'code') {
        const numA = parseInt(a.code, 10);
        const numB = parseInt(b.code, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = a.code.localeCompare(b.code, 'ar');
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'ar');
      } else if (sortField === 'department') {
        comparison = a.department.localeCompare(b.department, 'ar');
      } else if (sortField === 'overtime') {
        comparison = a.totalOvertimeHours - b.totalOvertimeHours;
      } else if (sortField === 'present') {
        comparison = a.presentDays - b.presentDays;
      } else if (sortField === 'absent') {
        comparison = a.absentDays - b.absentDays;
      } else if (sortField === 'flags') {
        comparison = a.flags.length - b.flags.length;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredSummaries, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      
      {/* Controls & Filter Bar */}
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search by Code or Name */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Employee Code, name, or Department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Department Filter & Counts */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-medium"
              >
                <option value="all" className="bg-slate-900 text-white">All Departments({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-800 font-mono">
              Showing: <span className="font-bold text-amber-400">{sortedSummaries.length}</span> of {summaries.length}
            </div>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-500 font-medium whitespace-nowrap">Quick Filters:</span>
          
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({summaries.length})
          </button>

          <button
            onClick={() => onFilterChange('danger')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'danger'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-900/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Critical Conflicts ({summaries.filter(s => s.flags.some(f => f.type === 'danger')).length})</span>
          </button>

          <button
            onClick={() => onFilterChange('clean')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'clean'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Compliant ({summaries.filter(s => s.flags.length === 0).length})</span>
          </button>

          <button
            onClick={() => onFilterChange('has_overtime')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'has_overtime'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Has Overtime ({summaries.filter(s => s.totalOvertimeHours > 0).length})</span>
          </button>

          <button
            onClick={() => onFilterChange('high_absence')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeFilter === 'high_absence'
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Frequent Absence ({summaries.filter(s => s.absentDays >= 2).length})
          </button>

          <button
            onClick={() => onFilterChange('audited')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'audited'
                ? 'bg-blue-500 text-white font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Check className="w-3.5 h-3.5 text-blue-400" />
            <span>Reviewed ({summaries.filter(s => s.isAudited).length})</span>
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold select-none">
              
              <th className="py-3 px-4 w-12 text-center">
                <span>Confirm</span>
              </th>

              <th 
                onClick={() => handleSort('code')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Employee Code</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Employee Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('department')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('overtime')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400 transition-colors bg-amber-500/5 text-amber-300"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Overtime Hours</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-400/50" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('present')}
                className="py-3 px-4 cursor-pointer hover:text-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Present Days</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('absent')}
                className="py-3 px-4 cursor-pointer hover:text-rose-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Absent Days</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-4 text-slate-400">
                <span>OT Days</span>
              </th>

              <th 
                onClick={() => handleSort('flags')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Audit Remarks</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              <th className="py-3 px-4 text-center">
                <span>Employee Report</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {sortedSummaries.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">No records matching search criteria</p>
                  <p className="text-[11px] mt-1">Try adjusting the filter or searching for another employee code</p>
                </td>
              </tr>
            ) : (
              sortedSummaries.map((emp) => {
                const hasDanger = emp.flags.some((f) => f.type === 'danger');
                const hasWarning = emp.flags.some((f) => f.type === 'warning');

                return (
                  <tr
                    key={emp.code}
                    className={`transition-colors group hover:bg-slate-800/50 ${
                      hasDanger
                        ? 'bg-rose-950/20'
                        : emp.isAudited
                        ? 'bg-blue-950/10'
                        : ''
                    }`}
                  >
                    {/* Audit Checkbox toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAuditMark(emp.code);
                        }}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-all mx-auto ${
                          emp.isAudited
                            ? 'bg-emerald-500 text-slate-950'
                            : 'border border-slate-700 hover:border-slate-500 text-transparent'
                        }`}
                        title={emp.isAudited ? 'Employee reviewed and approved' : 'Click to mark as reviewed'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* Employee Code */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-amber-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs">
                        {emp.code}
                      </span>
                    </td>

                    {/* Employee Name */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-white">
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="hover:text-amber-400 transition-colors text-left flex items-center gap-1.5"
                      >
                        <span>{emp.name}</span>
                      </button>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/60 border border-slate-800 text-slate-300">
                        {emp.department}
                      </span>
                    </td>

                    {/* Total Overtime Hours */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-sm bg-amber-500/5">
                      {emp.totalOvertimeHours > 0 ? (
                        <span className="text-amber-400">
                          {emp.totalOvertimeHours} <span className="text-[10px] text-amber-500/80 font-normal font-sans">hrs</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Present Days */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold">
                      <span className="text-emerald-400 font-bold">{emp.presentDays}</span>
                      <span className="text-[10px] text-slate-500 ml-1">days ({emp.attendanceRate}%)</span>
                    </td>

                    {/* Absent Days */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold">
                      {emp.absentDays > 0 ? (
                        <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          {emp.absentDays} days
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>

                    {/* Overtime Days Count */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      {emp.overtimeDaysCount > 0 ? (
                        <span>{emp.overtimeDaysCount} days</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Audit Flags */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {hasDanger ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Severe Conflict!</span>
                        </span>
                      ) : hasWarning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Audit Flag ({emp.flags.length})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Compliant</span>
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectEmployee(emp)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
                          title="View detailed employee daily breakdown"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Report</span>
                          <ChevronRight className="w-3 h-3 text-amber-400" />
                        </button>

                        <button
                          onClick={() => onPrintEmployeeSlip(emp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="Print official audit slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
        <div>
          Total Displayed Overtime Hours:{' '}
          <strong className="text-amber-400 font-mono">
            {sortedSummaries.reduce((a, b) => a + b.totalOvertimeHours, 0).toFixed(1)}
          </strong>{' '}
          hrs
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Matched</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Audit Warning</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Audit Conflict (OT on Absent Days)</span>
          </span>
        </div>
      </div>

    </div>
  );
};
