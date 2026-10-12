import React, { useState, useEffect } from 'react';
import { X, Upload, Files, CheckCircle2, ArrowRight, Calendar, FileText, Trash2, Fingerprint, Layers } from 'lucide-react';
import { parseOvertimeFile, parseAttendanceFile } from '../utils/fileParser';
import { extractDateFromFilenameSmart } from '../utils/dateExtractor';
import { parseMonthlyBiometricFile, normalizeDateIso, isSameDate } from '../utils/biometricParser';
import { RawDailyRecord } from '../types/overtime';
import { BiometricMonthlyDataset } from '../types/biometric';

interface SimpleUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesProcessed: (
    records: RawDailyRecord[],
    masterList: Record<string, { name: string; department: string }>
  ) => void;
  onBiometricProcessed?: (
    dataset: BiometricMonthlyDataset,
    holidays?: string[],
    baseSalary?: number
  ) => void;
  initialHolidays?: string[];
  initialBaseSalary?: number;
}

export const SimpleUploaderModal: React.FC<SimpleUploaderModalProps> = ({
  isOpen,
  onClose,
  onFilesProcessed,
  onBiometricProcessed,
  initialHolidays = [],
  initialBaseSalary = 0
}) => {
  const [activeTab, setActiveTab] = useState<'biometric' | 'daily'>('biometric');

  // Biometric sheet state
  const [biometricFile, setBiometricFile] = useState<File | null>(null);

  // Official Holidays state right at the start
  const [hasOfficialHolidays, setHasOfficialHolidays] = useState<boolean>(initialHolidays.length > 0);
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>(initialHolidays);
  const [customHolidayDate, setCustomHolidayDate] = useState<string>('');

  // Salary state
  const [baseSalaryInput, setBaseSalaryInput] = useState<number>(initialBaseSalary || 0);

  // Daily OT files state
  const [otFiles, setOtFiles] = useState<File[]>([]);
  const [fileDates, setFileDates] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [masterFile, setMasterFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialHolidays && initialHolidays.length > 0) {
        setSelectedHolidays(initialHolidays);
        setHasOfficialHolidays(true);
      }
      if (initialBaseSalary > 0) {
        setBaseSalaryInput(initialBaseSalary);
      }
    }
  }, [isOpen, initialHolidays, initialBaseSalary]);

  if (!isOpen) return null;

  const handleDailyFilesSelected = (files: File[]) => {
    setOtFiles(files);
    const dates = files.map((f) => extractDateFromFilenameSmart(f.name, selectedYear, selectedMonth));
    setFileDates(dates);
  };

  const handleMonthOrYearChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    if (otFiles.length > 0) {
      const dates = otFiles.map((f) => extractDateFromFilenameSmart(f.name, year, month));
      setFileDates(dates);
    }
  };

  const handleUpdateDate = (index: number, newDate: string) => {
    setFileDates((prev) => {
      const copy = [...prev];
      copy[index] = newDate;
      return copy;
    });
  };

  const handleRemoveFile = (index: number) => {
    setOtFiles((prev) => prev.filter((_, i) => i !== index));
    setFileDates((prev) => prev.filter((_, i) => i !== index));
  };

  // Run Biometric monthly parsing
  const handleRunBiometric = async () => {
    if (!biometricFile) {
      setStatusText('Please select the monthly biometric Excel sheet first.');
      return;
    }

    setIsProcessing(true);
    setStatusText('Processing file... Splitting In/Out, calculating 8h base, 1.35x/1.70x tiers, Friday 2x, and official holidays...');

    setTimeout(async () => {
      try {
        const holidaysToApply = hasOfficialHolidays ? selectedHolidays : [];
        const chosenSalary = Math.max(0, Number(baseSalaryInput) || 0);
        const dataset = await parseMonthlyBiometricFile(biometricFile, {
          officialHolidays: holidaysToApply,
          defaultBaseSalary: chosenSalary
        });
        if (dataset.employees.length === 0) {
          throw new Error('No employee rows found. Please check that the file has Cardno/Code and Name columns.');
        }

        setStatusText(`Success! Processed ${dataset.allPunches.length} punch records for ${dataset.employees.length} employees.`);
        if (onBiometricProcessed) {
          onBiometricProcessed(dataset, holidaysToApply, chosenSalary);
        }
        setIsProcessing(false);
        onClose();
      } catch (err: any) {
        console.error('Biometric processing error:', err);
        setStatusText(`Error processing biometric sheet: ${err.message || 'Check file format'}`);
        setIsProcessing(false);
      }
    }, 80);
  };

  // Run Daily overtime sheets parsing
  const handleRunDaily = async () => {
    if (otFiles.length === 0) {
      setStatusText('Please select daily overtime sheets first.');
      return;
    }

    setIsProcessing(true);
    setStatusText(`Parsing and compiling ${otFiles.length} daily sheets using dates from filenames...`);

    try {
      const records: RawDailyRecord[] = [];
      const masterList: Record<string, { name: string; department: string }> = {};

      if (masterFile) {
        setStatusText('Reading master employee list...');
        const attRes = await parseAttendanceFile(masterFile);
        for (const row of attRes.rows) {
          if (row.code) {
            masterList[row.code.trim()] = {
              name: row.name || `Employee ${row.code}`,
              department: row.department || 'General'
            };
          }
        }
      }

      for (let i = 0; i < otFiles.length; i++) {
        const file = otFiles[i];
        const assignedDate = fileDates[i] || extractDateFromFilenameSmart(file.name, selectedYear, selectedMonth);
        const res = await parseOvertimeFile(file, assignedDate);

        for (const r of res.rows) {
          records.push({
            code: r.code,
            name: r.name,
            department: r.department,
            date: assignedDate,
            hours: r.hours,
            sourceFile: file.name
          });
        }
      }

      onFilesProcessed(records, masterList);
      onClose();
    } catch (err: any) {
      console.error(err);
      setStatusText(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto text-left">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Attendance & Overtime Files</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose full month biometric fingerprint report OR daily overtime files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            onClick={() => { setActiveTab('biometric'); setStatusText(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'biometric'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Monthly Biometric Report (In/Out, 8h, 1.35x, 1.70x, Friday)</span>
          </button>

          <button
            onClick={() => { setActiveTab('daily'); setStatusText(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Daily Overtime Sheets (Dates from Filenames)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {activeTab === 'biometric' ? (
            /* Tab 1: Biometric Sheet Upload */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5">
                  Upload Monthly Fingerprint Sheet (Excel .xlsx or .csv):
                </label>
                <label className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setBiometricFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Fingerprint className="w-10 h-10 text-amber-400 mb-2" />
                  <div className="text-xs font-bold text-black mb-1">
                    {biometricFile ? `Selected: ${biometricFile.name}` : 'select your monthly biometric file'}
                  </div>
                </label>
              </div>

              {/* Salary Configuration */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>Monthly Base Salary (EGP):</span>
                  </div>
                  <div className="flex items-center bg-slate-800 border border-amber-700 rounded-lg px-2.5 py-1">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={baseSalaryInput || ''}
                      onChange={(e) => setBaseSalaryInput(Number(e.target.value) || 0)}
                      className="w-24 bg-transparent text-slate-400 font-mono font-bold text-xs focus:outline-none text-right"
                    />
                    <span className="text-[11px] text-amber-100 ml-1.5 font-semibold">EGP</span>
                  </div>
                </div>
              </div>

              {/* Official Paid Holidays Option */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold text-white-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-white-400" />
                    <span>Official Paid Public Holidays:</span>
                  </div>

                  {/* Toggle Choice */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setHasOfficialHolidays(false)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        !hasOfficialHolidays 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      No Holidays
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasOfficialHolidays(true)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        hasOfficialHolidays 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Select Holidays
                    </button>
                  </div>
                </div>

                {hasOfficialHolidays && (
                  <div className="space-y-2 pt-1 border-t border-indigo-900/30">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={customHolidayDate}
                        onChange={(e) => setCustomHolidayDate(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-800/60 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const norm = normalizeDateIso(customHolidayDate);
                          if (norm && !selectedHolidays.some((h) => isSameDate(h, norm))) {
                            setSelectedHolidays((prev) => [...prev, norm].sort());
                            setCustomHolidayDate('');
                          }
                        }}
                        disabled={!customHolidayDate}
                        className="px-4 py-1.5 rounded-lg bg-indigo-300 hover:bg-indigo-500 disabled:opacity-100 text-black text-xs font-bold cursor-pointer transition-colors"
                      >
                        + Add Holiday
                      </button>
                    </div>

                    {selectedHolidays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedHolidays.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-[11px] font-mono"
                          >
                            <span>{d}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedHolidays((prev) => prev.filter((x) => x !== d))}
                              className="hover:text-rose-400 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-black-300/80 leading-relaxed">
                If worked, hours are computed as 2.0x Double Time (same as Friday).
                </p>
              </div>

              {/* Automatic rules explanation badge */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Configured Attendance &amp; Shift Rules:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li><strong>Single Swipe (Missing Out Punch):</strong> When In and Out timestamps are identical, zero overtime (0h OT) is computed; only attendance is logged.</li>
                  <li><strong>3 Work Shifts:</strong> Shift 1 (07:30 to 15:30), Shift 2 (15:30 to 23:30), and Shift 3 (23:30 to 07:30 next morning cross-day).</li>
                  <li><strong>Payroll Cycle:</strong> Covers the complete month cycle from <strong>27th</strong> of previous month to <strong>26th</strong> of current month.</li>
                  <li><strong>In &amp; Out:</strong> Automatically extracted and split (e.g. 07:30 AM, 15:30 PM, 23:30 PM).</li>
                  <li><strong>Status:</strong> Any recorded shift punch is marked as <span className="text-emerald-400 font-bold">P (Present)</span>.</li>
                  <li><strong>Absent:</strong> Weekdays with no punches are marked as <span className="text-rose-400 font-bold">A</span> with remark <span className="text-slate-300">Absent</span>.</li>
                  <li><strong>Overtime (OT):</strong> Minimum company overtime is <strong>2 hours</strong> (Shift 1 must stay until at least 5:30 PM / 5.5; 1-hour OT is not counted).</li>
                  <li><strong>1.35x &amp; 1.70x &amp; Friday 2x:</strong> First 2 hours OT at 1.35x, excess at 1.70x, and Friday/Holiday overtime at 2.0x Double Time!</li>
                  <li><strong>Fridays (W.Holiday):</strong> Friday rest day marked as <span className="text-indigo-400">W.Holiday</span>; Friday worked recorded as 2.0x!</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Tab 2: Daily Files Upload */
            <div className="space-y-4">
              {/* Month/Year context */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Target Period (For files named with day numbers):</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthOrYearChange(selectedYear, parseInt(e.target.value, 10))}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={1}>January (01)</option>
                    <option value={2}>February (02)</option>
                    <option value={3}>March (03)</option>
                    <option value={4}>April (04)</option>
                    <option value={5}>May (05)</option>
                    <option value={6}>June (06)</option>
                    <option value={7}>July (07)</option>
                    <option value={8}>August (08)</option>
                    <option value={9}>September (09)</option>
                    <option value={10}>October (10)</option>
                    <option value={11}>November (11)</option>
                    <option value={12}>December (12)</option>
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => handleMonthOrYearChange(parseInt(e.target.value, 10), selectedMonth)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
              </div>

              {/* Daily OT Files Drop Area */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center justify-between">
                  <span>Daily Overtime Sheets (Select all day files together):</span>
                  {otFiles.length > 0 && (
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">
                      Detected {new Set(fileDates).size} unique dates from file names
                    </span>
                  )}
                </label>
                <label className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleDailyFilesSelected(Array.from(e.target.files || []))}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Files className="w-8 h-8 text-amber-400 mb-2" />
                  <div className="text-xs font-bold text-black mb-0.5">
                    Click to select all daily overtime files together
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Supports any naming convention: 1-10.xlsx, 02-10-2026.xlsx, OT 03-10.xlsx, day 4.xlsx
                  </div>
                </label>
              </div>

              {/* List of files with their extracted dates */}
              {otFiles.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      Uploaded Files &amp; Extracted Dates ({otFiles.length} files):
                    </span>
                    <span className="text-[11px] text-slate-400">
                      You can adjust any date manually
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/60">
                    {otFiles.map((file, idx) => (
                      <div key={idx} className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-900/60 transition-colors">
                        <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-sm">
                          <span className="text-slate-500 font-mono text-[11px] w-5">{idx + 1}.</span>
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-200 font-medium truncate font-mono text-[11px]">
                            {file.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-400">Date:</span>
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <Calendar className="w-3 h-3 text-amber-400 mr-1.5" />
                            <input
                              type="text"
                              value={fileDates[idx] || ''}
                              onChange={(e) => handleUpdateDate(idx, e.target.value)}
                              className="bg-transparent text-amber-300 font-mono text-xs w-24 focus:outline-none"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Master Sheet */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Optional Master Employee &amp; Department Sheet:
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 bg-slate-950 border border-slate-800 rounded-xl p-1.5 cursor-pointer"
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          {/* Status info */}
          {statusText && (
            <div className="p-3 rounded-lg bg-slate-800 text-xs text-amber-300 flex items-center gap-2 border border-slate-700 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusText}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={activeTab === 'biometric' ? handleRunBiometric : handleRunDaily}
            disabled={isProcessing || (activeTab === 'biometric' ? !biometricFile : otFiles.length === 0)}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <span>{isProcessing ? 'Processing...' : activeTab === 'biometric' ? 'Parse Biometric Sheet & Calculate' : 'Start Daily Merge'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
