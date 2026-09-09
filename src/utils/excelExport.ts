import * as XLSX from 'xlsx';
import { PatrolRecord, ReportConfig } from '../types';

export function exportPatrolExcel(records: PatrolRecord[], config: ReportConfig) {
  const data = records.map((r, idx) => ({
    'No.': r.no || idx + 1,
    'Tanggal': r.tanggal,
    'Nomor Input': r.nomorInput,
    'Lokasi': r.lokasi,
    'Kecamatan': r.kecamatan,
    'Kelurahan': r.kelurahan,
    'Status Pengawasan': r.status || 'Patroli Jalan',
    'Catatan / Temuan': r.catatan || '-',
    'Koordinat GPS': r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 18 }, // Tanggal
    { wch: 34 }, // Nomor Input
    { wch: 42 }, // Lokasi
    { wch: 14 }, // Kecamatan
    { wch: 18 }, // Kelurahan
    { wch: 22 }, // Status
    { wch: 30 }, // Catatan
    { wch: 24 }, // Koordinat
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Patroli');

  const fileName = `Laporan_Patroli_DCKTRP_Cakung_${config.periode.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function parseExcelOrCSV(
  file: File,
  onSuccess: (records: Partial<PatrolRecord>[]) => void,
  onError: (err: string) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      const parsed: Partial<PatrolRecord>[] = json.map((row, i) => {
        return {
          no: row['No.'] || row['No'] || row['no'] || i + 1,
          tanggal: row['Tanggal'] || row['tanggal'] || '',
          nomorInput: row['Nomor Input'] || row['Nomor'] || row['nomorInput'] || '',
          lokasi: row['Lokasi'] || row['lokasi'] || '',
          kecamatan: row['Kecamatan'] || row['kecamatan'] || 'Cakung',
          kelurahan: row['Kelurahan'] || row['kelurahan'] || 'Cakung Timur',
          status: row['Status Pengawasan'] || row['Status'] || 'Patroli Jalan',
          catatan: row['Catatan / Temuan'] || row['Catatan'] || '',
        };
      });

      onSuccess(parsed);
    } catch (err: any) {
      onError(err.message || 'Gagal memproses berkas Excel / CSV');
    }
  };
  reader.onerror = () => onError('Gagal membaca file');
  reader.readAsArrayBuffer(file);
}
