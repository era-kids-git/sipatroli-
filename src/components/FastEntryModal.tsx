import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Camera, 
  Check, 
  Sparkles, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  Building2, 
  UserCheck, 
  FileText,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Compass
} from 'lucide-react';
import { 
  KelurahanCakung, 
  StatusPengawasan, 
  PatrolRecord, 
  ReportConfig 
} from '../types';
import { GoogleMapView } from './GoogleMapView';
import { 
  KELURAHAN_LIST,
  KELURAHAN_COORDINATES
} from '../data/initialData';
import { 
  formatDateIndo, 
  formatISODate, 
  parseISOToIndo, 
  generateNextNomorInput 
} from '../utils/numberGenerator';
import { compressImage } from '../utils/storage';

interface FastEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<PatrolRecord, 'id' | 'no' | 'createdAt'>) => void;
  records: PatrolRecord[];
  reportConfig: ReportConfig;
  initialEditRecord?: PatrolRecord | null;
}

export const FastEntryModal: React.FC<FastEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  records,
  reportConfig,
  initialEditRecord,
}) => {
  const [isoDate, setIsoDate] = useState<string>(formatISODate());
  const [nomorInput, setNomorInput] = useState<string>('');
  const [kelurahan, setKelurahan] = useState<KelurahanCakung>('Pulo Gebang');
  const [kecamatan, setKecamatan] = useState<string>('Cakung');
  const [lokasi, setLokasi] = useState<string>('');
  const [status, setStatus] = useState<StatusPengawasan>('Patroli Jalan');
  const [catatan, setCatatan] = useState<string>('');
  const [waktu, setWaktu] = useState<string>('');
  
  // GPS & Location state
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [gpsRadius, setGpsRadius] = useState<number>(150);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [isManualGpsOpen, setIsManualGpsOpen] = useState<boolean>(false);
  const [manualLatInput, setManualLatInput] = useState<string>('');
  const [manualLngInput, setManualLngInput] = useState<string>('');

  // Photo
  const [foto, setFoto] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (initialEditRecord) {
      setIsoDate(initialEditRecord.tanggalRaw || formatISODate());
      setNomorInput(initialEditRecord.nomorInput);
      setKelurahan(initialEditRecord.kelurahan as KelurahanCakung || 'Pulo Gebang');
      setKecamatan(initialEditRecord.kecamatan || 'Cakung');
      setLokasi(initialEditRecord.lokasi);
      setStatus(initialEditRecord.status || 'Patroli Jalan');
      setCatatan(initialEditRecord.catatan || '');
      setWaktu(initialEditRecord.waktu || '');
      setFoto(Array.isArray(initialEditRecord.foto) ? initialEditRecord.foto : (initialEditRecord.foto ? [initialEditRecord.foto] : []));
      setLatitude(initialEditRecord.latitude);
      setLongitude(initialEditRecord.longitude);
      setAccuracy(initialEditRecord.accuracy);
      setGpsRadius(initialEditRecord.gpsRadius || 150);
      setManualLatInput(initialEditRecord.latitude !== undefined ? String(initialEditRecord.latitude) : '');
      setManualLngInput(initialEditRecord.longitude !== undefined ? String(initialEditRecord.longitude) : '');
    } else {
      // New record defaults
      const todayISO = formatISODate();
      setIsoDate(todayISO);
      const generatedNo = generateNextNomorInput(records, new Date(), kelurahan);
      setNomorInput(generatedNo);
      setLokasi('');
      setCatatan('');
      setStatus('Patroli Jalan');
      const now = new Date();
      setWaktu(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      );
      setFoto([]);
      setGpsError('');
      setGpsRadius(150);
      // Auto-populate default kelurahan coordinate for seamless offline & online accuracy
      const preset = KELURAHAN_COORDINATES[kelurahan];
      if (preset) {
        setLatitude(preset.lat);
        setLongitude(preset.lng);
        setManualLatInput(String(preset.lat));
        setManualLngInput(String(preset.lng));
      } else {
        setLatitude(undefined);
        setLongitude(undefined);
        setManualLatInput('');
        setManualLngInput('');
      }
      setIsManualGpsOpen(false);
    }
  }, [isOpen, initialEditRecord, records, kelurahan]);

  // Quick Nudge GPS adjustment (+/- 0.0002 deg is approx 22 meters)
  const handleNudgeGps = (dLat: number, dLng: number) => {
    const currentLat = latitude ?? -6.2087;
    const currentLng = longitude ?? 106.9536;
    const newLat = Number((currentLat + dLat).toFixed(6));
    const newLng = Number((currentLng + dLng).toFixed(6));
    setLatitude(newLat);
    setLongitude(newLng);
    setManualLatInput(String(newLat));
    setManualLngInput(String(newLng));
  };

  const handleApplyManualGps = () => {
    const parsedLat = parseFloat(manualLatInput);
    const parsedLng = parseFloat(manualLngInput);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      alert('Koordinat latitude/longitude tidak valid!');
      return;
    }
    setLatitude(Number(parsedLat.toFixed(6)));
    setLongitude(Number(parsedLng.toFixed(6)));
    setIsManualGpsOpen(false);
  };

  const handleResetToKelurahanCenter = () => {
    const preset = KELURAHAN_COORDINATES[kelurahan];
    if (preset) {
      setLatitude(preset.lat);
      setLongitude(preset.lng);
      setManualLatInput(String(preset.lat));
      setManualLngInput(String(preset.lng));
      setAccuracy(150);
    }
  };

  // Get current GPS Coordinates
  const fetchCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation tidak didukung pada browser ini');
      return;
    }

    setIsLocating(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setManualLatInput(String(lat));
        setManualLngInput(String(lng));
        setAccuracy(Math.round(pos.coords.accuracy));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGpsError(
          err.code === 1
            ? 'Izin GPS ditolak oleh pengguna'
            : 'Gagal mendeteksi koordinat GPS'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (foto.length + files.length > 4) {
      alert('Maksimal 4 foto yang dapat diunggah');
      return;
    }

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        alert(`Ukuran foto ${file.name} maksimal 15MB`);
        continue;
      }

      try {
        const compressed = await compressImage(file, 1200, 0.75);
        if (compressed) {
          setFoto(prev => {
            if (prev.length < 4) {
              return [...prev, compressed];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setFoto(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegenerateNumber = () => {
    const generated = generateNextNomorInput(records, new Date(isoDate), kelurahan);
    setNomorInput(generated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lokasi.trim()) {
      alert('Mohon masukkan nama Lokasi patroli!');
      return;
    }

    const formattedTanggal = parseISOToIndo(isoDate);

    onSave({
      tanggal: formattedTanggal,
      tanggalRaw: isoDate,
      waktu: waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      nomorInput: nomorInput.trim(),
      lokasi: lokasi.trim().toUpperCase(),
      kecamatan: kecamatan.trim() || 'Cakung',
      kelurahan: kelurahan,
      status: status,
      catatan: catatan.trim(),
      foto: foto,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      gpsRadius: gpsRadius || 150,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {initialEditRecord ? 'Ubah Data Patroli' : 'Input Realtime Pengawasan'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Sektor DCKTRP Kecamatan Cakung • Form Pengawasan Lapangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form id="form-fast-patrol" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-900">
          {/* Row 1: Tanggal & Nomor Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tanggal Patroli <span className="text-red-500">*</span>
              </label>
              <input
                id="input-tanggal"
                type="date"
                value={isoDate}
                onChange={(e) => setIsoDate(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded px-3 py-2 text-sm text-slate-900 outline-none transition"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Format Laporan: <span className="text-indigo-700 font-semibold">{parseISOToIndo(isoDate)}</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Nomor Input <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateNumber}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Generate nomor urut otomatis"
                >
                  <RefreshCw className="w-3 h-3" /> Auto No.
                </button>
              </div>
              <input
                id="input-nomor"
                type="text"
                value={nomorInput}
                onChange={(e) => setNomorInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded px-3 py-2 text-sm font-mono text-slate-900 outline-none transition"
                placeholder="PATROLI/VIII/CAKUNG_BARAT/2026/001"
                required
              />
            </div>
          </div>

          {/* Row 2: Kelurahan Quick Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Kelurahan di Kecamatan Cakung <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal">PILIH 1-KLIK</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KELURAHAN_LIST.map((kel) => (
                <button
                  key={kel}
                  type="button"
                  onClick={() => setKelurahan(kel)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                    kelurahan === kel
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {kel}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Lokasi Patroli */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nama Lokasi / Jalan / Bangunan <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <input
                id="input-lokasi"
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded px-3 py-2.5 text-sm text-slate-900 uppercase tracking-wide outline-none transition font-semibold"
                placeholder="CONTOH: JL. GEBANG INTAN VII"
                required
              />
            </div>
          </div>

          {/* Row 4: Status Pengawasan & Temuan */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Status Pengawasan / Hasil Temuan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Patroli Jalan' },
                { label: 'Ada IMB/PBG' },
                { label: 'Tanpa Izin (Indikasi)' },
                { label: 'Peringatan / SP' },
                { label: 'Penghentian Sementara' },
                { label: 'Penyegelan' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStatus(item.label as StatusPengawasan)}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold text-left truncate transition cursor-pointer border ${
                    status === item.label
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: GPS Geolocation & Manual Edit */}
          <div className="p-3.5 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Koordinat GPS & Radius 150m
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800">
                  Radius {gpsRadius}m
                </span>
              </div>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={fetchCurrentGPS}
                  disabled={isLocating}
                  className="flex items-center space-x-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                  title="Ambil GPS dari perangkat secara online/lokal"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Mencari...' : 'GPS Perangkat'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualGpsOpen(!isManualGpsOpen)}
                  className="flex items-center space-x-1 text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-300 transition cursor-pointer"
                  title="Ubah titik GPS secara manual (online & offline)"
                >
                  <Edit2 className="w-3 h-3 text-slate-600" />
                  <span>{isManualGpsOpen ? 'Tutup Edit' : 'Ubah Titik'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToKelurahanCenter}
                  className="flex items-center space-x-1 text-xs bg-white hover:bg-slate-100 text-slate-600 font-medium px-2 py-1 rounded border border-slate-200 transition cursor-pointer"
                  title={`Reset ke pusat ${kelurahan}`}
                >
                  <Compass className="w-3 h-3 text-slate-500" />
                  <span>Pusat {kelurahan}</span>
                </button>
              </div>
            </div>

            {/* Current Coordinates Display */}
            {latitude && longitude ? (
              <div className="mt-2.5 text-xs flex flex-wrap items-center gap-2 text-slate-700">
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 font-semibold">
                  {latitude}, {longitude}
                </span>
                {accuracy && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Akurasi ~{accuracy}m)
                  </span>
                )}
                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Radius Pengawasan: 150m
                </span>
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline text-[11px] ml-auto font-bold"
                >
                  Buka di Google Maps ↗
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1.5">
                {gpsError || 'Klik tombol "GPS Perangkat" atau "Ubah Titik" untuk menentukan koordinat patroli.'}
              </p>
            )}

            {/* Manual Coordinate Editing Panel */}
            {isManualGpsOpen && (
              <div className="mt-3 p-3 bg-white rounded border border-indigo-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Input / Modifikasi Titik Koordinat (Online & Offline)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bisa diubah kapan saja tanpa koneksi internet
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={manualLatInput}
                      onChange={(e) => setManualLatInput(e.target.value)}
                      placeholder="-6.208700"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={manualLngInput}
                      onChange={(e) => setManualLngInput(e.target.value)}
                      placeholder="106.953600"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <GoogleMapView 
                    latitude={parseFloat(manualLatInput) || -6.2087} 
                    longitude={parseFloat(manualLngInput) || 106.9536} 
                    isDraggable={true}
                    onDragEnd={(lat, lng) => {
                      setManualLatInput(lat.toFixed(6));
                      setManualLngInput(lng.toFixed(6));
                    }}
                    className="w-full h-48"
                  />
                  <p className="text-[10px] text-indigo-600 mt-1 font-semibold">Geser icon merah pada peta untuk mengubah lokasi.</p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleApplyManualGps}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition cursor-pointer"
                  >
                    Terapkan Titik Peta
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 6: Foto Dokumentasi */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Foto Dokumentasi Lapangan (Maks 4)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer flex-1 justify-center"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Ambil / Unggah Foto</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Photo Preview if any */}
          {foto.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {foto.map((f, i) => (
                <div key={i} className="relative rounded overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center h-24">
                  <img
                    src={f}
                    alt={`Dokumentasi ${i + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Catatan / Uraian Pengawasan (Opsional)
            </label>
            <textarea
              id="input-catatan"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan kondisi lapangan, jenis bangunan, progres konstruksi, atau tindak lanjut..."
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded px-3 py-2 text-xs text-slate-900 outline-none transition resize-none leading-relaxed"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Pop-up hasil input & fitur Bagikan JPG (Peta Google) otomatis muncul setelah disimpan</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialEditRecord ? 'Perbarui Data' : 'Simpan & Tampilkan Hasil'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
