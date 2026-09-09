import { PatrolRecord, ReportConfig } from '../types';

/**
 * Calculates tile and pixel coordinates from latitude/longitude (Web Mercator)
 */
function getMercatorPixel(lat: number, lng: number, zoom: number) {
  const xTileExact = ((lng + 180) / 360) * Math.pow(2, zoom);
  const sin = Math.sin((lat * Math.PI) / 180);
  const yTileExact =
    ((1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2) * Math.pow(2, zoom);
  return {
    worldX: xTileExact * 256,
    worldY: yTileExact * 256,
  };
}

/**
 * Loads a single map tile image with crossOrigin = 'anonymous'
 */
function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile: ${url}`));
    setTimeout(() => reject(new Error('Tile load timeout')), 4000);
    img.src = url;
  });
}

/**
 * Loads a base64 image or URL as HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Renders the genuine Google Maps section onto the canvas
 */
async function drawMapSection(
  ctx: CanvasRenderingContext2D,
  record: PatrolRecord,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const lat = record.latitude ?? -6.2087;
  const lng = record.longitude ?? 106.9536;
  const radiusMeters = record.gpsRadius || 150;
  const zoom = 16;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.clip();

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x, y, width, height);

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const { worldX, worldY } = getMercatorPixel(lat, lng, zoom);

  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const radiusPixels = Math.round(radiusMeters / metersPerPixel);

  const minWorldX = worldX - width / 2;
  const maxWorldX = worldX + width / 2;
  const minWorldY = worldY - height / 2;
  const maxWorldY = worldY + height / 2;

  const minTileX = Math.floor(minWorldX / 256);
  const maxTileX = Math.floor(maxWorldX / 256);
  const minTileY = Math.floor(minWorldY / 256);
  const maxTileY = Math.floor(maxWorldY / 256);

  const tilePromises: Promise<void>[] = [];
  let tilesLoaded = 0;

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      const subdomain = Math.abs(tx + ty) % 4;
      const tileUrl = `https://mt${subdomain}.google.com/vt/lyrs=m&hl=id&x=${tx}&y=${ty}&z=${zoom}`;
      const drawX = centerX + (tx * 256 - worldX);
      const drawY = centerY + (ty * 256 - worldY);

      tilePromises.push(
        loadTileImage(tileUrl)
          .then((img) => {
            ctx.drawImage(img, drawX, drawY, 256, 256);
            tilesLoaded++;
          })
          .catch(() => {})
      );
    }
  }

  try {
    await Promise.allSettled(tilePromises);
  } catch {}

  // 1. Draw Radius Zone Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radiusPixels, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14, 165, 233, 0.2)'; // Light blue translucent
  ctx.fill();
  ctx.strokeStyle = '#0284c7'; // Blue border
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // 2. Draw Genuine Google Maps Pin Drop Marker
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 3, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fill();

  const pinW = 34;
  const pinH = 46;
  const pinTopY = centerY - pinH;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.bezierCurveTo(
    centerX - pinW / 2,
    centerY - pinH / 3,
    centerX - pinW / 2,
    pinTopY,
    centerX,
    pinTopY
  );
  ctx.bezierCurveTo(
    centerX + pinW / 2,
    pinTopY,
    centerX + pinW / 2,
    centerY - pinH / 3,
    centerX,
    centerY
  );
  ctx.fillStyle = '#EA4335';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, pinTopY + pinW / 2 - 1, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // 3. Google Maps Official Badge (Bottom Left)
  ctx.save();
  const brandX = x + 10;
  const brandY = y + height - 30;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(brandX, brandY, 70, 22, 4);
  ctx.fill();

  ctx.fillStyle = '#4285F4';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Google', brandX + 35, brandY + 11);
  ctx.restore();

  ctx.restore(); // Restore outer clip
}

