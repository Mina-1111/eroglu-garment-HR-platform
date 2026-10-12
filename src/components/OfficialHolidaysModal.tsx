import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Sparkles, AlertCircle, Trash2, Plus } from 'lucide-react';
import { formatDateToDmy, getEnglishDayName, checkIsFriday, normalizeDateIso, isSameDate } from '../utils/biometricParser';

interface OfficialHolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDates: string[]; // List of 'YYYY-MM-DD' dates in current dataset
  activeHolidays: string[]; // List of currently active official holiday dates
  onApplyHolidays: (holidays: string[]) => void;
}

export const OfficialHolidaysModal: React.FC<OfficialHolidaysModalProps> = ({
  isOpen,
  onClose,
  allDates,
  activeHolidays,
  onApplyHolidays
}) => {
  const [selectedDates, setSelectedDates] = useState<string[]>(
    activeHolidays.map(normalizeDateIso).filter(Boolean)
  );
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedDates(activeHolidays.map(normalizeDateIso).filter(Boolean));
    }
  }, [isOpen, activeHolidays]);

  if (!isOpen) return null;

  const handleToggle = (dStr: string) => {
    const norm = normalizeDateIso(dStr);
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDate(d, norm));
      if (exists) {
        return prev.filter((d) => !isSameDate(d, norm));
      } else {
        return [...prev, norm].sort();
      }
    });
  };

  const handleAddCustomDate = () => {
    if (!customDate) return;
    const norm = normalizeDateIso(customDate);
    if (norm && !selectedDates.some((d) => isSameDate(d, norm))) {
      setSelectedDates((prev) => [...prev, norm].sort());
    }
    setCustomDate('');
  };

  const handleClearAll = () => {
    setSelectedDates([]);
  };

  const handleSave = () => {
    onApplyHolidays(selectedDates.map(normalizeDateIso).sort());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 text-left">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Official Paid Public Holidays</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                  {selectedDates.length} Selected
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Info Box */}
        <div className="p-4 bg-indigo-950/20 border-b border-indigo-900/30 text-xs text-indigo-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Custom Date Input if dataset doesn't have dates yet */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              onClick={handleAddCustomDate}
              disabled={!customDate}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Date</span>
            </button>
          </div>

          {/* Month Calendar Dates Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Current Sheet Dates ({allDates.length} days):
              </span>
              {selectedDates.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {allDates.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No dates loaded yet. Upload your monthly biometric sheet or add custom dates above.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                {allDates.map((dStr) => {
                  const isSelected = selectedDates.some((d) => isSameDate(d, dStr));
                  const isFri = checkIsFriday(dStr);
                  const dayName = isFri ? 'Friday' : getEnglishDayName(dStr);
                  const formatted = formatDateToDmy(dStr);

                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => handleToggle(dStr)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 font-semibold shadow-xs'
                          : isFri
                          ? 'bg-slate-950/40 border-indigo-900/40 text-indigo-400 hover:bg-slate-800/60'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px]">{formatted}</div>
                        <div className="text-[10px] text-slate-400">
                          {dayName} {isFri && '• Rest'}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected 
                          ? 'bg-indigo-500 border-indigo-400 text-white' 
                          : 'border-slate-600 bg-slate-800/50'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Summary Tags */}
          {selectedDates.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold mb-2">
                Designated Official Holidays ({selectedDates.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedDates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-medium"
                  >
                    <span>{formatDateToDmy(d)}</span>
                    <button
                      type="button"
                      onClick={() => handleToggle(d)}
                      className="hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply Official Holidays ({selectedDates.length})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
