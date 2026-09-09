import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  PlusCircle, 
  FileText, 
  FileSpreadsheet, 
  Settings, 
  Table as TableIcon, 
  BarChart3, 
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { ViewMode, ReportConfig } from '../types';

interface NavbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenFastEntry: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
  reportConfig: ReportConfig;
  totalRecords: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  onOpenFastEntry,
  onExportPDF,
  onExportExcel,
  onOpenSettings,
  onOpenImport,
  reportConfig,
  totalRecords,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 py-2">
          {/* Brand & Sector Info */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0 shadow-sm">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight font-sans truncate">
                  SIPATROLI<span className="text-indigo-600">DCKTRP</span>
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime Active
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-tight truncate">
                Sektor DCKTRP Cakung • {reportConfig.periode}
              </p>
            </div>
          </div>

          {/* Center: Live Clock & Date */}
          <div className="hidden lg:flex items-center space-x-3 px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{dateStr}</span>
            </div>
            <div className="h-3.5 w-[1px] bg-slate-300"></div>
            <span className="text-slate-900 font-mono font-bold">{timeStr}</span>
          </div>

          {/* Actions: Fast Entry & Quick Exports */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <button
              id="btn-fast-entry"
              onClick={onOpenFastEntry}
              className="hidden sm:flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
              title="Input data pengawasan realtime (Tekan F2 atau klik disini)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Input Lapangan</span>
            </button>

            {/* Export Buttons (Desktop) */}
            <div className="hidden sm:flex items-center space-x-1.5">
              <button
                id="btn-export-pdf"
                onClick={onExportPDF}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer"
                title="Cetak Laporan PDF Resmi Sesuai Format DCKTRP"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">Cetak PDF</span>
              </button>

              <button
                id="btn-export-excel"
                onClick={onExportExcel}
                className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider border border-slate-200 transition active:scale-95 cursor-pointer"
                title="Ekspor ke Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Excel</span>
              </button>

              <button
                id="btn-import-data"
                onClick={onOpenImport}
                className="p-2 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition cursor-pointer"
                title="Import Excel / CSV"
              >
                <UploadCloud className="w-4 h-4 text-indigo-600" />
              </button>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className="p-2 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition cursor-pointer"
              title="Pengaturan & Penandatangan Laporan"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View mode bar & stats bar */}
        <div className="flex items-center justify-between pb-2 pt-1.5 sm:pb-2.5 sm:pt-2 border-t border-slate-200 gap-2">
          <div className="flex items-center space-x-1 bg-slate-100/90 p-0.5 rounded border border-slate-200 text-xs">
            <button
              id="nav-tab-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded font-bold text-[11px] sm:text-xs uppercase tracking-wider transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Tabel<span className="hidden sm:inline"> Resmi</span></span>
            </button>
            <button
              id="nav-tab-analytics"
              onClick={() => setViewMode('analytics')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded font-bold text-[11px] sm:text-xs uppercase tracking-wider transition cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Statistik<span className="hidden sm:inline"> & Teritorial</span></span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:inline">
              Data Terinput:
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 font-mono text-[11px] sm:text-xs">
              {totalRecords} Lokasi
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
