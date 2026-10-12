import React, { useState, useMemo, useRef } from 'react';
import { 
  FileCheck2, 
  Upload, 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  ArrowRightLeft, 
  Clock, 
  Users, 
  Calendar, 
  Building, 
  ChevronDown,
  X,
  ShieldAlert,
  Coins,
  ClipboardPaste,
  Check,
  AlertOctagon,
  ShieldCheck,
  FileSignature,
  Eye,
  SlidersHorizontal,
  UserX,
  SunMedium
} from 'lucide-react';

import { BiometricMonthlyDataset } from '../types/biometric';
import { 
  PaperOvertimeEntry, 
  ReconciliationItem, 
  ReconciliationSummary, 
  DiscrepancyStatus 
} from '../types/reconciliation';
import { 
  reconcileBiometricWithPaper, 
  getSamplePaperOvertimeData, 
  parsePaperOvertimeWorkbook, 
  parsePaperOvertimeText,
  isAdministrativeDepartment,
  isShift3Out1105
} from '../utils/reconciliationEngine';
import { exportReconciliationExcel, exportCategoryExcel } from '../utils/reconciliationExcelExport';
import { ErogluLogo } from './ErogluLogo';

interface BiometricPaperReconcileViewProps {
  biometricData: BiometricMonthlyDataset;
  onOpenBiometricUploader: () => void;
  baseSalary?: number;
}

