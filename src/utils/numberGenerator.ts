import { PatrolRecord, ReportConfig } from '../types';

export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatDateIndo(dateObj: Date = new Date()): string {
  const d = dateObj.getDate();
  const m = BULAN_INDONESIA[dateObj.getMonth()];
  const y = dateObj.getFullYear();
  return `${d} ${m} ${y}`;
}

export function formatISODate(dateObj: Date = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIndoDateToISO(indoStr: string): string {
  if (!indoStr) return formatISODate();
  const parts = indoStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthIndex = BULAN_INDONESIA.findIndex(
      b => b.toLowerCase() === parts[1].toLowerCase()
    );
    const year = parts[2];
    if (monthIndex !== -1 && year.length === 4) {
      const month = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return formatISODate();
}

export function parseISOToIndo(isoStr: string): string {
  if (!isoStr) return formatDateIndo();
  const [y, m, d] = isoStr.split('-');
  const mIdx = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  if (mIdx >= 0 && mIdx < 12) {
    return `${day} ${BULAN_INDONESIA[mIdx]} ${y}`;
  }
  return isoStr;
}

export const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function generateNextNomorInput(
  records: PatrolRecord[],
  currentDate: Date = new Date(),
  kelurahan: string = 'CAKUNG BARAT'
): string {
  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();
  const romanMonth = ROMAN_MONTHS[monthIdx];
  const formattedKelurahan = kelurahan.toUpperCase().replace(/\s+/g, '_');
  
  const currentMonthISO = formatISODate(currentDate).substring(0, 7);

  let maxSeq = 0;
  for (const r of records) {
    const rawDate = r.tanggalRaw || parseIndoDateToISO(r.tanggal);
    if (rawDate.startsWith(currentMonthISO)) {
      const match = r.nomorInput.match(/\/(\d{3})$/);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `PATROLI/${romanMonth}/${formattedKelurahan}/${year}/${nextSeq}`;
}
