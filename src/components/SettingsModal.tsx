import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Shield, 
  User, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Layers
} from 'lucide-react';
import { ReportConfig, PatrolRecord } from '../types';
import { DEFAULT_REPORT_CONFIG, INITIAL_PATROL_RECORDS } from '../data/initialData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReportConfig;
  onSaveConfig: (newConfig: ReportConfig) => void;
  records: PatrolRecord[];
  onRestoreRecords: (records: PatrolRecord[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  records,
  onRestoreRecords,
}) => {
  const [formData, setFormData] = useState<ReportConfig>(config);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleExecuteReset = () => {
    setIsConfirmResetOpen(false);
    onRestoreRecords([]);
    onClose();
  };

  const handleExportBackup = () => {
    const backupData = {
      config: formData,
      records: records,
      exportDate: new Date().toISOString(),
      app: 'SiPatroli DCKTRP Cakung',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SiPatroli_Cakung_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.records && Array.isArray(json.records)) {
          onRestoreRecords(json.records);
          if (json.config) {
            setFormData(json.config);
            onSaveConfig(json.config);
          }
          alert(`Berhasil memulihkan ${json.records.length} data patroli!`);
          onClose();
        } else {
          alert('Format file cadangan tidak valid');
        }
      } catch (err) {
        alert('Gagal membaca file backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMergeBackups = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let allIncomingRecords: PatrolRecord[] = [];
    const failedFiles: string[] = [];

    const readFile = (file: File): Promise<any[]> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            let items: any[] = [];
            if (Array.isArray(json)) {
              items = json;
            } else if (json.records && Array.isArray(json.records)) {
              items = json.records;
            } else if (json.data && Array.isArray(json.data)) {
              items = json.data;
            }
            resolve(items);
          } catch (err) {
            failedFiles.push(file.name);
            resolve([]);
          }
        };
        reader.onerror = () => {
          failedFiles.push(file.name);
          resolve([]);
        };
        reader.readAsText(file);
      });
    };

    const results = await Promise.all(fileList.map(readFile));
    allIncomingRecords = results.flat();

    if (allIncomingRecords.length === 0) {
      alert(
        failedFiles.length > 0
          ? `Gagal membaca file backup: ${failedFiles.join(', ')}`
          : 'Tidak ada data patroli yang ditemukan dalam file backup yang dipilih.'
      );
      e.target.value = '';
      return;
    }

    // Deduplication keys
    const existingKeys = new Set<string>();
    records.forEach((r) => {
      if (r.nomorInput) existingKeys.add(`no:${r.nomorInput.trim().toLowerCase()}`);
      if (r.tanggal && r.lokasi) {
        existingKeys.add(`tl:${r.tanggal.trim().toLowerCase()}_${r.lokasi.trim().toLowerCase()}`);
      }
      if (r.id) existingKeys.add(`id:${r.id}`);
    });

    const newUniqueRecords: PatrolRecord[] = [];
    let duplicateCount = 0;

    allIncomingRecords.forEach((item, index) => {
      if (!item) return;
      const nomorKey = item.nomorInput ? `no:${item.nomorInput.trim().toLowerCase()}` : '';
      const tlKey = item.tanggal && item.lokasi ? `tl:${item.tanggal.trim().toLowerCase()}_${item.lokasi.trim().toLowerCase()}` : '';
      const idKey = item.id ? `id:${item.id}` : '';

      const isDuplicate =
        (nomorKey && existingKeys.has(nomorKey)) ||
        (tlKey && existingKeys.has(tlKey)) ||
        (idKey && existingKeys.has(idKey));

      if (isDuplicate) {
        duplicateCount++;
      } else {
        if (nomorKey) existingKeys.add(nomorKey);
        if (tlKey) existingKeys.add(tlKey);
        if (idKey) existingKeys.add(idKey);

        const uniqueId = `rec-mrg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`;
        newUniqueRecords.push({
          ...item,
          id: uniqueId,
          createdAt: item.createdAt || Date.now() + index,
        });
      }
    });

    if (newUniqueRecords.length === 0) {
      alert(
        `Semua ${allIncomingRecords.length} data dalam ${fileList.length} file backup sudah ada di sistem (terdeteksi duplikat). Tidak ada data baru yang ditambahkan.`
      );
      e.target.value = '';
      return;
    }

    const mergedList: PatrolRecord[] = [...records, ...newUniqueRecords].map((r, idx) => ({
      ...r,
      no: idx + 1,
    }));

    onRestoreRecords(mergedList);

    const summaryMsg = [
      `Berhasil menggabungkan ${newUniqueRecords.length} data baru dari ${fileList.length} file backup!`,
      duplicateCount > 0 ? `(${duplicateCount} data duplikat dilewati).` : '',
      `Total data saat ini: ${mergedList.length} data.`
    ].filter(Boolean).join(' ');

    alert(summaryMsg);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Pengaturan Laporan & Pejabat
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Konfigurasi kop surat, penandatangan resmi, dan backup data
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-900">
          {/* Section: Kop & Periode */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px] text-indigo-700">
              <FileText className="w-3.5 h-3.5" /> Judul & Periode Laporan
            </h3>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Judul Laporan Resmi
              </label>
              <input
                type="text"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Periode Laporan
                </label>
                <input
                  type="text"
                  value={formData.periode}
                  onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                  placeholder="BULAN AGUSTUS MINGGU KE-3"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Tahun Anggaran
                </label>
                <input
                  type="text"
                  value={formData.tahun}
                  onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                  placeholder="2026"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Pejabat Penandatangan */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px] text-indigo-700">
              <User className="w-3.5 h-3.5" /> Pejabat Penandatangan Laporan
            </h3>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Nama Pejabat / Staf Penandatangan
              </label>
              <input
                type="text"
                value={formData.pejabatNama}
                onChange={(e) => setFormData({ ...formData, pejabatNama: e.target.value })}
                placeholder="Riviansyah"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                NIP Pejabat
              </label>
              <input
                type="text"
                value={formData.pejabatNip}
                onChange={(e) => setFormData({ ...formData, pejabatNip: e.target.value })}
                placeholder="198402232007011008"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                Jabatan Resmi
              </label>
              <input
                type="text"
                value={formData.pejabatJabatan}
                onChange={(e) => setFormData({ ...formData, pejabatJabatan: e.target.value })}
                placeholder="Staf Sektor Dinas Cipta Karya, Tata Ruang dan Pertanahan Kecamatan Cakung"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section: Cadangan & Pemulihan */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px] text-slate-800">
              <Shield className="w-3.5 h-3.5 text-indigo-600" /> Cadangan & Sinkronisasi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition cursor-pointer text-xs"
                title="Unduh semua data patroli dan konfigurasi ke format file JSON"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Unduh Backup</span>
              </button>

              <label 
                className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition cursor-pointer text-xs"
                title="Pulihkan data dari 1 file backup JSON (menggantikan data saat ini)"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Pulihkan Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <label 
                className="flex items-center justify-center space-x-1.5 p-2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition cursor-pointer text-xs"
                title="Pilih beberapa file backup JSON untuk digabungkan menjadi satu tanpa duplikat"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Gabung Backup</span>
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleMergeBackups}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmResetOpen(true)}
              className="w-full flex items-center justify-center space-x-1.5 p-2.5 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 transition cursor-pointer mt-1 text-xs"
              title="Kosongkan seluruh data patroli menjadi 0 data"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Reset Data (0 Data)</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Tersimpan di peramban lokal.
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pop Up Pilihan: Setuju & Batal untuk Reset Data */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Konfirmasi Reset Data
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin melakukan <strong>Reset Data</strong> dan mengosongkan seluruh data menjadi <strong>0 (nol) data</strong>?
                </p>
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                  Perhatian: Semua {records.length} data patroli yang tersimpan saat ini akan dihapus dari sistem.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(false)}
                className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-5 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Setuju</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
