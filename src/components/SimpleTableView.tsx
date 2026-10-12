import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, Download, Printer, User, Users, FileText, ArrowUpDown, Building } from 'lucide-react';
import { EmployeeOvertimeSummary } from '../types/overtime';
import { exportMatrixOvertimeExcel } from '../utils/simpleExcelExport';
import { checkIsFriday } from '../utils/biometricParser';

interface SimpleTableViewProps {
  employees: EmployeeOvertimeSummary[];
  allDates: string[];
  grandTotalHours: number;
  onSelectEmployee: (emp: EmployeeOvertimeSummary) => void;
}

export const SimpleTableView: React.FC<SimpleTableViewProps> = ({
  employees,
  allDates,
  grandTotalHours,
  onSelectEmployee
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [sortField, setSortField] = useState<'code' | 'name' | 'total'>('code');
  const [sortAsc, setSortAsc] = useState(true);

  // Unique departments (exact values from uploaded sheets)
  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    return Array.from(s).sort();
  }, [employees]);

  // Filtered employees
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDept !== 'all' && emp.department !== selectedDept) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const mCode = emp.code.toLowerCase().includes(term);
        const mName = emp.name.toLowerCase().includes(term);
        const mDept = emp.department.toLowerCase().includes(term);
        if (!mCode && !mName && !mDept) return false;
      }
      return true;
    });
  }, [employees, selectedDept, searchTerm]);

  // Sorted employees
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comp = 0;
      if (sortField === 'code') {
        const nA = parseInt(a.code, 10);
        const nB = parseInt(b.code, 10);
        if (!isNaN(nA) && !isNaN(nB)) comp = nA - nB;
        else comp = a.code.localeCompare(b.code, 'en');
      } else if (sortField === 'name') {
        comp = a.name.localeCompare(b.name, 'en');
      } else if (sortField === 'total') {
        comp = a.totalHours - b.totalHours;
      }
      return sortAsc ? comp : -comp;
    });
  }, [filtered, sortField, sortAsc]);

  const handleSort = (field: 'code' | 'name' | 'total') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportAll = () => {
    exportMatrixOvertimeExcel(sorted, allDates);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col text-left">
      
      {/* Top Filter and Actions Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, employee name, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Department Filter (verbatim values from sheet) */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer max-w-[180px]"
            title="Filter by Department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Counter and Export Button */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <span className="text-xs text-slate-500 font-mono">
            Showing <strong className="text-amber-700">{sorted.length}</strong> of {employees.length} employees
          </span>

          <button
            onClick={handleExportAll}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Export full consolidated overtime table to Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>

      </div>

      {/* Main Table: Shows Code, Name, Dept (exact), Date 1, Date 2, ..., Days Count, Total Hours */}
      <div className="overflow-x-auto max-h-[68vh]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold">
            <tr>
              <th className="py-3 px-3 w-10 text-center border-r border-slate-200">#</th>
              
              <th 
                onClick={() => handleSort('code')}
                className="py-3 px-3 cursor-pointer hover:text-amber-700 border-r border-slate-200 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 font-bold text-amber-700">
                  <span>Code</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-amber-700 border-r border-slate-200 whitespace-nowrap min-w-[160px]"
              >
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <span>Employee Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap text-slate-700">
                <span>Department (From Sheet)</span>
              </th>

              {/* Columns for each single day from uploaded file names */}
              {allDates.map((date) => {
                const isFri = checkIsFriday(date);
                return (
                  <th key={date} className={`py-3 px-2 text-center border-r border-slate-200 whitespace-nowrap font-mono text-[11px] min-w-[75px] ${
                    isFri ? 'bg-indigo-50/80 border-b-2 border-indigo-400' : 'bg-slate-50'
                  }`}>
                    <div className={`font-semibold ${isFri ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>{date}</div>
                    <div className={`text-[10px] ${isFri ? 'text-indigo-700 font-bold' : 'text-slate-500 font-normal'}`}>
                      {isFri ? 'Friday (2x)' : 'Daily Hours'}
                    </div>
                  </th>
                );
              })}

              {/* Number of days with OT */}
              <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap text-center text-slate-600">
                <span>Days Count</span>
              </th>

              {/* Friday 2x Column */}
              <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap text-center bg-indigo-50 text-indigo-900 font-bold min-w-[95px]">
                <div>2.0x Friday</div>
                <div className="text-[10px] text-indigo-700 font-normal">Double Time</div>
              </th>

              {/* Total Hours Column at the very end */}
              <th 
                onClick={() => handleSort('total')}
                className="py-3 px-4 cursor-pointer hover:text-amber-800 border-r border-slate-200 whitespace-nowrap bg-amber-50 text-amber-900 font-black text-center min-w-[120px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Total Hours</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-700/50" />
                </div>
              </th>

              <th className="py-3 px-3 text-center whitespace-nowrap text-slate-700">
                <span>Action / Slip</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={allDates.length + 8} className="py-16 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Table is empty and ready for upload</span>
                    <span className="text-xs text-slate-500 leading-relaxed">
                      Click the <strong className="text-amber-700">"Upload Sheet"</strong> button at the top to upload daily overtime sheets.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((emp, idx) => (
                <tr key={emp.code} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-200 font-sans">
                    {idx + 1}
                  </td>

                  {/* Code */}
                  <td className="py-2.5 px-3 font-bold text-amber-700 border-r border-slate-200 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                      {emp.code}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                    <button
                      onClick={() => onSelectEmployee(emp)}
                      className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                    >
                      {emp.name}
                    </button>
                  </td>

                  {/* Department (Verbatim from Sheet) */}
                  <td className="py-2.5 px-3 font-sans text-slate-700 border-r border-slate-200 whitespace-nowrap text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {emp.department}
                    </span>
                  </td>

                  {/* Hours for each date */}
                  {allDates.map((date) => {
                    const h = emp.dailyHours[date];
                    const isFri = checkIsFriday(date);
                    return (
                      <td key={date} className={`py-2.5 px-2 text-center border-r border-slate-200 whitespace-nowrap ${
                        isFri ? 'bg-indigo-50/20' : ''
                      }`}>
                        {h !== undefined && h > 0 ? (
                          <span className="font-bold text-slate-900 bg-amber-50/80 border border-amber-200 px-1.5 py-0.5 rounded">
                            {h}
                          </span>
                        ) : isFri ? (
                          ''
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Number of Days */}
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap text-slate-700 font-sans">
                    {emp.daysCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800">
                        {emp.daysCount} days
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Friday 2x Column */}
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-indigo-50/40">
                    {(emp.fridayHours && emp.fridayHours > 0) ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-100/90 text-indigo-900 border border-indigo-300 font-black text-xs">
                        {emp.fridayHours}h
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">0h</span>
                    )}
                  </td>

                  {/* Total Hours Column */}
                  <td className="py-2.5 px-4 text-center border-r border-slate-200 whitespace-nowrap bg-amber-50/50 font-black text-amber-800 text-sm">
                    {emp.totalHours > 0 ? (
                      <span>{emp.totalHours} <span className="text-[10px] font-normal text-amber-700 font-sans">hrs</span></span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  {/* Action button */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans">
                    <button
                      onClick={() => onSelectEmployee(emp)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 flex items-center gap-1 mx-auto transition-all cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3 h-3 text-amber-600" />
                      <span>Daily Slip</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Footer: Column totals for each day + Grand Total */}
          {sorted.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-slate-300 text-slate-800 font-mono">
              <tr>
                <td colSpan={4} className="py-3 px-4 font-bold font-sans text-xs text-amber-900 border-r border-slate-200 text-left">
                  Total Daily Overtime Hours (Sum):
                </td>

                {allDates.map((date) => {
                  const daySum = sorted.reduce((sum, e) => sum + (e.dailyHours[date] || 0), 0);
                  return (
                    <td key={date} className="py-3 px-2 text-center border-r border-slate-200 font-bold text-slate-800 bg-slate-50">
                      {daySum > 0 ? Number(daySum.toFixed(2)) : '-'}
                    </td>
                  );
                })}

                {/* Days Count footer placeholder */}
                <td className="py-3 px-3 text-center border-r border-slate-200 text-slate-400 font-sans text-xs">
                  -
                </td>

                {/* Friday 2x footer total */}
                <td className="py-3 px-3 text-center border-r border-slate-200 font-black text-indigo-950 bg-indigo-100/70 font-mono text-xs whitespace-nowrap">
                  {Number(sorted.reduce((sum, e) => sum + (e.fridayHours || 0), 0).toFixed(2))} <span className="text-[10px] font-normal text-indigo-800 font-sans">hrs</span>
                </td>

                {/* Grand Total */}
                <td className="py-3 px-4 text-center border-r border-slate-200 font-black text-base text-amber-800 bg-amber-50">
                  {Number(sorted.reduce((sum, e) => sum + e.totalHours, 0).toFixed(2))} <span className="text-xs font-normal text-amber-700 font-sans">hrs</span>
                </td>

                <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-500">
                  {sorted.length} Employees
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
};
