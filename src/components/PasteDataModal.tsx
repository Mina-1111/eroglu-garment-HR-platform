import React, { useState } from 'react';
import { X, ClipboardPaste, ArrowRight, HelpCircle } from 'lucide-react';
import { parseRawPastedText } from '../utils/fileParser';
import { RawAttendanceRow, RawOvertimeRow } from '../types/audit';

interface PasteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataPasted: (attendance: RawAttendanceRow[], overtime: RawOvertimeRow[]) => void;
}

export const PasteDataModal: React.FC<PasteDataModalProps> = ({
  isOpen,
  onClose,
  onDataPasted
}) => {
  const [pasteType, setPasteType] = useState<'overtime' | 'attendance'>('overtime');
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = () => {
    setErrorMsg(null);
    if (!rawText.trim()) {
      setErrorMsg('Please paste data first');
      return;
    }

    const result = parseRawPastedText(rawText, pasteType);
    if (pasteType === 'attendance') {
      if (!result.attendanceRows || result.attendanceRows.length === 0) {
        setErrorMsg('Failed to parse data: Present, please make sure to copy the header row (code, name, date, status)');
        return;
      }
      onDataPasted(result.attendanceRows, []);
      onClose();
    } else {
      if (!result.overtimeRows || result.overtimeRows.length === 0) {
        setErrorMsg('Failed to parse overtime data. Please ensure header row is included (Code, Name, Date, Hours)');
        return;
      }
      onDataPasted([], result.overtimeRows);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Direct Copy & Paste from Excel
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select cells in your Excel spreadsheet, press Ctrl+C, and paste them here directly
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

        {/* Type Select */}
        <div className="px-6 pt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pasteType"
              checked={pasteType === 'overtime'}
              onChange={() => setPasteType('overtime')}
              className="text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-800 border-slate-700"
            />
            <span className="text-xs font-bold text-slate-200">Daily Overtime Records (OT Hours)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pasteType"
              checked={pasteType === 'attendance'}
              onChange={() => setPasteType('attendance')}
              className="text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-800 border-slate-700"
            />
            <span className="text-xs font-bold text-slate-200">Attendance & Absence Records</span>
          </label>
        </div>

        {/* Body Textarea */}
        <div className="p-6 space-y-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tip: Make sure to include the top header row: <strong>Employee Code | Name | Date | Hours</strong></span>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Example:\nEmployee Code\tName\tDate\tOvertime Hours\n1001\tAhmed Ibrahim\t2026-10-01\t2.5\n1002\tMohamed Ali\t2026-10-01\t3.0`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
          />

          {errorMsg && (
            <div className="text-xs text-rose-400 p-2 rounded bg-rose-950/40 border border-rose-800/60">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
          >
            <span>Process Pasted Data</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