export async function generatePatrolCardJpg(
  record: PatrolRecord,
  config?: ReportConfig
): Promise<{
  blob: Blob;
  dataUrl: string;
  file: File;
  filename: string;
}> {
  const canvas = document.createElement('canvas');
  const width = 1000;
  
  const photoList = Array.isArray(record.foto) ? record.foto : record.foto ? [record.foto] : [];
  
  let height = 1100;
  let photoBoxH = 600;
  if (photoList.length > 0) {
    height += 660;
  }
  
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  let currentY = 40;
  
  // 1. Header Row 1
  const badgeText = `DOKUMENTASI PATROLI #${record.no}`;
  ctx.font = 'bold 12px sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 30;
  ctx.fillStyle = '#ede9fe'; 
  ctx.beginPath();
  ctx.roundRect(40, currentY, badgeW, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#4c1d95'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 40 + badgeW / 2, currentY + 14);
  
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`SEKTOR CAKUNG • KEL. ${record.kelurahan.toUpperCase()}`, width - 40, currentY + 14);
  
  currentY += 60;
  
  // 2. Header Row 2
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  const lokasi = (record.lokasi || '-').toUpperCase();
  ctx.fillText(lokasi, 40, currentY);
  
  currentY += 25;
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Kelurahan ${record.kelurahan}, Kec. ${record.kecamatan || 'Cakung'}`, 40, currentY);
  
  currentY += 25;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, currentY);
  ctx.lineTo(width - 40, currentY);
  ctx.stroke();
  
  currentY += 30;
  
  // 3. Photo Section
  if (photoList.length > 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FOTO DOKUMENTASI (FOTO 1)`, 40, currentY);
    
    currentY += 20;
    const photoBoxW = width - 80;
    
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(40, currentY, photoBoxW, photoBoxH, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    try {
      const photoImg = await loadImage(photoList[0]);
      const naturalW = photoImg.naturalWidth || photoImg.width || 800;
      const naturalH = photoImg.naturalHeight || photoImg.height || 600;
      const imgAspect = naturalW / naturalH;
      const boxAspect = photoBoxW / photoBoxH;

      let drawW = photoBoxW;
      let drawH = photoBoxH;
      let drawX = 40;
      let drawY = currentY;

      if (imgAspect >= boxAspect) {
        drawW = photoBoxW - 20;
        drawH = drawW / imgAspect;
        drawX = 40 + 10;
        drawY = currentY + (photoBoxH - drawH) / 2;
      } else {
        drawH = photoBoxH - 20;
        drawW = drawH * imgAspect;
        drawX = 40 + (photoBoxW - drawW) / 2;
        drawY = currentY + 10;
      }

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(40, currentY, photoBoxW, photoBoxH, 8);
      ctx.clip();
      ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
      
      // Foto 1 Badge
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(55, currentY + 15, 60, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Foto 1', 85, currentY + 27);
      
    } catch (err) {
      console.warn('Could not draw photo', err);
    }
    
    currentY += photoBoxH + 40;
  }
  
  // 4. Grid Info
  const colW = (width - 100) / 2;
  const rowH = 75;
  const startX = 40;
  
  // Box 1: TANGGAL
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(startX, currentY, colW, rowH, 6); ctx.fill();
  ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('TANGGAL', startX + 20, currentY + 28);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(record.tanggal, startX + 20, currentY + 55);
  
  // Box 2: KELURAHAN
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(startX + colW + 20, currentY, colW, rowH, 6); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('KELURAHAN', startX + colW + 40, currentY + 28);
  ctx.fillStyle = '#312e81'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(record.kelurahan, startX + colW + 40, currentY + 55);
  
  currentY += rowH + 15;
  
  // Box 3: NO INPUT
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(startX, currentY, colW, rowH, 6); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('NO. INPUT PATROLI', startX + 20, currentY + 28);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 14px monospace';
  ctx.fillText(record.nomorInput, startX + 20, currentY + 55);
  
  // Box 4: STATUS
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(startX + colW + 20, currentY, colW, rowH, 6); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('STATUS PENGAWASAN', startX + colW + 40, currentY + 28);
  ctx.fillStyle = '#4f46e5'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(record.status || 'Patroli Jalan', startX + colW + 40, currentY + 55);
  
  currentY += rowH + 40;
  
  // 5. Map Section
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`POTONGAN PETA GOOGLE MAPS (RADIUS ±${record.gpsRadius || 150} M)`, 40, currentY);
  
  currentY += 20;
  const mapH = 320;
  await drawMapSection(ctx, record, 40, currentY, width - 80, mapH);
  
  const mbW = 220;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(width - 40 - mbW - 15, currentY + mapH - 40, mbW, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`📍 Peta Google (Radius ±${record.gpsRadius || 150} m)`, width - 40 - mbW / 2 - 15, currentY + mapH - 27);
  
  currentY += mapH + 30;
  
  // 6. Coordinates
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(40, currentY, width - 80, 80, 6); ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('KOORDINAT GEOTAG GPS', 60, currentY + 30);
  ctx.fillStyle = '#059669'; ctx.font = 'bold 18px monospace';
  ctx.fillText(`${(record.latitude || -6.2087).toFixed(6)}, ${(record.longitude || 106.9536).toFixed(6)}`, 60, currentY + 60);
  
  currentY += 80 + 30;
  
  // 7. Footer
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, currentY);
  ctx.lineTo(width - 40, currentY);
  ctx.stroke();
  
  currentY += 25;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SIPATROLI • DCKTRP SEKTOR CAKUNG', 40, currentY);

  const safeLocation = (record.lokasi || 'Patroli')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 25);
  const filename = `Laporan_Patroli_${record.no}_${safeLocation}.jpg`;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to generate JPG blob'));
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const file = new File([blob], filename, { type: 'image/jpeg' });
        resolve({ blob, dataUrl, file, filename });
      },
      'image/jpeg',
      0.95
    );
  });
}

export function downloadJpgFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function sharePatrolCardJpg(
  record: PatrolRecord,
  config?: ReportConfig
): Promise<{
  success: boolean;
  method: 'native-share' | 'download';
  message: string;
}> {
  const { blob, file, filename } = await generatePatrolCardJpg(record, config);

  const shareTitle = `Laporan Patroli No. ${record.no} - ${record.lokasi}`;
  const shareText = `[LAPORAN PATROLI LAPANGAN]
Nomor: ${record.nomorInput}
Lokasi: ${record.lokasi}
Kelurahan: ${record.kelurahan}
Status: ${record.status || 'Patroli Jalan'}
Radius: ${record.gpsRadius || 150}m
Koordinat Google Maps: https://www.google.com/maps?q=${record.latitude || -6.2087},${record.longitude || 106.9536}`;

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        files: [file],
      });
      return {
        success: true,
        method: 'native-share',
        message: 'File JPG laporan patroli berhasil dibagikan!',
      };
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return {
          success: true,
          method: 'native-share',
          message: 'Berbagi dibatalkan.',
        };
      }
    }
  }

  downloadJpgFile(blob, filename);
  return {
    success: true,
    method: 'download',
    message: `File JPG laporan berhasil diunduh (${filename})!`,
  };
}
