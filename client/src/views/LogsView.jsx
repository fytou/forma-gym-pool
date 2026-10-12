import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar, Dumbbell, Waves, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getCheckinLogs, formatDateIndo } from '../utils/api';

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState('');
  const [fasilitas, setFasilitas] = useState('Semua');
  const [status, setStatus] = useState('Semua');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getCheckinLogs({
        tanggal,
        fasilitas,
        status,
        search
      });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tanggal, fasilitas, status, search]);

  const calculateDuration = (inTime, outTime) => {
    if (!outTime) return 'Masih di dalam';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff = 0;
    return diff >= 60 ? `${Math.floor(diff / 60)}j ${diff % 60}m` : `${diff} mnt`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Riwayat Check-in & Akses Fasilitas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log seluruh aktivitas masuk dan keluar member di pintu gym & pool
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari member..."
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#c5a059] focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Tanggal */}
        <div>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#c5a059] focus:outline-none bg-white"
          />
        </div>

        {/* Fasilitas */}
        <div>
          <select
            value={fasilitas}
            onChange={(e) => setFasilitas(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#c5a059] focus:outline-none bg-white"
          >
            <option value="Semua">Semua Fasilitas</option>
            <option value="Gym">Hanya Gym</option>
            <option value="Pool">Hanya Pool</option>
          </select>
        </div>

        {/* Hasil Validasi */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#c5a059] focus:outline-none bg-white"
          >
            <option value="Semua">Semua Status Validasi</option>
            <option value="ACCESS GRANTED">ACCESS GRANTED (Berhasil)</option>
            <option value="MEMBERSHIP EXPIRED">MEMBERSHIP EXPIRED (Habis)</option>
            <option value="AKSES DITOLAK: FASILITAS TIDAK SESUAI">AKSES DITOLAK (Fasilitas)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
            <span className="text-xs">Memuat log check-in...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada log check-in ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">Sesuaikan filter atau tanggal pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Fasilitas</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Keluar</th>
                  <th className="py-3 px-4">Durasi</th>
                  <th className="py-3 px-4">Hasil Validasi</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isGranted = log.hasil_validasi === 'ACCESS GRANTED';
                  const isExpired = log.hasil_validasi === 'MEMBERSHIP EXPIRED';
                  const durationStr = calculateDuration(log.jam_masuk, log.jam_keluar);

                  return (
                    <tr key={log.id_log} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <img
                          src={log.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={log.nama}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{log.nama}</span>
                          <span className="text-[10px] font-mono text-slate-400">{log.member_id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.fasilitas === 'Gym' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.fasilitas}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {log.tanggal}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {log.jam_masuk} WIB
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {log.jam_keluar ? `${log.jam_keluar} WIB` : (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                            Di dalam
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {durationStr}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isGranted ? 'bg-emerald-100 text-emerald-800' :
                          isExpired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isGranted ? <CheckCircle className="w-3 h-3 text-emerald-600" /> :
                           isExpired ? <XCircle className="w-3 h-3 text-rose-600" /> :
                           <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.hasil_validasi}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                        {log.catatan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
