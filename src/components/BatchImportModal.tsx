import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { PatrolRecord } from '../types';
import { parseExcelOrCSV } from '../utils/excelExport';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: Partial<PatrolRecord>[]) => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Partial<PatrolRecord>[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMsg('');
    setIsProcessing(true);

    parseExcelOrCSV(
      selected,
      (data) => {
        setPreviewData(data);
        setIsProcessing(false);
      },
      (err) => {
        setErrorMsg(err);
        setIsProcessing(false);
      }
    );
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    onImportSuccess(previewData);
    alert(`Berhasil mengimpor ${previewData.length} baris data patroli!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Import Data Patroli (Excel/CSV)</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Unggah berkas spreadsheet dengan kolom Tanggal, Nomor Input, Lokasi, Kelurahan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-900">
          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 mb-2 transition" />
            <span className="font-bold text-slate-800 text-sm">
              {file ? file.name : 'Pilih atau Tarik Berkas Excel (.xlsx, .xls, .csv)'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-medium">
              Maksimal 10MB • Format kolom standar DCKTRP
            </span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview if loaded */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {previewData.length} data siap diimpor
                </span>
                <span className="text-slate-500 font-medium">Pratinjau 3 baris teratas</span>
              </div>

              <div className="bg-white border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">No</th>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Lokasi</th>
                      <th className="p-2.5">Kelurahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {previewData.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-mono text-slate-600">{r.no || i + 1}</td>
                        <td className="p-2.5">{r.tanggal || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{r.lokasi || '-'}</td>
                        <td className="p-2.5 font-semibold text-indigo-700">{r.kelurahan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={previewData.length === 0 || isProcessing}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Impor {previewData.length > 0 ? `(${previewData.length} Data)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
