import React, { useState, useEffect } from 'react';
import { 
  KeyRound, CheckCircle2, Lock, Unlock, AlertTriangle, 
  RotateCcw, Search, UserCheck, X
} from 'lucide-react';
import { getLockers, borrowLocker, returnLocker, maintenanceLocker } from '../utils/api';

export default function LokerView() {
  const [lockers, setLockers] = useState([]);
  const [selectedArea, setSelectedArea] = useState('Semua');
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [borrowForm, setBorrowForm] = useState({
    member_id: '',
    nama_peminjam: '',
    keterangan: ''
  });

  useEffect(() => {
    loadLockers();
  }, []);

  const loadLockers = async () => {
    try {
      const res = await getLockers();
      if (res.success) setLockers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!selectedLocker) return;
    try {
      const res = await borrowLocker({
        id_loker: selectedLocker.id_loker,
        member_id: borrowForm.member_id.trim() || null,
        nama_peminjam: borrowForm.nama_peminjam.trim() || 'Member',
        keterangan: borrowForm.keterangan
      });
      if (res.success) {
        setShowBorrowModal(false);
        setSelectedLocker(null);
        setBorrowForm({ member_id: '', nama_peminjam: '', keterangan: '' });
        loadLockers();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('Gagal memproses peminjaman loker');
    }
  };

  const handleReturn = async (id_loker, nomor) => {
    if (!window.confirm(`Konfirmasi pengembalian kunci Loker ${nomor}?`)) return;
    try {
      const res = await returnLocker(id_loker);
      if (res.success) loadLockers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMaintenance = async (locker) => {
    const newStatus = locker.status === 'Rusak' ? 'Tersedia' : 'Rusak';
    try {
      const res = await maintenanceLocker({
        id_loker: locker.id_loker,
        status: newStatus,
        keterangan: newStatus === 'Rusak' ? 'Perbaikan kunci' : ''
      });
      if (res.success) loadLockers();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLockers = lockers.filter(l => 
    selectedArea === 'Semua' || l.area === selectedArea
  );

  const availableCount = lockers.filter(l => l.status === 'Tersedia').length;
  const usedCount = lockers.filter(l => l.status === 'Digunakan').length;
  const maintenanceCount = lockers.filter(l => l.status === 'Rusak').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2">
            <KeyRound className="w-6 h-6 text-[#c5a059]" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">Fasilitas Loker Gym & Pool</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring ketersediaan kunci loker, peminjaman saat check-in, dan pengembalian kunci
          </p>
        </div>

        {/* Quick Status Badges */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
            Tersedia: {availableCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
            Digunakan: {usedCount}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
            Rusak: {maintenanceCount}
          </div>
        </div>
      </div>

      {/* Area Selector Filter */}
      <div className="flex items-center space-x-2">
        {['Semua', 'Loker Pria', 'Loker Wanita'].map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              selectedArea === area
                ? 'bg-slate-900 text-[#dfc185] shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Lockers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredLockers.map((locker) => {
          const isAvailable = locker.status === 'Tersedia';
          const isUsed = locker.status === 'Digunakan';
          const isBroken = locker.status === 'Rusak';

          return (
            <div
              key={locker.id_loker}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                isAvailable
                  ? 'bg-white border-slate-200 hover:border-[#c5a059] shadow-sm'
                  : isUsed
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-rose-50/70 border-rose-200 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-base text-slate-900">
                    {locker.nomor_loker}
                  </span>
                  <span className={`p-1.5 rounded-lg ${
                    isAvailable ? 'bg-emerald-100 text-emerald-700' : isUsed ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isAvailable ? <Unlock className="w-4 h-4" /> : isUsed ? <Lock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5">{locker.area}</div>

                {isUsed && (
                  <div className="mt-3 pt-2 border-t border-amber-200/60 text-xs">
                    <div className="font-bold text-slate-900 truncate">{locker.nama_peminjam}</div>
                    {locker.member_id && (
                      <div className="font-mono text-[10px] text-slate-500">{locker.member_id}</div>
                    )}
                    <div className="text-[10px] text-amber-800 font-mono mt-0.5">
                      Jam: {locker.jam_pinjam} WIB
                    </div>
                  </div>
                )}

                {isBroken && (
                  <div className="mt-3 pt-2 border-t border-rose-200/60 text-[11px] text-rose-700 font-medium">
                    {locker.keterangan || 'Sedang Rusak'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                {isAvailable && (
                  <button
                    onClick={() => {
                      setSelectedLocker(locker);
                      setShowBorrowModal(true);
                    }}
                    className="w-full py-1.5 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black text-xs rounded-xl shadow transition"
                  >
                    Pinjamkan
                  </button>
                )}

                {isUsed && (
                  <button
                    onClick={() => handleReturn(locker.id_loker, locker.nomor_loker)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Kembalikan</span>
                  </button>
                )}

                <button
                  onClick={() => handleToggleMaintenance(locker)}
                  title={isBroken ? 'Set Tersedia' : 'Set Rusak'}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PINJAM LOKER */}
      {showBorrowModal && selectedLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">
                Pinjam Kunci Loker {selectedLocker.nomor_loker}
              </h3>
              <button onClick={() => setShowBorrowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBorrow} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Peminjam / Member</label>
                <input
                  type="text"
                  required
                  placeholder="Nama member atau tamu"
                  value={borrowForm.nama_peminjam}
                  onChange={(e) => setBorrowForm({ ...borrowForm, nama_peminjam: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ID Member (Opsional)</label>
                <input
                  type="text"
                  placeholder="FM-2026-00112 / MEM-..."
                  value={borrowForm.member_id}
                  onChange={(e) => setBorrowForm({ ...borrowForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Titip KTP / Jaminan"
                  value={borrowForm.keterangan}
                  onChange={(e) => setBorrowForm({ ...borrowForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBorrowModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] text-slate-950 font-black shadow"
                >
                  Konfirmasi Pinjam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
