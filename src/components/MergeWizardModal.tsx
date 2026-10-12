import React, { useState } from 'react';
import { 
  X, 
  GitMerge, 
  FileSpreadsheet, 
  Files, 
  Download, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Code2, 
  Table, 
  Search,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { 
  MergedEmployeeRecord, 
  mergeAttendanceAndDailyOvertime, 
  exportSingleConsolidatedExcel 
} from '../utils/merger';
import { parseAttendanceFile, parseOvertimeFile } from '../utils/fileParser';
import { RawAttendanceRow, RawOvertimeRow } from '../types/audit';

interface MergeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAttendanceRows?: RawAttendanceRow[];
  initialOvertimeRows?: RawOvertimeRow[];
  onApplyToMainSuite?: (att: RawAttendanceRow[], ot: RawOvertimeRow[]) => void;
}

export const MergeWizardModal: React.FC<MergeWizardModalProps> = ({
  isOpen,
  onClose,
  initialAttendanceRows = [],
  initialOvertimeRows = [],
  onApplyToMainSuite
}) => {
  const [attFile, setAttFile] = useState<File | null>(null);
  const [otFiles, setOtFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLog, setProcessLog] = useState<string>('');
  
  // Stored rows for merging
  const [parsedAttendance, setParsedAttendance] = useState<RawAttendanceRow[]>(initialAttendanceRows);
  const [parsedOvertime, setParsedOvertime] = useState<RawOvertimeRow[]>(initialOvertimeRows);
  
  // Result
  const [mergedRecords, setMergedRecords] = useState<MergedEmployeeRecord[]>(() => {
    if (initialAttendanceRows.length > 0 || initialOvertimeRows.length > 0) {
      return mergeAttendanceAndDailyOvertime(initialAttendanceRows, initialOvertimeRows);
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Process uploaded files
  const handleRunMerge = async () => {
    setIsProcessing(true);
    setProcessLog('Execute Smart Merge Process...');

    try {
      let currentAtt = [...parsedAttendance];
      let currentOt = [...parsedOvertime];

      // If new attendance file selected
      if (attFile) {
        setProcessLog('Checking and parsing Master Attendance sheet...');
        const attRes = await parseAttendanceFile(attFile);
        currentAtt = attRes.rows;
        setParsedAttendance(currentAtt);
      }

      // If new overtime files selected
      if (otFiles.length > 0) {
        setProcessLog(`Reading and merging ${otFiles.length} separate daily overtime sheets...`);
        const allOt: RawOvertimeRow[] = [];
        for (let i = 0; i < otFiles.length; i++) {
          const res = await parseOvertimeFile(otFiles[i]);
          allOt.push(...res.rows);
        }
        currentOt = allOt;
        setParsedOvertime(currentOt);
      }

      setProcessLog('Merging records based on Employee Code as primary unique key...');
      const results = mergeAttendanceAndDailyOvertime(currentAtt, currentOt);
      setMergedRecords(results);
      setProcessLog(`Merge completed successfully! Generated consolidated roster for ${results.length} employees.`);
    } catch (err: any) {
      console.error(err);
      setProcessLog(`Merge error: ${err.message || 'Please check uploaded files'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (mergedRecords.length === 0) return;
    exportSingleConsolidatedExcel(mergedRecords);
  };

  const handleApply = () => {
    if (onApplyToMainSuite) {
      onApplyToMainSuite(parsedAttendance, parsedOvertime);
    }
    onClose();
  };

  // Filter preview records
  const filteredRecords = mergedRecords.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.employeeCode.toLowerCase().includes(term) ||
      r.employeeName.toLowerCase().includes(term) ||
      r.department.toLowerCase().includes(term)
    );
  });

  const pythonScript = `# Standalone Python script to merge Attendance Sheet with Daily Overtime Sheets by Employee Code
import pandas as pd
import glob

# 1. Read Master Attendance Sheet (Consolidated)
df_attendance = pd.read_excel('master_attendance.xlsx')

# Extract Employee Code, Name, Department and aggregate Present and Absent days
att_summary = df_attendance.groupby('Employee Code').agg(
    name=('Employee Name', 'first'),
    department=('Department', 'first'),
    present_days=('Status', lambda s: (s.astype(str).str.lower().isin(['present', 'p', '1'])).sum()),
    absent_days=('Status', lambda s: (s.astype(str).str.lower().isin(['absent', 'a', '0'])).sum())
).reset_index()

# 2. Read and merge all Separate Daily Overtime Sheets
ot_files = glob.glob('daily_overtime_*.xlsx')
ot_list = [pd.read_excel(f) for f in ot_files]
df_all_ot = pd.concat(ot_list, ignore_index=True)

# Sum total overtime hours per employee code
ot_summary = df_all_ot.groupby('Employee Code')['Overtime Hours'].sum().reset_index()
ot_summary.rename(columns={'Overtime Hours': 'total_overtime_hours'}, inplace=True)

# 3. Merge based on Employee Code as unique key (Outer Join)
merged_final = pd.merge(att_summary, ot_summary, on='Employee Code', how='outer')
merged_final['total_overtime_hours'] = merged_final['total_overtime_hours'].fillna(0)
merged_final['present_days'] = merged_final['present_days'].fillna(0)
merged_final['absent_days'] = merged_final['absent_days'].fillna(0)

# 4. Save final consolidated audit sheet
merged_final.to_excel('consolidated_master_audit.xlsx', index=False)
print("Merge completed successfully!")`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold">
              <GitMerge className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Merge Attendance & Daily Overtime Sheets Wizard
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">
                  Unique Key: Employee Code
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate a unified reconciled sheet: (Employee Code, Name, Department, Total OT Hours, Present Days, Absent Days)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Controls Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          
          {/* File 1: Master Attendance */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-blue-300 mb-1.5 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>1. Master Attendance Sheet</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setAttFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/30 file:text-blue-200 hover:file:bg-blue-600/40 bg-slate-950 border border-slate-800 rounded-xl p-1.5 cursor-pointer"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {parsedAttendance.length > 0 && !attFile ? `Pre-loaded (${parsedAttendance.length} attendance rows)` : attFile ? `Selected: ${attFile.name}` : 'Choose attendance file'}
            </span>
          </div>

          {/* Files 2: Multiple Daily Overtime Sheets */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <Files className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Daily Overtime Sheets (Multiple Files)</span>
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setOtFiles(Array.from(e.target.files || []))}
                className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 bg-slate-950 border border-slate-800 rounded-xl p-1.5 cursor-pointer"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {otFiles.length > 0 ? `${otFiles.length} daily sheets selected` : parsedOvertime.length > 0 ? `Pre-loaded (${parsedOvertime.length} overtime records)` : 'Select separate daily sheets'}
            </span>
          </div>

          {/* Trigger Merge Button */}
          <div className="md:col-span-3">
            <button
              onClick={handleRunMerge}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <GitMerge className="w-4 h-4 stroke-[2.5]" />
              <span>{isProcessing ? 'Merging Sheets...' : 'Run Merge Now'}</span>
            </button>
          </div>

        </div>

        {/* Process Status Notification */}
        {processLog && (
          <div className="px-6 py-2 bg-slate-950 text-xs text-amber-300 flex items-center gap-2 border-b border-slate-800 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{processLog}</span>
          </div>
        )}

        {/* Sub-Tabs: Results Preview vs Script Code */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'preview'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Consolidated Preview ({mergedRecords.length} Employees)</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'code'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Standalone Python Script</span>
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-56"
              />
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Total Merged Employees</span>
                  <div className="text-xl font-bold font-mono text-white">{mergedRecords.length}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Total Overtime Hours</span>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {mergedRecords.reduce((acc, r) => acc + r.totalOvertimeHours, 0).toFixed(1)} hrs
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Total Present Days</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {mergedRecords.reduce((acc, r) => acc + r.presentDaysCount, 0)} days
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Total Absent Days</span>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    {mergedRecords.reduce((acc, r) => acc + r.absentDaysCount, 0)} days
                  </div>
                </div>
              </div>

              {/* Table of merged output */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold select-none">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 text-amber-300">Employee Code</th>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3 text-amber-400 bg-amber-500/5">Total Overtime Hours</th>
                      <th className="py-2.5 px-3 text-emerald-400">Present Days</th>
                      <th className="py-2.5 px-3 text-rose-400">Absent Days</th>
                      <th className="py-2.5 px-3 text-slate-400">OT Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                          No data to display. Click &quot;Run Merge Now&quot; to process the sheets.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec, idx) => (
                        <tr key={rec.employeeCode} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-amber-400">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {rec.employeeCode}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans font-medium text-white">{rec.employeeName}</td>
                          <td className="py-2 px-3 font-sans text-slate-300">{rec.department}</td>
                          <td className="py-2 px-3 font-bold text-amber-400 bg-amber-500/5">
                            {rec.totalOvertimeHours > 0 ? `${rec.totalOvertimeHours} hrs` : '-'}
                          </td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">
                            {rec.presentDaysCount} days
                          </td>
                          <td className="py-2 px-3">
                            {rec.absentDaysCount > 0 ? (
                              <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                {rec.absentDaysCount} days
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 font-sans">
                            {rec.overtimeDaysCount > 0 ? `${rec.overtimeDaysCount} days` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-sans leading-relaxed">
                  Standalone script to run in Python / Pandas offline or share with IT:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto text-left">
                <code>{pythonScript}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Unified by Employee Code as primary identifier</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={mergedRecords.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Consolidated Excel (.xlsx)</span>
            </button>

            {onApplyToMainSuite && (
              <button
                onClick={handleApply}
                disabled={mergedRecords.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <span>Apply to Audit Suite</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
