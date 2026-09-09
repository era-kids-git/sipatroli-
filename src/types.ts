export type KelurahanCakung = 
  | 'Cakung Timur'
  | 'Pulo Gebang'
  | 'Ujung Menteng'
  | 'Jatinegara'
  | 'Penggilingan'
  | 'Cakung Barat'
  | 'Rawa Terate';

export type StatusPengawasan = 
  | 'Ada IMB/PBG'
  | 'Peringatan / SP'
  | 'Penghentian Sementara'
  | 'Tanpa Izin (Indikasi)'
  | 'Penyegelan'
  | 'Patroli Jalan';

export interface PatrolRecord {
  id: string;
  no: number;
  tanggal: string; // e.g. "18 Agustus 2026" or "2026-08-18"
  tanggalRaw?: string; // ISO format "2026-08-18"
  waktu?: string; // "09:30 WIB"
  nomorInput: string; // e.g. "7126.75.2026/PATROLI/-082.74"
  lokasi: string; // e.g. "JL. GEBANG INTAN VII"
  kecamatan: string; // default "Cakung"
  kelurahan: KelurahanCakung | string;
  status?: StatusPengawasan;
  catatan?: string;
  petugas?: string;
  foto?: string | string[]; // base64 or photo URL, can be multiple
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  gpsRadius?: number; // Visualisasi radius pengawasan (default 150m)
  createdAt: number;
}

export interface ReportConfig {
  judul: string;
  subJudul: string;
  periode: string; // e.g. "BULAN AGUSTUS MINGGU KE-3"
  tahun: string; // "2026"
  pejabatNama: string; // "Riviansyah"
  pejabatJabatan: string; // "Staf Sektor Dinas Cipta Karya, Tata Ruang dan Pertanahan Kecamatan Cakung"
  pejabatNip: string; // "198402232007011008"
  nomorFormatPrefix: string; // default "PATROLI/-082.74"
  nomorKodeWilayah: string; // "75"
}

export type ViewMode = 'table' | 'analytics';
