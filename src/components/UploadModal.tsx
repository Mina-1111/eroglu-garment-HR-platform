import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Files, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { 
  parseAttendanceFile, 
  parseOvertimeFile 
} from '../utils/fileParser';
import { RawAttendanceRow, RawOvertimeRow, UploadedFileInfo } from '../types/audit';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (
    attendance: RawAttendanceRow[],
    overtime: RawOvertimeRow[],
    fileList: UploadedFileInfo[]
  ) => void;
  currentAttendanceCount: number;
  currentOvertimeCount: number;
  existingFiles: UploadedFileInfo[];
  onLoadSample: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  currentAttendanceCount,
  currentOvertimeCount,
  existingFiles,
  onLoadSample
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'overtime'>('overtime');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Staged data
  const [stagedAttendance, setStagedAttendance] = useState<RawAttendanceRow[]>([]);
  const [stagedOvertime, setStagedOvertime] = useState<RawOvertimeRow[]>([]);
  const [stagedFiles, setStagedFiles] = useState<UploadedFileInfo[]>(existingFiles);

  if (!isOpen) return null;

  const handleAttendanceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage('Reading and parsing attendance sheet...');

    try {
      const allNewRows: RawAttendanceRow[] = [];
      const newFiles: UploadedFileInfo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await parseAttendanceFile(file);
        allNewRows.push(...res.rows);
        newFiles.push({
          id: `att-${Date.now()}-${i}`,
          fileName: file.name,
          fileSize: file.size,
          type: 'attendance',
          rowsCount: res.rows.length,
          uploadedAt: 'now'
        });
      }

      setStagedAttendance((prev) => [...prev, ...allNewRows]);
      setStagedFiles((prev) => [...prev, ...newFiles]);
      setStatusMessage(`Extracted ${allNewRows.length} attendance records successfully`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error parsing file: ${err.message || 'Please check file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOvertimeFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(`Importing ${files.length} daily overtime sheets...`);

    try {
      const allNewRows: RawOvertimeRow[] = [];
      const newFiles: UploadedFileInfo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await parseOvertimeFile(file);
        allNewRows.push(...res.rows);
        newFiles.push({
          id: `ot-${Date.now()}-${i}`,
          fileName: file.name,
          fileSize: file.size,
          type: 'overtime',
          rowsCount: res.rows.length,
          uploadedAt: 'now'
        });
      }

      setStagedOvertime((prev) => [...prev, ...allNewRows]);
      setStagedFiles((prev) => [...prev, ...newFiles]);
      setStatusMessage(`Successfully merged ${files.length} daily sheets and extracted ${allNewRows.length} overtime records!`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error parsing sheets: ${err.message || 'Please check file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onDataLoaded(stagedAttendance, stagedOvertime, stagedFiles);
    onClose();
  };

  const handleRemoveFile = (fileId: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Upload Audit Sheets (Attendance + Daily Overtime)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload the Master Attendance Sheet and separate Daily Overtime files in seconds
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

        {/* Tab selection */}
        <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('overtime')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'overtime'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Files className="w-4 h-4" />
            <span>Separate Daily Overtime Sheets (Multi-file)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {stagedOvertime.length} rows
            </span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'attendance'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Master Attendance Sheet (Consolidated)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {stagedAttendance.length} rows
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Helper Hint */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {activeTab === 'overtime' ? (
                <>
                  <strong className="text-amber-300">Daily Overtime Multi-Upload:</strong> Select all daily files at once (or drag and drop them together), or provide an Excel file with multiple date tabs. The engine automatically detects columns (Code, Name, OT Hours, Date).
                </>
              ) : (
                <>
                  <strong className="text-blue-300">Master Attendance Sheet:</strong> Upload the monthly or periodic attendance roster. The engine extracts Employee Code, Name, Department, and status (Present, Absent, Leave, Weekend).
                </>
              )}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          {activeTab === 'overtime' ? (
            <label className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleOvertimeFiles(e.target.files)}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Files className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Click to browse daily overtime sheets (or drag & drop here)
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Supports batch selection of multiple files (.xlsx, .xls, .csv). Each file represents a separate date and all records will be unified by Employee Code.
              </p>
              <div className="mt-4 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-amber-300 border border-amber-500/30 font-medium">
                Supports hundreds of daily files simultaneously
              </div>
            </label>
          ) : (
            <label className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleAttendanceFiles(e.target.files)}
                className="hidden"
                disabled={isProcessing}
              />
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Click to browse Master Attendance Sheet
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Upload consolidated attendance & absence roster file (.xlsx, .xls, .csv).
              </p>
            </label>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-lg bg-slate-800 text-xs text-amber-300 flex items-center gap-2 border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80">
              <div className="px-4 py-2.5 bg-slate-800/80 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">
                  Currently Loaded Files ({stagedFiles.length} files)
                </span>
                <span className="text-[11px] text-slate-400">
                  {stagedFiles.filter(f => f.type === 'overtime').length} Overtime sheets • {stagedFiles.filter(f => f.type === 'attendance').length} Attendance sheets
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-800/60">
                {stagedFiles.map((file) => (
                  <div key={file.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-800/40 text-xs">
                    <div className="flex items-center gap-2.5">
                      {file.type === 'overtime' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                          Overtime
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                          Attendance
                        </span>
                      )}
                      <span className="text-slate-200 font-mono font-medium truncate max-w-xs sm:max-w-sm">
                        {file.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">
                        {file.rowsCount} rows
                      </span>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <button
            type="button"
            onClick={() => {
              onLoadSample();
              onClose();
            }}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 underline decoration-dotted font-medium"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load sample dataset for demo testing</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={stagedAttendance.length === 0 && stagedOvertime.length === 0}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <span>Merge & Generate Audit Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
