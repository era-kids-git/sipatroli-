import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatrolRecord, ReportConfig } from '../types';

export function exportPatrolPDF(
  records: PatrolRecord[],
  config: ReportConfig,
  filterDescription?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const title1 = config.judul || 'LAPORAN DATA PATROLI TERITORIAL SEKTOR DCKTRP KEC. CAKUNG JAKARTA TIMUR';
  const title2 = config.periode || 'BULAN AGUSTUS MINGGU KE-3';

  doc.text(title1, pageWidth / 2, 18, { align: 'center' });
  doc.text(title2, pageWidth / 2, 23, { align: 'center' });

  if (filterDescription) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`* ${filterDescription}`, 14, 28);
  }

  // Prepare table data
  const tableData = records.map((rec, index) => [
    rec.no || index + 1,
    rec.tanggal,
    rec.nomorInput,
    rec.lokasi,
    rec.kecamatan || 'Cakung',
    rec.kelurahan,
  ]);

  autoTable(doc, {
    startY: filterDescription ? 30 : 27,
    head: [['No.', 'Tanggal', 'Nomor Input', 'Lokasi', 'Kecamatan', 'Kelurahan']],
    body: tableData,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.6,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 44 },
      3: { halign: 'left', cellWidth: 'auto' },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 26 },
    },
    margin: { top: 25, bottom: 45, left: 12, right: 12 },
    didDrawPage: (data) => {
      // Page number in footer
      const str = `Halaman ${data.pageNumber} dari ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  // Check if we have enough space on current page for signatory block, else add page
  // @ts-ignore
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 180;
  let signStartY = finalY + 12;

  if (signStartY + 35 > pageHeight - 15) {
    doc.addPage();
    signStartY = 25;
  }

  const signX = pageWidth - 65;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const jabatan = config.pejabatJabatan || 'Staf Sektor Dinas Cipta Karya, Tata Ruang dan Pertanahan Kecamatan Cakung';
  const splitJabatan = doc.splitTextToSize(jabatan, 75);
  splitJabatan.forEach((line: string, idx: number) => {
    doc.text(line, signX, signStartY + (idx * 4.5), { align: 'center' });
  });

  // Signature line and info
  const nameY = signStartY + (splitJabatan.length * 4.5) + 18;
  doc.setFont('helvetica', 'bold');
  doc.text(config.pejabatNama || 'Riviansyah', signX, nameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${config.pejabatNip || '198402232007011008'}`, signX, nameY + 4.5, { align: 'center' });

  const fileName = `Laporan_Patroli_DCKTRP_Cakung_${config.periode.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}
