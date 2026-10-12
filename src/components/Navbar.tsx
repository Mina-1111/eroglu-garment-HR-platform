import React from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Printer, 
  Sparkles, 
  Trash2, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  FileText,
  GitMerge
} from 'lucide-react';
import { AuditCompanyInfo } from '../types/audit';

interface NavbarProps {
  companyInfo: AuditCompanyInfo;
  onUpdateCompanyInfo: (info: AuditCompanyInfo) => void;
  onOpenUploadModal: () => void;
  onOpenPasteModal: () => void;
  onOpenMergeWizard: () => void;
  onLoadSampleData: () => void;
  onExportExcel: () => void;
  onPrintMaster: () => void;
  onClearData: () => void;
  hasData: boolean;
  totalEmployees: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  companyInfo,
  onUpdateCompanyInfo,
  onOpenUploadModal,
  onOpenPasteModal,
  onOpenMergeWizard,
  onLoadSampleData,
  onExportExcel,
  onPrintMaster,
  onClearData,
  hasData,
  totalEmployees
}) => {
  const [isEditingInfo, setIsEditingInfo] = React.useState(false);
  const [tempCompany, setTempCompany] = React.useState(companyInfo.companyName);
  const [tempAudit, setTempAudit] = React.useState(companyInfo.auditName);
  const [tempPeriod, setTempPeriod] = React.useState(companyInfo.auditPeriod);

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanyInfo({
      ...companyInfo,
      companyName: tempCompany,
      auditName: tempAudit,
      auditPeriod: tempPeriod
    });
    setIsEditingInfo(false);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand & Audit Title */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
              <ShieldCheck className="w-7 h-7 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white tracking-wide">
                  HR Audit Pro
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Overtime & Attendance Audit SuitePresent  & Overtime
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <button 
                  onClick={() => setIsEditingInfo(true)}
                  className="hover:text-amber-300 flex items-center gap-1 transition-colors underline decoration-dotted"
                  title="Edit Company Details & Audit Period"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{companyInfo.companyName}</span>
                </button>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Period: {companyInfo.auditPeriod}</span>
                </span>
                {hasData && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">
                      {totalEmployees} Registered Employees
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!hasData ? (
              <button
                onClick={onLoadSampleData}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Load Sample Sheets</span>
              </button>
            ) : (
              <button
                onClick={onLoadSampleData}
                className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all"
                title="Reload Sample Data"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sample Data</span>
              </button>
            )}

            <button
              onClick={onOpenMergeWizard}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              title="Merge Attendance Sheet with Daily Overtime Sheets by Employee Code"
            >
              <GitMerge className="w-4 h-4 stroke-[2.5]" />
              <span>Merge Wizard</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Sheets (Excel/CSV)</span>
            </button>

            <button
              onClick={onOpenPasteModal}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all hidden md:flex"
              title="Copy and paste tables directly from Excel"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Paste Data</span>
            </button>

            {hasData && (
              <>
                <button
                  onClick={onExportExcel}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all"
                  title="Export Official Audit Sheet to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel (.xlsx)</span>
                </button>

                <button
                  onClick={onPrintMaster}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all"
                  title="Print Master Audit Report or Save PDF"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  onClick={onClearData}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all"
                  title="Clear all data and start with fresh sheets"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal to edit company/audit title */}
      {isEditingInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Audit Entity & Period Details</span>
            </h3>
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Company / Factory / Entity Name
                </label>
                <input
                  type="text"
                  value={tempCompany}
                  onChange={(e) => setTempCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Audit Title / Name
                </label>
                <input
                  type="text"
                  value={tempAudit}
                  onChange={(e) => setTempAudit(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Audit Period (e.g. October 2026)
                </label>
                <input
                  type="text"
                  value={tempPeriod}
                  onChange={(e) => setTempPeriod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
