import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle,
  LogOut,
  User as UserIcon,
  Cloud
} from 'lucide-react';
import { PatrolRecord, ReportConfig, ViewMode } from './types';
import { DEFAULT_REPORT_CONFIG, INITIAL_PATROL_RECORDS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { PatrolTable } from './components/PatrolTable';
import { TerritorialStats } from './components/TerritorialStats';
import { FastEntryModal } from './components/FastEntryModal';
import { PatrolDetailModal } from './components/PatrolDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { BatchImportModal } from './components/BatchImportModal';
import { exportPatrolPDF } from './utils/pdfExport';
import { exportPatrolExcel } from './utils/excelExport';

// Firebase imports
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // States
  const [records, setRecords] = useState<PatrolRecord[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isFastEntryOpen, setIsFastEntryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<PatrolRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<PatrolRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Realtime Listener for Patrol Records
  useEffect(() => {
    if (!user) {
      setRecords([]); // clear records if logged out
      return;
    }

    setSyncStatus('syncing');
    const recordsCol = collection(db, 'patrolRecords');
    const unsubscribe = onSnapshot(recordsCol, (snapshot) => {
      const fetchedRecords: PatrolRecord[] = [];
      snapshot.forEach((doc) => {
        fetchedRecords.push({ id: doc.id, ...doc.data() } as PatrolRecord);
      });
      // Sort by No (ascending)
      fetchedRecords.sort((a, b) => (a.no || 0) - (b.no || 0));
      setRecords(fetchedRecords);
      setSyncStatus('synced');
    }, (error) => {
      console.error("Error syncing records:", error);
      setSyncStatus('error');
    });

    return () => unsubscribe();
  }, [user]);

  // Firebase Listener for Settings Config
  useEffect(() => {
    if (!user) return;
    const settingsDoc = doc(db, 'settings', 'reportConfig');
    const unsubscribe = onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) {
        setReportConfig(docSnap.data() as ReportConfig);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Keyboard shortcut listener (F2 to open Fast Entry)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setEditingRecord(null);
        setIsFastEntryOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save new or updated record (To Firestore)
  const handleSaveRecord = async (recordData: Omit<PatrolRecord, 'id' | 'no' | 'createdAt'>) => {
    try {
      if (editingRecord) {
        // Update existing
        const updatedRecord: PatrolRecord = { ...editingRecord, ...recordData };
        await setDoc(doc(db, 'patrolRecords', editingRecord.id), updatedRecord);
        showToast(`Data "${recordData.lokasi}" berhasil diperbarui!`);
        setEditingRecord(null);
        setViewingRecord(updatedRecord);
      } else {
        // Add new
        const nextNo = records.length > 0 ? Math.max(...records.map((r) => r.no)) + 1 : 1;
        const newId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newRecord: PatrolRecord = {
          id: newId,
          no: nextNo,
          createdAt: Date.now(),
          ...recordData,
        };
        await setDoc(doc(db, 'patrolRecords', newId), newRecord);
        showToast(`Data patroli No. ${nextNo} (${recordData.lokasi}) berhasil disimpan!`);
        setViewingRecord(newRecord);
      }
    } catch (e) {
      console.error("Gagal menyimpan ke Firebase:", e);
      showToast("Gagal menyimpan data ke Cloud", "info");
    }
  };

  // Delete single record
  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patrolRecords', id));
      showToast('Data patroli telah dihapus.');
    } catch(e) {
      console.error("Gagal menghapus:", e);
      showToast("Gagal menghapus data dari Cloud", "info");
    }
  };

  // Bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'patrolRecords', id));
      });
      await batch.commit();
      showToast(`${ids.length} data patroli telah dihapus.`);
    } catch(e) {
      console.error("Gagal menghapus massal:", e);
    }
  };

  // Duplicate record
  const handleDuplicateRecord = async (record: PatrolRecord) => {
    const nextNo = records.length > 0 ? Math.max(...records.map((r) => r.no)) + 1 : 1;
    const newId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const duplicated: PatrolRecord = {
      ...record,
      id: newId,
      no: nextNo,
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'patrolRecords', newId), duplicated);
      showToast(`Data No. ${record.no} berhasil diduplikasi ke No. ${nextNo}`);
    } catch(e) {
      console.error("Gagal menduplikasi:", e);
    }
  };

  // Import success
  const handleImportSuccess = async (imported: Partial<PatrolRecord>[]) => {
    const currentMax = records.length > 0 ? Math.max(...records.map((r) => r.no)) : 0;
    try {
      const batch = writeBatch(db);
      const newItems: PatrolRecord[] = imported.map((item, idx) => ({
        id: `rec-imp-${Date.now()}-${idx}`,
        no: currentMax + idx + 1,
        tanggal: item.tanggal || '18 Agustus 2026',
        tanggalRaw: item.tanggalRaw,
        waktu: item.waktu || '09:00 WIB',
        nomorInput: item.nomorInput || `${7135 + idx}.75.2026/PATROLI/-082.74`,
        lokasi: item.lokasi || 'JL. PATROLI CAKUNG',
        kecamatan: item.kecamatan || 'Cakung',
        kelurahan: item.kelurahan || 'Cakung Timur',
        status: item.status || 'Ada IMB/PBG',
        catatan: item.catatan,
        petugas: item.petugas,
        createdAt: Date.now() + idx,
      }));

      newItems.forEach(item => {
        batch.set(doc(db, 'patrolRecords', item.id), item);
      });
      await batch.commit();
      showToast(`${newItems.length} data patroli berhasil diimpor!`);
    } catch(e) {
      console.error("Gagal import:", e);
    }
  };

  // Settings Save (To Firestore)
  const handleSaveConfig = async (newConfig: ReportConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'reportConfig'), newConfig);
      setReportConfig(newConfig);
      showToast('Pengaturan laporan diperbarui!');
    } catch(e) {
      console.error("Gagal update config:", e);
    }
  };

  // Restore Default Data (For Testing/Reset)
  const handleRestoreRecords = async (newRecords: PatrolRecord[]) => {
    try {
      // Clear existing records first
      const batchDelete = writeBatch(db);
      records.forEach(r => batchDelete.delete(doc(db, 'patrolRecords', r.id)));
      await batchDelete.commit();

      // Add new records
      const batchAdd = writeBatch(db);
      newRecords.forEach(r => batchAdd.set(doc(db, 'patrolRecords', r.id), r));
      await batchAdd.commit();

      if (newRecords.length === 0) {
        showToast('Semua data patroli telah di-reset menjadi 0 (nol) data');
      } else {
        showToast(`Data patroli berhasil dipulihkan (${newRecords.length} data)!`);
      }
    } catch(e) {
      console.error("Gagal restore:", e);
    }
  };

  // Export handlers
  const handleExportPDF = () => {
    exportPatrolPDF(records, reportConfig);
    showToast('Laporan PDF resmi berhasil diunduh!');
  };

  const handleExportExcel = () => {
    exportPatrolExcel(records, reportConfig);
    showToast('Berkas Excel (.xlsx) berhasil diunduh!');
  };

  // Loading View
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Login View
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Details */}
        <div className="absolute top-0 right-0 p-8 text-indigo-100 opacity-20 pointer-events-none">
           <svg width="400" height="400" viewBox="0 0 200 200" fill="currentColor"><path d="M100 0L200 100L100 200L0 100Z"/></svg>
        </div>
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 rotate-3">
             <Cloud className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">SiPatroli Cloud</h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            Sistem pengawasan patroli kini terhubung dengan Firebase. Data Anda aman dan tersinkronisasi antar perangkat.
          </p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-slate-900 text-white rounded-xl py-3.5 px-4 font-bold tracking-wide hover:bg-slate-800 transition active:scale-95 flex items-center justify-center space-x-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Masuk dengan Google</span>
          </button>
        </div>
      </div>
    );
  }

  // App View
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-24 sm:pb-0">
      {/* Top Navbar */}
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenFastEntry={() => {
          setEditingRecord(null);
          setIsFastEntryOpen(true);
        }}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        reportConfig={reportConfig}
        totalRecords={records.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-3 sm:space-y-5">
        
        {/* Sync Status Banner & User Profile */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <UserIcon className="w-4 h-4 text-indigo-500" />
            <span>Hai, {user.displayName || user.email}</span>
            <button onClick={logout} className="ml-2 text-red-500 hover:text-red-700 underline font-semibold">Keluar</button>
          </div>
          <div className="flex items-center gap-2 font-mono uppercase tracking-wider">
            {syncStatus === 'syncing' && <span className="text-amber-500 flex items-center gap-1"><Cloud className="w-3.5 h-3.5 animate-pulse" /> Menyinkronkan...</span>}
            {syncStatus === 'synced' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Tersinkronisasi ke Cloud</span>}
            {syncStatus === 'error' && <span className="text-red-500 flex items-center gap-1"><Cloud className="w-3.5 h-3.5" /> Gagal Sinkronisasi</span>}
          </div>
        </div>

        {/* Header Session Section */}
        <div className="hidden sm:flex bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                Periode: {reportConfig.periode}
              </span>
              <div className="h-3 w-[1px] bg-slate-300"></div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Pengawasan Teritorial Sektor Cakung
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Sistem Input & Pengawasan Patroli Teritorial
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Platform realtime pengawasan lapangan DCKTRP dengan modul GPS geotagging presisi (radius 150m & input manual online/offline), kompresi kamera otomatis, penomoran terstandar, dan ekspor instan PDF/Excel resmi.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsFastEntryOpen(true);
              }}
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Realtime (F2)</span>
            </button>
          </div>
        </div>

        {/* View Switcher Content */}
        {viewMode === 'table' && (
          <PatrolTable
            records={records}
            onEdit={(rec) => {
              setEditingRecord(rec);
              setIsFastEntryOpen(true);
            }}
            onDelete={handleDeleteRecord}
            onBulkDelete={handleBulkDelete}
            onViewDetail={(rec) => setViewingRecord(rec)}
            onDuplicate={handleDuplicateRecord}
          />
        )}

        {viewMode === 'analytics' && (
          <TerritorialStats
            records={records}
            onSelectKelurahanFilter={(kel) => {
              setViewMode('table');
            }}
          />
        )}
      </main>

      {/* Floating Bottom Quick Action Bar for Field Mobile Users */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-2 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => {
            setEditingRecord(null);
            setIsFastEntryOpen(true);
          }}
          className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider shadow-md active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Input Lapangan</span>
        </button>
        <button
          onClick={handleExportPDF}
          className="ml-2 p-2.5 bg-slate-900 text-white rounded border border-slate-800 active:scale-95"
          title="Cetak PDF"
        >
          <FileText className="w-4 h-4 text-red-400" />
        </button>
        <button
          onClick={handleExportExcel}
          className="ml-2 p-2.5 bg-white text-slate-700 rounded border border-slate-300 active:scale-95"
          title="Ekspor Excel"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Geometric Balance Telemetry Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 hidden sm:flex items-center px-6 lg:px-8 justify-between text-[10px] text-slate-400 font-mono tracking-wider mt-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>GEO-TAG: -6.2088, 106.8456 (SEKTOR DCKTRP CAKUNG)</span>
        </div>
        <div className="flex items-center gap-6">
          <span>SIPATROLI CLOUD v3.0.0</span>
          <span className="text-emerald-400 font-semibold">ENCRYPTED CHANNEL 12</span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-lg px-4 py-3 text-xs flex items-center space-x-2 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Modals */}
      <FastEntryModal
        isOpen={isFastEntryOpen}
        onClose={() => {
          setIsFastEntryOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        records={records}
        reportConfig={reportConfig}
        initialEditRecord={editingRecord}
      />

      <PatrolDetailModal
        record={viewingRecord}
        onClose={() => setViewingRecord(null)}
        onEdit={(rec) => {
          setViewingRecord(null);
          setEditingRecord(rec);
          setIsFastEntryOpen(true);
        }}
        reportConfig={reportConfig}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={reportConfig}
        onSaveConfig={handleSaveConfig}
        records={records}
        onRestoreRecords={handleRestoreRecords}
      />

      <BatchImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