export const BiometricPaperReconcileView: React.FC<BiometricPaperReconcileViewProps> = ({
  biometricData,
  onOpenBiometricUploader,
  baseSalary = 6000
}) => {
  // Paper Overtime records state
  const [paperEntries, setPaperEntries] = useState<PaperOvertimeEntry[]>([]);
  const [paperSourceFileName, setPaperSourceFileName] = useState<string>('');

  // Shift Scope: 'shift1_ot_only' (Shift 1 workers continuing for overtime) vs 'all' (All shifts)
  // Default to 'shift1_ot_only' as explicitly requested by user!
  const [shiftScope, setShiftScope] = useState<'shift1_ot_only' | 'all'>('shift1_ot_only');
  
  // Department Exclusion state (e.g. Admin staff exempt from OT)
  const [excludedDepts, setExcludedDepts] = useState<Set<string>>(() => {
    const s = new Set<string>();
    // Pre-populate with auto-detected administrative departments
    biometricData.allPunches.forEach((p) => {
      const d = (p.department || '').trim();
      if (d && isAdministrativeDepartment(d)) {
        s.add(d.toLowerCase());
      }
    });
    return s;
  });

  // UI filter states
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all'); 
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  // Modals state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ReconciliationItem | null>(null);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState<boolean>(false);

  // Manual resolutions state: itemId -> resolution
  const [resolutions, setResolutions] = useState<Record<string, { status: string; notes: string }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hourly rate estimation: 30 days * 8 hours = 240 hours
  const hourlyRateEgp = baseSalary > 0 ? baseSalary / 240 : 25;

  // Extract all distinct departments present in Biometric dataset
  const allAvailableDepts = useMemo(() => {
    const map = new Map<string, { name: string; isAdmin: boolean; punchCount: number }>();
    biometricData.allPunches.forEach((p) => {
      const d = (p.department || 'General').trim();
      if (!d) return;
      const lower = d.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, {
          name: d,
          isAdmin: isAdministrativeDepartment(d),
          punchCount: 1
        });
      } else {
        map.get(lower)!.punchCount++;
      }
    });
    paperEntries.forEach((p) => {
      const d = (p.department || 'General').trim();
      if (!d) return;
      const lower = d.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, {
          name: d,
          isAdmin: isAdministrativeDepartment(d),
          punchCount: 0
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [biometricData, paperEntries]);

  // Perform reconciliation with Shift 1 Overtime rule, 5:00 PM rule & Department Exclusions
  const { items, summary } = useMemo(() => {
    return reconcileBiometricWithPaper(biometricData, paperEntries, {
      hourlyRateEgp,
      excludedDepartments: Array.from(excludedDepts),
      shift1Only: shiftScope === 'shift1_ot_only'
    });
  }, [biometricData, paperEntries, hourlyRateEgp, excludedDepts, shiftScope]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      if (i.department) s.add(i.department);
    });
    return Array.from(s).sort();
  }, [items]);

  // Unique dates for filter dropdown
  const dates = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      if (i.date) s.add(i.date);
    });
    return Array.from(s).sort();
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Status Filter
      if (activeStatusFilter !== 'all') {
        if (activeStatusFilter === 'discrepancies_only') {
          if (item.status === 'FULLY_MATCHED' || item.status === 'NO_OVERTIME' || item.status === 'EXCLUDED_ADMIN') return false;
        } else if (activeStatusFilter === 'unearned_330') {
          if (!item.isLeftAt330Unearned) return false;
        } else if (activeStatusFilter === 'PUNCHED_NOT_IN_PAPER') {
          if (item.status !== 'PUNCHED_NOT_IN_PAPER' || isShift3Out1105(item.biometricOut)) return false;
        } else if (item.status !== activeStatusFilter) {
          return false;
        }
      }

      // 2. Department filter
      if (selectedDept !== 'all' && item.department !== selectedDept) {
        return false;
      }

      // 3. Date filter
      if (selectedDate !== 'all' && item.date !== selectedDate) {
        return false;
      }

      // 4. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const mCode = item.code.toLowerCase().includes(q);
        const mName = item.name.toLowerCase().includes(q);
        const mDept = item.department.toLowerCase().includes(q);
        const mLine = item.line.toLowerCase().includes(q);
        const mSup = (item.paperSupervisor || '').toLowerCase().includes(q);
        if (!mCode && !mName && !mDept && !mLine && !mSup) return false;
      }

      return true;
    });
  }, [items, activeStatusFilter, selectedDept, selectedDate, searchTerm]);

  // Toggle department exclusion
  const handleToggleDeptExclusion = (deptName: string) => {
    const lower = deptName.trim().toLowerCase();
    setExcludedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(lower)) {
        next.delete(lower);
      } else {
        next.add(lower);
      }
      return next;
    });
  };

  // Preset: Auto-exclude Admin departments
  const handleAutoExcludeAdmins = () => {
    const next = new Set<string>();
    allAvailableDepts.forEach((d) => {
      if (d.isAdmin) next.add(d.name.toLowerCase());
    });
    setExcludedDepts(next);
  };

  // Preset: Include all departments
  const handleIncludeAllDepts = () => {
    setExcludedDepts(new Set());
  };

  // Handle uploading paper file
  const handlePaperFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parsePaperOvertimeWorkbook(buffer, file.name);
      setPaperEntries(parsed);
      setPaperSourceFileName(file.name);
    } catch (err) {
      console.error(err);
      alert('Error reading paper overtime sheet. Please verify file format (.xlsx, .xls)');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle loading sample paper data
  const handleLoadSamplePaper = () => {
    const sample = getSamplePaperOvertimeData(biometricData);
    setPaperEntries(sample);
    setPaperSourceFileName('Sample_Paper_Overtime_Log.xlsx');
  };

  // Handle pasting data
  const handleApplyPaste = () => {
    if (!pastedText.trim()) return;
    const parsed = parsePaperOvertimeText(pastedText);
    if (parsed.length === 0) {
      alert('No valid data found. Ensure you copied columns (Code, Date, Hours...)');
      return;
    }
    setPaperEntries(parsed);
    setPaperSourceFileName('Pasted_Paper_Entries.txt');
    setIsPasteModalOpen(false);
    setPastedText('');
  };

  // Clear paper entries
  const handleClearPaper = () => {
    setPaperEntries([]);
    setPaperSourceFileName('');
  };

  // Set manual resolution
  const handleSetResolution = (itemId: string, status: string, notes: string = '') => {
    setResolutions((prev) => ({
      ...prev,
      [itemId]: { status, notes }
    }));
  };

  // Export any specific category directly to an Excel sheet
  const handleExportCategory = (categoryKey: string) => {
    let catTitle = '';
    let catItems: ReconciliationItem[] = [];
    let fileName = '';

    switch (categoryKey) {
      case 'PUNCHED_NOT_IN_PAPER':
        catTitle = 'Shift 1 Broke 5 PM Missing in Paper (Unclaimed Overtime)';
        catItems = items.filter((i) => i.status === 'PUNCHED_NOT_IN_PAPER' && !isShift3Out1105(i.biometricOut));
        fileName = 'Shift1_Broke_5pm_Missing_Paper';
        break;
      case 'IN_PAPER_NO_PUNCH':
        catTitle = 'In Paper but Missing Punch or Left Before 5 PM (Pending Claims)';
        catItems = items.filter((i) => i.status === 'IN_PAPER_NO_PUNCH');
        fileName = 'Paper_Record_No_Biometric_Punch';
        break;
      case 'unearned_330':
        catTitle = 'Departed 3:30 PM Normal Shift - Paper Claims Voided (0 OT)';
        catItems = items.filter((i) => i.isLeftAt330Unearned);
        fileName = 'Departed_330_Claims_Voided';
        break;
      case 'HOURS_MISMATCH':
        catTitle = 'Hours Mismatch Between Approved Biometric and Paper Sheet';
        catItems = items.filter((i) => i.status === 'HOURS_MISMATCH');
        fileName = 'Overtime_Hours_Variances';
        break;
      case 'FULLY_MATCHED':
        catTitle = 'Fully Matched and Approved for Disbursement';
        catItems = items.filter((i) => i.status === 'FULLY_MATCHED');
        fileName = 'Fully_Matched_and_Approved';
        break;
      case 'discrepancies_only':
        catTitle = 'All Discrepancies and Variances for Executive Review';
        catItems = items.filter(
          (i) =>
            i.status === 'PUNCHED_NOT_IN_PAPER' ||
            i.status === 'IN_PAPER_NO_PUNCH' ||
            i.status === 'HOURS_MISMATCH'
        );
        fileName = 'All_Discrepancies_and_Variances';
        break;
      case 'EXCLUDED_ADMIN':
        catTitle = 'Excluded Administrative Staff (Non-OT Eligible)';
        catItems = items.filter((i) => i.status === 'EXCLUDED_ADMIN');
        fileName = 'Excluded_Admin_Staff_List';
        break;
      case 'current_filtered':
      default:
        catTitle = `Current Filtered Table View`;
        catItems = filteredItems;
        fileName = 'Current_Filtered_Records';
        break;
    }

    if (catItems.length === 0) {
      alert('No records found in this category to export.');
      return;
    }

    exportCategoryExcel({
      categoryTitle: catTitle,
      items: catItems,
      fileName,
      companyName: 'Eroglu Garments Egypt - HR Audit'
    });
  };

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handlePaperFileUpload}
      />

      {/* Top Hero Banner & Workflow Explanation */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                <span>Shift 1 Workers Who Continued for Overtime</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Broke 5 PM (2.0h) | 8:00 PM Shift (4.5h)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ready for Executive Manager Sign-off</span>
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Biometric Punch System vs Paper Overtime Reconciliation</span>
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Strictly audits: <strong>Shift 1 morning workers (07:30 - 15:30) who continued past scheduled hours for overtime</strong>, crediting <strong>2.0 hours for departures at or past 5:00 PM</strong>, <strong>4.5 hours for the 8:00 PM shift (past 7:30 PM)</strong>, excluding administrative departments, and generating certified executive sign-off reports.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:self-center shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
              title="Upload paper overtime sheet from Excel file"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Paper Sheet (Excel)</span>
            </button>

            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Paste paper overtime rows directly"
            >
              <ClipboardPaste className="w-4 h-4 text-amber-400" />
              <span>Paste Paper Data</span>
            </button>

            {paperEntries.length === 0 && (
              <button
                onClick={handleLoadSamplePaper}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                title="Load factory sample paper overtime sheet"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Sample Paper Data</span>
              </button>
            )}

            <button
              onClick={() => setIsPrintSlipOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
              title="Preview & print official executive audit slip (A4)"
            >
              <FileSignature className="w-4 h-4" />
              <span>Manager Sign Slip (A4)</span>
            </button>

            <button
              onClick={() => exportReconciliationExcel(items, summary, 'Eroglu Garments Egypt - HR Audit')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Export comprehensive official audit workbook to Excel with sign-off block"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Audit Excel</span>
            </button>
          </div>
        </div>

        {/* Status Strip & Source Information */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Source A: Biometric Data */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 border border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Biometric Machine Dataset (Punches)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-slate-400 text-[11px]">
                  {biometricData.employees.length} Employees | {biometricData.allPunches.length} daily punches
                </div>
              </div>
            </div>
            <button
              onClick={onOpenBiometricUploader}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Change Biometric Sheet
            </button>
          </div>

          {/* Source B: Paper Data */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 border border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                B
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Supervisor Paper Overtime Sheet</span>
                  {paperEntries.length > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {paperEntries.length > 0
                    ? `${paperEntries.length} paper overtime records (${paperSourceFileName || 'Loaded'})`
                    : 'No paper sheet uploaded yet - click to upload or try sample data'}
                </div>
              </div>
            </div>
            {paperEntries.length > 0 ? (
              <button
                onClick={handleClearPaper}
                className="px-2.5 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Remove paper data"
              >
                Clear Paper
              </button>
            ) : (
              <button
                onClick={handleLoadSamplePaper}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/70 text-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Load Sample Paper
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SHIFT 1 OVERTIME SCOPE CONTROL BAR */}
      <div className="bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-2 border-indigo-500/30 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 shrink-0">
            1
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Filter Strictly for Shift 1 Workers Who Continued for Overtime
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                shiftScope === 'shift1_ot_only'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {shiftScope === 'shift1_ot_only' ? 'Active Filter Applied' : 'All Shifts Displayed'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Includes only workers arriving in Shift 1 (07:30 - 15:30) who continued past regular hours for overtime (Broke 5:00 PM = 2.0h / 8:00 PM Shift = 4.5h).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => setShiftScope('shift1_ot_only')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              shiftScope === 'shift1_ot_only'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-2 ring-indigo-400'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Shift 1 + Continued OT ({summary.shift1ContinuedOtCount || summary.totalDaysEvaluated})</span>
          </button>

          <button
            onClick={() => setShiftScope('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shiftScope === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>Show All Shifts & Records</span>
          </button>
        </div>
      </div>

      {/* STRICT BIOMETRIC GOVERNING RULES BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-xs border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[11px] font-black font-sans flex items-center gap-1">
                <span>⭐</span>
                <span>Strict Biometric Authority Rule</span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                (Biometric checkout is the governing authority before manager sign-off)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white pt-1">
              Workers who punched out at 3:30 PM receive ZERO overtime (0h) even if claimed by supervisor in paper!
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-amber-300 font-mono text-xs font-bold">
              Broke 5:00 PM = 2.0h
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-indigo-300 font-mono text-xs font-bold">
              Broke 7.5 (8:00 PM Shift) = 4.5h
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
            <div className="text-rose-400 font-bold flex items-center gap-1.5">
              <span>🚫 Departed 3:30 PM (Normal Schedule)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              If the worker punched out at normal shift end (3:30 PM / before 5:00 PM), they receive <strong>0 approved overtime hours</strong> and any paper claims are strictly voided.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <span>⏱️ Broke 5:00 PM Threshold</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Strictly 2.0 overtime hours are credited to workers breaking 5:00 PM (whether logged on paper or inadvertently omitted by supervisor).
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
            <div className="text-indigo-300 font-bold flex items-center gap-1.5">
              <span>🌙 Passed 7.5 Hours (8:00 PM Shift)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Departures past 7:30 PM (after 7:25 PM threshold) qualify for the 8:00 PM Shift and are credited <strong>4.5 approved overtime hours</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* DEPARTMENT ELIGIBILITY & OVERTIME SELECTION BAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Department Eligibility & Overtime Exclusions</span>
                {excludedDepts.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300">
                    {excludedDepts.size} depts excluded
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                Specify overtime-eligible departments. Excluded administrative departments (e.g. HR, IT, Finance) do not accrue overtime and are omitted from discrepancies.
              </p>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoExcludeAdmins}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5 text-amber-700" />
              <span>Auto-Exclude Admin Staff</span>
            </button>

            <button
              onClick={handleIncludeAllDepts}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              <span>Include All Departments</span>
            </button>
          </div>
        </div>

        {/* Department Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {allAvailableDepts.map((d) => {
            const isExcluded = excludedDepts.has(d.name.toLowerCase());
            return (
              <button
                key={d.name}
                onClick={() => handleToggleDeptExclusion(d.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isExcluded
                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through hover:bg-slate-200'
                    : d.isAdmin
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-xs'
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 shadow-xs'
                }`}
                title={isExcluded ? 'Click to re-include this department' : 'Click to exclude this department from overtime'}
              >
                <span>{isExcluded ? '✕' : '✓'}</span>
                <span>{d.name}</span>
                {d.isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-800 font-normal">
                    Admin
                  </span>
                )}
                {isExcluded && (
                  <span className="text-[10px] px-1 rounded bg-slate-200 text-slate-600 font-normal no-underline">
                    Excluded
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Punched & Broke 5 PM but NOT in Paper */}
        <div 
          onClick={() => setActiveStatusFilter(activeStatusFilter === 'PUNCHED_NOT_IN_PAPER' ? 'all' : 'PUNCHED_NOT_IN_PAPER')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-xs flex flex-col justify-between ${
            activeStatusFilter === 'PUNCHED_NOT_IN_PAPER'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/30'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Shift 1 Broke 5 PM (No Paper)
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-700 font-mono">
                {summary.punchedNotInPaperCount}
              </span>
              <span className="text-xs text-rose-600 font-semibold">unrecorded cases</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-tight">
              Attended Shift 1 and broke 5:00 PM (entitled to 2.0h or 4.5h) but omitted by supervisor from paper sheet.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {activeStatusFilter === 'PUNCHED_NOT_IN_PAPER' ? '✓ Filter Applied' : 'Click to filter'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportCategory('PUNCHED_NOT_IN_PAPER');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Download Excel sheet for Shift 1 workers who broke 5:00 PM without paper log"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Card 2: In Paper but NO Punch or left before 5 PM */}
        <div 
          onClick={() => setActiveStatusFilter(activeStatusFilter === 'IN_PAPER_NO_PUNCH' ? 'all' : 'IN_PAPER_NO_PUNCH')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-xs flex flex-col justify-between ${
            activeStatusFilter === 'IN_PAPER_NO_PUNCH'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                In Paper Sheet / Missing Punch or &lt; 5 PM
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-700 font-mono">
                {summary.inPaperNoPunchCount}
              </span>
              <span className="text-xs text-amber-600 font-semibold">pending cases</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-tight">
              Supervisor claimed overtime in paper but worker did not punch, was absent, or departed before 5:00 PM.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {activeStatusFilter === 'IN_PAPER_NO_PUNCH' ? '✓ Filter Applied' : 'Click to filter'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportCategory('IN_PAPER_NO_PUNCH');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Download Excel sheet for workers in paper sheet with no biometric punch"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Card 3: Hours Mismatch */}
        <div 
          onClick={() => setActiveStatusFilter(activeStatusFilter === 'HOURS_MISMATCH' ? 'all' : 'HOURS_MISMATCH')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-xs flex flex-col justify-between ${
            activeStatusFilter === 'HOURS_MISMATCH'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/30'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Overtime Hours Discrepancy
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100/60 text-amber-800 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800 font-mono">
                {summary.hoursMismatchCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">variance records</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-tight">
              Recorded on both sides but paper hours differ from approved biometric hours (2.0h / 4.5h).
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {activeStatusFilter === 'HOURS_MISMATCH' ? '✓ Filter Applied' : 'Click to filter'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportCategory('HOURS_MISMATCH');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Download Excel sheet for hours variance records"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Card 4: Fully Matched & Approved */}
        <div 
          onClick={() => setActiveStatusFilter(activeStatusFilter === 'FULLY_MATCHED' ? 'all' : 'FULLY_MATCHED')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-xs flex flex-col justify-between ${
            activeStatusFilter === 'FULLY_MATCHED'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Fully Matched & Approved
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700 font-mono">
                {summary.fullyMatchedCount}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">100% verified records</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-tight">
              Perfect match between biometric punch (Broke 5 PM / Shift 8) and supervisor sheet; approved for disbursement.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {activeStatusFilter === 'FULLY_MATCHED' ? '✓ Filter Applied' : 'Click to filter'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportCategory('FULLY_MATCHED');
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Download Excel sheet for fully matched overtime records"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auxiliary Statistics Ribbon */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700 font-sans">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Total Workforce:</span>
            <span className="font-bold text-slate-900 font-mono">{summary.totalEmployees} employees</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Approved Biometric OT:</span>
            <span className="font-bold text-amber-800 font-mono">{summary.totalBiometricOtHours} h</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Paper Sheet OT:</span>
            <span className="font-bold text-indigo-800 font-mono">{summary.totalPaperOtHours} h</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Hours Variance:</span>
            <span className={`font-mono font-bold ${summary.hoursVariance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {summary.hoursVariance > 0 ? `+${summary.hoursVariance}h paper excess` : `${summary.hoursVariance}h`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
            🏢 Excluded Admin: <strong>{summary.excludedAdminCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
            ⚪ Regular Departures &lt; 5 PM: <strong>{summary.noOvertimeCount}</strong>
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 ml-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </span>

          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({items.length})
          </button>

          <button
            onClick={() => setActiveStatusFilter('discrepancies_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'discrepancies_only'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Discrepancies & Variances Only ({summary.punchedNotInPaperCount + summary.inPaperNoPunchCount + summary.hoursMismatchCount})
          </button>

          <button
            onClick={() => setActiveStatusFilter('PUNCHED_NOT_IN_PAPER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'PUNCHED_NOT_IN_PAPER'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔴 Broke 5 PM (No Paper) ({summary.punchedNotInPaperCount})
          </button>

          <button
            onClick={() => setActiveStatusFilter('IN_PAPER_NO_PUNCH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'IN_PAPER_NO_PUNCH'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🟠 In Paper but No Punch ({summary.inPaperNoPunchCount})
          </button>

          <button
            onClick={() => setActiveStatusFilter(activeStatusFilter === 'unearned_330' ? 'all' : 'unearned_330')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'unearned_330'
                ? 'bg-rose-900 text-white shadow-xs ring-2 ring-rose-500/30'
                : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
            }`}
          >
            🚫 Departed 3:30 PM Voided ({summary.unearnedLeftAt330Count})
          </button>

          <button
            onClick={() => setActiveStatusFilter('HOURS_MISMATCH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'HOURS_MISMATCH'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🟡 Hours Variance ({summary.hoursMismatchCount})
          </button>

          <button
            onClick={() => setActiveStatusFilter('FULLY_MATCHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'FULLY_MATCHED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🟢 Fully Matched ({summary.fullyMatchedCount})
          </button>

          <button
            onClick={() => setActiveStatusFilter('EXCLUDED_ADMIN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStatusFilter === 'EXCLUDED_ADMIN'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏢 Excluded Admin ({summary.excludedAdminCount})
          </button>
        </div>

        {/* Quick Excel Download by Category Toolbar */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3 flex-wrap bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Quick Download Excel by Category:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleExportCategory('PUNCHED_NOT_IN_PAPER')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for Shift 1 workers who broke 5:00 PM without paper log"
            >
              <span>🔴 Broke 5 PM No Paper ({summary.punchedNotInPaperCount})</span>
            </button>

            <button
              onClick={() => handleExportCategory('IN_PAPER_NO_PUNCH')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for workers in paper with no punch"
            >
              <span>🟠 In Paper No Punch ({summary.inPaperNoPunchCount})</span>
            </button>

            <button
              onClick={() => handleExportCategory('unearned_330')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for workers who departed at 3:30 PM with voided claims"
            >
              <span>🚫 Left 3:30 Voided ({summary.unearnedLeftAt330Count})</span>
            </button>

            <button
              onClick={() => handleExportCategory('HOURS_MISMATCH')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for overtime hours discrepancies"
            >
              <span>🟡 Hours Variance ({summary.hoursMismatchCount})</span>
            </button>

            <button
              onClick={() => handleExportCategory('FULLY_MATCHED')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for fully matched records"
            >
              <span>🟢 Fully Matched ({summary.fullyMatchedCount})</span>
            </button>

            <button
              onClick={() => handleExportCategory('discrepancies_only')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download Excel sheet for all discrepancies and audit variances"
            >
              <span>⚠️ All Discrepancies ({summary.punchedNotInPaperCount + summary.inPaperNoPunchCount + summary.hoursMismatchCount})</span>
            </button>

            <button
              onClick={() => handleExportCategory('current_filtered')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Download Excel sheet for currently displayed filtered records"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Current View ({filteredItems.length})</span>
            </button>
          </div>
        </div>

        {/* Search & Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by worker code, employee name, department, line, or supervisor..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d} {excludedDepts.has(d.toLowerCase()) ? '(Excluded)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
            >
              <option value="all">All Dates ({dates.length} days)</option>
              {dates.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs text-slate-800">
              Shift 1 Overtime Reconciliation & Biometric Audit Table
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[11px] font-bold">
              {filteredItems.length} records
            </span>
            <button
              onClick={() => handleExportCategory('current_filtered')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer mr-2"
              title="Download Excel sheet for all records currently displayed in this table"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Current Table Excel ({filteredItems.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Broke 5 PM (No Paper)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Hours Mismatch</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Fully Matched</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">Worker Code</th>
                <th className="py-2.5 px-3 min-w-[160px]">Worker Name</th>
                <th className="py-2.5 px-3">Shift</th>
                <th className="py-2.5 px-3">Department & Status</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Biometric Punch & 5 PM Break</th>
                <th className="py-2.5 px-3 text-center bg-amber-50/60 text-amber-950">Approved Biometric OT</th>
                <th className="py-2.5 px-3 text-center bg-indigo-50/60 text-indigo-950">Paper Sheet OT</th>
                <th className="py-2.5 px-3 text-center">Variance</th>
                <th className="py-2.5 px-3">Reconciliation Diagnosis</th>
                <th className="py-2.5 px-3 text-center w-24">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const resolution = resolutions[item.id];
                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedItemForDetail(item)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        item.severity === 'danger'
                          ? 'bg-rose-50/20'
                          : item.severity === 'warning'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {item.code}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-sans ${
                            item.isShift1 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.isShift1 ? 'Shift 1 Morning (07:30)' : item.shiftName}
                          </span>
                        </div>
                        {item.continuedOvertime && (
                          <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                            ✓ Continued Overtime
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span>{item.department}</span>
                          {item.isExcludedDept && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                              Excluded (Admin)
                            </span>
                          )}
                        </div>
                        {item.line && (
                          <div className="text-[10px] text-slate-400 font-mono">{item.line}</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        <div>{item.date}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{item.dayName}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                        {item.biometricIn || item.biometricOut ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                              item.isLeftAt330Unearned 
                                ? 'bg-rose-50 border-rose-300' 
                                : 'bg-slate-100 border-slate-200'
                            }`}>
                              <span className="text-emerald-700">{item.biometricIn || '--:--'}</span>
                              <span className="text-slate-400">➔</span>
                              <span className={`font-bold ${item.isLeftAt330Unearned ? 'text-rose-700' : 'text-slate-800'}`}>
                                {item.biometricOut || '--:--'}
                              </span>
                            </div>
                            {item.isLeftAt330Unearned ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-black font-sans border border-rose-300">
                                🚫 Punched &lt; 5 PM ({item.biometricOut}) - 0 OT
                              </span>
                            ) : item.approvedOtHours === 4.5 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black font-sans border border-indigo-200">
                                🌟 8:00 PM Shift / Past 7.5 (4.5h)
                              </span>
                            ) : item.exceeded5pm ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold font-sans border border-amber-200">
                                ⚡ Broke 5:00 PM (2.0h OT)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-sans">
                                Before 5:00 PM (0 OT)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Punch</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-amber-50/40">
                        {item.approvedOtHours > 0 ? (
                          <span className="text-amber-800 font-bold">{item.approvedOtHours} h</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/40">
                        {item.hasPaperRecord ? (
                          item.isLeftAt330Unearned ? (
                            <div>
                              <span className="text-slate-400 line-through text-[11px]">{item.paperOtHours} h</span>
                              <span className="text-[10px] text-rose-600 font-bold block">Voided by Punch</span>
                            </div>
                          ) : (
                            <span className="text-indigo-800 font-bold">{item.paperOtHours} h</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {item.diffHours === 0 ? (
                          <span className="text-emerald-600">0</span>
                        ) : item.diffHours > 0 ? (
                          <span className="text-rose-600 font-black">+{item.diffHours} h</span>
                        ) : (
                          <span className="text-amber-700 font-black">{item.diffHours} h</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 max-w-[320px]">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{item.statusTitleAr}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.explanationAr}
                        </div>
                        {resolution && (
                          <div className="mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block font-sans">
                            Approved: {resolution.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForDetail(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Inspection Modal */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    Detailed Reconciliation Inspection: {selectedItemForDetail.name} (Code {selectedItemForDetail.code})
                  </h3>
                  <div className="text-[11px] text-slate-300">
                    Shift: {selectedItemForDetail.shiftName} | Date: {selectedItemForDetail.date} ({selectedItemForDetail.dayName}) | Department: {selectedItemForDetail.department}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border ${
                selectedItemForDetail.severity === 'danger'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : selectedItemForDetail.severity === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : selectedItemForDetail.severity === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}>
                <div className="font-bold text-sm mb-1">{selectedItemForDetail.statusTitleAr}</div>
                <div className="leading-relaxed">{selectedItemForDetail.explanationAr}</div>
              </div>

              {/* Side-by-Side Comparison Box */}
              <div className="grid grid-cols-2 gap-4">
                {/* Biometric Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800">Biometric Punch System Records</span>
                    <span className="font-mono text-amber-800 font-bold">{selectedItemForDetail.biometricOtHours} h OT</span>
                  </div>
                  <div className="space-y-1 text-slate-600 font-mono">
                    <div>Shift: {selectedItemForDetail.shiftName}</div>
                    <div>Punch In: {selectedItemForDetail.biometricIn || 'Not Logged'}</div>
                    <div>Punch Out: {selectedItemForDetail.biometricOut || 'Not Logged'}</div>
                    <div>Worked Hours: {selectedItemForDetail.biometricWorkedHours}h</div>
                    <div className="text-amber-800 font-bold font-sans">
                      Governing Rule: {selectedItemForDetail.calculatedOtRule}
                    </div>
                  </div>
                </div>

                {/* Paper Card */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                    <span className="font-bold text-indigo-950">Supervisor Paper Overtime Sheet</span>
                    <span className="font-mono text-indigo-800 font-bold">{selectedItemForDetail.paperOtHours} h OT</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div>In Paper: {selectedItemForDetail.hasPaperRecord ? 'Yes' : 'No'}</div>
                    <div>Logged Supervisor: {selectedItemForDetail.paperSupervisor || 'Unspecified'}</div>
                    <div>Paper Notes: {selectedItemForDetail.paperNotes || 'None'}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for HR Auditor */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block font-sans">
                  Auditor Decision & Resolution Action:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      handleSetResolution(selectedItemForDetail.id, 'ACCEPTED_BIOMETRIC', 'Approve biometric system hours');
                      setSelectedItemForDetail(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Biometric OT ({selectedItemForDetail.biometricOtHours}h)</span>
                  </button>

                  {selectedItemForDetail.hasPaperRecord && (
                    <button
                      onClick={() => {
                        handleSetResolution(selectedItemForDetail.id, 'ACCEPTED_PAPER', 'Approve supervisor paper hours');
                        setSelectedItemForDetail(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Paper Sheet ({selectedItemForDetail.paperOtHours}h)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleSetResolution(selectedItemForDetail.id, 'PENDING_INVESTIGATION', 'Refer to management investigation');
                      setSelectedItemForDetail(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Suspend for Investigation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-amber-400" />
                <span>Paste Paper Overtime Sheet from Excel</span>
              </h3>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Copy rows from your Excel sheet and paste them here directly. Supports columns in any order:
                <br />
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono mt-1 inline-block">
                  Worker Code | Date (2026-05-28) | Overtime Hours | Name | Department
                </code>
              </p>

              <textarea
                rows={10}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Example:&#10;3935	2026-05-28	3.0	Protima	Finishing&#10;3936	2026-05-28	2.0	Mohamed Tarek	Quality&#10;3937	2026-05-28	2.0	Fatma Ali	Sewing"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPaste}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Apply & Reconcile Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Report Modal (Ready for Executive Manager Sign-off) */}
      {isPrintSlipOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
            {/* Top Toolbar (No-Print) */}
            <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
              <span className="font-bold text-sm">Official Audit Report Preview (Print A4 & Executive Sign-off)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>Print Now</span>
                </button>
                <button
                  onClick={() => setIsPrintSlipOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 overflow-y-auto space-y-6 text-black bg-white" id="printable-reconcile-report">
              {/* Report Header */}
              <div className="border-b-2 border-black pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ErogluLogo className="w-20 h-12" />
                  <div>
                    <h2 className="text-xl font-black tracking-tight">EROGLU GARMENTS OPERATIONS - EGYPT</h2>
                    <h3 className="text-sm font-bold text-slate-800">
                      Executive Audit Minutes for Shift 1 Workers Continuing for Overtime
                    </h3>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Generated: {new Date().toISOString().replace('T', ' ').slice(0, 19)}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="font-bold">HR & Internal Audit Department</div>
                  <div>Report Ref: AUD-SHIFT1-{new Date().toISOString().slice(0, 10)}</div>
                  <div className="font-bold text-rose-700">CONFIDENTIAL - EXECUTIVE SIGN-OFF</div>
                </div>
              </div>

              {/* Formal Legal Preamble */}
              <div className="p-3 bg-slate-50 border border-black rounded-lg text-xs leading-relaxed">
                <strong>Official Legal Declaration & Audit Minutes:</strong> Biometric attendance logs for <strong>Shift 1 morning workers (07:30 - 15:30) who continued for overtime past regular shift hours</strong> have been cross-audited against supervisor overtime sheets under strict governing regulations:
                (1) <strong>Biometric checkout is the sole governing authority:</strong> departures at 3:30 PM receive 0 overtime and paper claims are voided, (2) 2.0 hours credited for departures breaking 5:00 PM, (3) 4.5 hours credited for departures reaching the 8:00 PM Shift (past 7:30 PM), (4) Administrative staff are excluded from factory overtime payroll.
              </div>

              {/* KPI Summary Grid in Print */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono border border-black p-2 bg-slate-50">
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">Broke 5 PM (No Paper)</div>
                  <div className="font-black text-base text-rose-700">{summary.punchedNotInPaperCount}</div>
                </div>
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">Departed 3:30 PM (Voided)</div>
                  <div className="font-black text-base text-rose-900">{summary.unearnedLeftAt330Count || 0}</div>
                </div>
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">In Paper (No Punch)</div>
                  <div className="font-black text-base text-amber-700">{summary.inPaperNoPunchCount}</div>
                </div>
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">Hours Variance</div>
                  <div className="font-black text-base text-amber-800">{summary.hoursMismatchCount}</div>
                </div>
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">Fully Matched</div>
                  <div className="font-black text-base text-emerald-700">{summary.fullyMatchedCount}</div>
                </div>
                <div className="border border-black p-2 bg-white">
                  <div className="font-sans text-[10px] text-slate-600 font-bold">Excluded Admin</div>
                  <div className="font-black text-base text-slate-700">{summary.excludedAdminCount}</div>
                </div>
              </div>

              {/* Table of Discrepancies */}
              <div>
                <h4 className="font-bold text-xs mb-2 text-rose-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-700" />
                  <span>Statement of Records Requiring Plant Executive Approval (Shift 1 Workers):</span>
                </h4>
                
                <table className="w-full text-[11px] text-left border-collapse border border-black">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black text-black font-bold">
                      <th className="border border-black p-1 text-center w-8">#</th>
                      <th className="border border-black p-1">Code</th>
                      <th className="border border-black p-1">Employee Name</th>
                      <th className="border border-black p-1">Shift</th>
                      <th className="border border-black p-1">Department</th>
                      <th className="border border-black p-1">Date</th>
                      <th className="border border-black p-1 text-center">Checkout Punch</th>
                      <th className="border border-black p-1 text-center">Approved Biometric OT</th>
                      <th className="border border-black p-1 text-center">Paper Sheet OT</th>
                      <th className="border border-black p-1 text-center">Variance</th>
                      <th className="border border-black p-1">Diagnosis & Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter((i) => i.status !== 'FULLY_MATCHED' && i.status !== 'NO_OVERTIME')
                      .slice(0, 35)
                      .map((item, idx) => (
                        <tr key={item.id} className="border-b border-black">
                          <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-black p-1 font-mono font-bold">{item.code}</td>
                          <td className="border border-black p-1 font-bold">{item.name}</td>
                          <td className="border border-black p-1 font-sans text-[10px]">
                            {item.isShift1 ? 'Shift 1 Morning' : item.shiftName}
                          </td>
                          <td className="border border-black p-1">
                            {item.department} {item.isExcludedDept ? '(Excluded Admin)' : ''}
                          </td>
                          <td className="border border-black p-1 font-mono">{item.date}</td>
                          <td className="border border-black p-1 font-mono text-center">
                            {item.isLeftAt330Unearned ? (
                              <span className="font-bold text-rose-800">3:30 PM (Voided)</span>
                            ) : (
                              <span>{item.biometricOut || '--'} {item.exceeded5pm ? '✓' : ''}</span>
                            )}
                          </td>
                          <td className="border border-black p-1 font-mono text-center font-bold">{item.approvedOtHours}h</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-indigo-900">
                            {item.isLeftAt330Unearned ? (
                              <span className="line-through text-slate-400">{item.paperOtHours} h</span>
                            ) : (
                              `${item.paperOtHours}h`
                            )}
                          </td>
                          <td className="border border-black p-1 font-mono text-center font-black text-rose-800">
                            {item.diffHours > 0 ? `+${item.diffHours}` : item.diffHours}h
                          </td>
                          <td className="border border-black p-1 text-[10px] leading-tight">
                            <strong>{item.statusTitleAr}: </strong>
                            <span>{item.suggestedActionAr}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Formal Four Signature Blocks for the Manager */}
              <div className="pt-6 border-t-2 border-black grid grid-cols-4 gap-4 text-center text-xs">
                <div className="p-2 border border-slate-300 rounded">
                  <div className="font-bold">1. HR Timekeeper & Biometric Auditor</div>
                  <div className="text-[10px] text-slate-500 mb-6">(HR Timekeeper)</div>
                  <div className="border-t border-slate-400 pt-1 text-[10px]">
                    Name: ................................<br/>
                    Signature: ............................
                  </div>
                </div>

                <div className="p-2 border border-slate-300 rounded">
                  <div className="font-bold">2. Head of Cost Accounting & Payroll</div>
                  <div className="text-[10px] text-slate-500 mb-6">(Cost Accounting)</div>
                  <div className="border-t border-slate-400 pt-1 text-[10px]">
                    Name: ................................<br/>
                    Signature: ............................
                  </div>
                </div>

                <div className="p-2 border border-slate-300 rounded">
                  <div className="font-bold">3. Production General Manager</div>
                  <div className="text-[10px] text-slate-500 mb-6">(Production Manager)</div>
                  <div className="border-t border-slate-400 pt-1 text-[10px]">
                    Name: ................................<br/>
                    Signature: ............................
                  </div>
                </div>

                <div className="p-2 border border-slate-400 rounded bg-slate-50">
                  <div className="font-bold text-rose-950">4. Final Approval: Plant General Manager</div>
                  <div className="text-[10px] text-slate-500 mb-6">(General Plant Manager)</div>
                  <div className="border-t border-slate-400 pt-1 text-[10px] font-bold">
                    Signature: ............................<br/>
                    [ Plant Official Seal ]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
