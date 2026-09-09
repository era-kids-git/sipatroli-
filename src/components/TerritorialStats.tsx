import React from 'react';
import { 
  BarChart3, 
  MapPin, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  FileText,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { PatrolRecord, KelurahanCakung } from '../types';
import { KELURAHAN_LIST } from '../data/initialData';

interface TerritorialStatsProps {
  records: PatrolRecord[];
  onSelectKelurahanFilter: (kelurahan: string) => void;
}

export const TerritorialStats: React.FC<TerritorialStatsProps> = ({
  records,
  onSelectKelurahanFilter,
}) => {
  // Compute counts per kelurahan
  const kelurahanCounts = KELURAHAN_LIST.map((kel) => {
    const count = records.filter((r) => r.kelurahan === kel).length;
    const percentage = records.length > 0 ? Math.round((count / records.length) * 100) : 0;
    return { kelurahan: kel, count, percentage };
  }).sort((a, b) => b.count - a.count);

  // Compute counts per date
  const dateCountsMap = records.reduce((acc, r) => {
    acc[r.tanggal] = (acc[r.tanggal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dateCounts = Object.entries(dateCountsMap);

  // Top Kelurahan
  const topKelurahan: { kelurahan: string; count: number; percentage: number } =
    kelurahanCounts[0] || { kelurahan: '-', count: 0, percentage: 0 };

  // Total with GPS & with Photo
  const withGpsCount = records.filter((r) => r.latitude && r.longitude).length;
  const withPhotoCount = records.filter((r) => Array.isArray(r.foto) ? r.foto.length > 0 : !!r.foto).length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Titik Dipatroli</p>
            <h4 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{records.length}</h4>
            <p className="text-[11px] text-slate-400 font-medium">Sektor Cakung</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Kelurahan Teraktif</p>
            <h4 className="text-base font-bold text-slate-900 truncate max-w-[150px]">
              {topKelurahan.kelurahan}
            </h4>
            <p className="text-[11px] text-indigo-600 font-mono font-semibold">
              {topKelurahan.count} titik ({topKelurahan.percentage}%)
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Hari Aktif Pengawasan</p>
            <h4 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{dateCounts.length}</h4>
            <p className="text-[11px] text-slate-400 font-medium">Hari Patroli Terdata</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Kelengkapan Data</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-emerald-700 font-mono font-bold">
                GPS: {withGpsCount}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-indigo-700 font-mono font-bold">
                Foto: {withPhotoCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">100% Tercatat Resmi</p>
          </div>
        </div>
      </div>

      {/* Main Breakdown: Per Kelurahan & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kelurahan Distribution Bar breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Persebaran Patroli per Kelurahan
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Klik filter</span>
          </div>

          <div className="space-y-3">
            {kelurahanCounts.map((item) => (
              <div
                key={item.kelurahan}
                onClick={() => onSelectKelurahanFilter(item.kelurahan)}
                className="group p-3 rounded bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-700 transition">
                    {item.kelurahan}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-700">
                      {item.count} titik
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded transition-all duration-500"
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patrol Activity per Date */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Aktivitas Patroli Berdasarkan Tanggal
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">{dateCounts.length} TANGGAL</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2.5 pr-1">
            {dateCounts.map(([tanggal, count]) => {
              const recordsOnDate = records.filter((r) => r.tanggal === tanggal);
              const kelurahans = Array.from(new Set(recordsOnDate.map((r) => r.kelurahan)));
              return (
                <div
                  key={tanggal}
                  className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-900">{tanggal}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mencakup: {kelurahans.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold">
                      {count} Lokasi
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
