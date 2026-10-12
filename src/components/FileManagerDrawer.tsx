import React from 'react';
import { 
  X, 
  Files, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Calendar, 
  Layers 
} from 'lucide-react';
import { UploadedFileInfo } from '../types/audit';

interface FileManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: UploadedFileInfo[];
  onRemoveFile: (fileId: string) => void;
  onOpenUploadModal: () => void;
}

export const FileManagerDrawer: React.FC<FileManagerDrawerProps> = ({
  isOpen,
  onClose,
  files,
  onRemoveFile,
  onOpenUploadModal
}) => {
  if (!isOpen) return null;

  const attendanceFiles = files.filter((f) => f.type === 'attendance');
  const overtimeFiles = files.filter((f) => f.type === 'overtime');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-900 border-r border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Manage Uploaded Audit Sheets ({files.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Master Attendance Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Sheet: Present Master ({attendanceFiles.length})</span>
              </span>
            </div>

            {attendanceFiles.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No master sheet Present uploaded yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {attendanceFiles.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono text-slate-200 font-medium truncate max-w-[220px]">
                        {f.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {f.rowsCount} attendance records • {f.uploadedAt}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFile(f.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete this file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Overtime Sheets Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Files className="w-4 h-4" />
                <span>Separate Daily Overtime Sheets ({overtimeFiles.length})</span>
              </span>
              <button
                onClick={onOpenUploadModal}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Daily Sheets</span>
              </button>
            </div>

            {overtimeFiles.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No daily overtime sheets uploaded yet
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                {overtimeFiles.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono text-amber-300 font-medium truncate max-w-[220px]">
                        {f.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        {f.dateAttached && (
                          <span className="flex items-center gap-0.5 text-slate-300">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{f.dateAttached}</span>
                          </span>
                        )}
                        <span>{f.rowsCount} Registered Employees</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFile(f.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete this daily sheet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onOpenUploadModal}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Upload More Daily Sheets</span>
          </button>
        </div>

      </div>
    </div>
  );
};
