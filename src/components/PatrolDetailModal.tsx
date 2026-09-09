import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Hash, 
  Camera, 
  ShieldCheck, 
  FileText, 
  Share2,
  Download,
  Loader2,
  Check
} from 'lucide-react';
import { PatrolRecord, ReportConfig } from '../types';
import { sharePatrolCardJpg, generatePatrolCardJpg, downloadJpgFile } from '../utils/generatePatrolCardJpg';
import { GoogleMapView } from './GoogleMapView';

interface PatrolDetailModalProps {
  record: PatrolRecord | null;
  onClose: () => void;
  onEdit: (record: PatrolRecord) => void;
  reportConfig?: ReportConfig;
}

export const PatrolDetailModal: React.FC<PatrolDetailModalProps> = ({
  record,
  onClose,
  onEdit,
  reportConfig,
}) => {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number>(0);
  const [isSharingJpg, setIsSharingJpg] = useState<boolean>(false);
  const [isDownloadingJpg, setIsDownloadingJpg] = useState<boolean>(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPhotoIdx(0);
    setShareSuccessMsg(null);
  }, [record?.id]);

  if (!record) return null;

  const photoList = Array.isArray(record.foto) 
    ? record.foto 
    : (record.foto ? [record.foto] : []);

  const lat = record.latitude ?? -6.2087;
  const lng = record.longitude ?? 106.9536;
  const radiusMeters = record.gpsRadius || 150;

  // Handle Share as JPG file with Google Maps
  const handleShareJpg = async () => {
    if (!record) return;
    setIsSharingJpg(true);
    setShareSuccessMsg(null);

    try {
      const result = await sharePatrolCardJpg(record, reportConfig);
      setShareSuccessMsg(result.message);
      setTimeout(() => setShareSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to share JPG:', err);
      alert('Gagal membagikan JPG: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSharingJpg(false);
    }
  };

  // Handle Direct Download of JPG file
  const handleDownloadJpg = async () => {
    if (!record) return;
    setIsDownloadingJpg(true);
    setShareSuccessMsg(null);

    try {
      const { blob, filename } = await generatePatrolCardJpg(record, reportConfig);
      downloadJpgFile(blob, filename);
      setShareSuccessMsg(`File JPG berhasil diunduh (${filename})!`);
      setTimeout(() => setShareSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to download JPG:', err);
      alert('Gagal mengunduh JPG: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsDownloadingJpg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-start justify-between shrink-0">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="bg-indigo-50 text-indigo-800 font-bold text-[10px] sm:text-xs uppercase px-2.5 py-1 rounded">
                Dokumentasi Patroli #{record.no}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sektor Cakung • Kel. {record.kelurahan}
              </span>
            </div>
            
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight break-words pr-8">
                {record.lokasi}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Kelurahan {record.kelurahan}, Kec. {record.kecamatan || 'Cakung'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification message toast if share/download succeeds */}
        {shareSuccessMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-white" />
              <span>{shareSuccessMsg}</span>
            </div>
            <button
              onClick={() => setShareSuccessMsg(null)}
              className="text-white/80 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-900">
          {/* Main Photo Viewer if available */}
          {photoList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Foto Dokumentasi {photoList.length > 1 ? `(Foto ${selectedPhotoIdx + 1})` : '(Foto 1)'}
                </span>
                {photoList.length > 1 && (
                  <span className="text-[10px] text-indigo-500 font-medium">
                    Ketuk thumbnail di bawah untuk berganti foto
                  </span>
                )}
              </div>

              {/* Main Photo view - strictly proportional */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center min-h-[240px] max-h-[400px] p-3">
                <img
                  src={photoList[selectedPhotoIdx] || photoList[0]}
                  alt={`${record.lokasi} - Foto ${selectedPhotoIdx + 1}`}
                  className="max-h-[380px] max-w-full w-auto h-auto object-contain rounded border border-slate-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm">
                  Foto {selectedPhotoIdx + 1}
                </div>
              </div>

              {/* Multiple photos thumbnail strip */}
              {photoList.length > 1 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {photoList.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedPhotoIdx(i)}
                      className={`relative rounded overflow-hidden border-2 h-16 bg-slate-100 transition cursor-pointer ${
                        selectedPhotoIdx === i
                          ? 'border-indigo-600 ring-2 ring-indigo-200'
                          : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={f}
                        alt={`Thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] font-bold text-center py-0.5">
                        Foto {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Key Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Tanggal */}
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Tanggal
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {record.tanggal}
              </p>
            </div>

            {/* Kelurahan */}
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Kelurahan
              </span>
              <p className="font-bold text-indigo-700 text-sm">{record.kelurahan}</p>
            </div>

            {/* Nomor Input Patroli */}
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                No. Input Patroli
              </span>
              <p className="font-bold text-slate-900 text-[11px] font-mono break-all leading-tight">{record.nomorInput}</p>
            </div>

            {/* Status Pengawasan */}
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Status Pengawasan
              </span>
              <p className="font-bold text-indigo-600 text-sm">{record.status || 'Patroli Jalan'}</p>
            </div>
          </div>

          {/* Notes if available */}
          {record.catatan && (
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-xs block mb-1 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Catatan Lapangan
              </span>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{record.catatan}</p>
            </div>
          )}

          {/* PETA GOOGLE INTERAKTIF RESMI & VISUALISASI RADIUS 150M */}
          <GoogleMapView
            latitude={lat}
            longitude={lng}
            radiusMeters={radiusMeters}
            locationName={record.lokasi}
          />
        </div>

        {/* Modal Footer: Action Bar for Sharing & Downloading JPG */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Secondary Actions: Download */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={isDownloadingJpg}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer disabled:opacity-50"
              title="Unduh file JPG langsung ke perangkat"
            >
              {isDownloadingJpg ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>Unduh JPG</span>
            </button>
          </div>

          {/* Primary Action: BAGIKAN FILE JPG (PETA GOOGLE) */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleShareJpg}
              disabled={isSharingJpg}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60"
              title="Bagikan file JPG kartu laporan beserta Peta Google"
            >
              {isSharingJpg ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat JPG & Peta...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Bagikan JPG (Peta Google)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
