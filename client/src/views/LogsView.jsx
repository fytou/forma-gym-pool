import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, Calendar, Dumbbell, Waves, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Clock, ChevronLeft, ChevronRight,
  User, ArrowRight, RotateCcw, Activity
} from 'lucide-react';
import { getCheckinLogs, formatDateIndo } from '../utils/api';

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Date Filter: 'hari_ini', 'kemarin', '7_hari', 'bulan_ini', 'semua', 'custom'
  const [dateFilterType, setDateFilterType] = useState('hari_ini');
  const [tanggal, setTanggal] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');

  const [fasilitas, setFasilitas] = useState('Semua');
  const [status, setStatus] = useState('Semua');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    gym: 0,
    pool: 0,
    active_inside: 0,
    denied: 0
  });

  const getJakartaDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  };

  const handleSelectDateType = (type) => {
    setDateFilterType(type);
    setPage(1);

    const today = getJakartaDate(0);

    if (type === 'hari_ini') {
      setTanggal(today);
      setTanggalMulai('');
      setTanggalAkhir('');
    } else if (type === 'kemarin') {
      const yesterday = getJakartaDate(-1);
      setTanggal(yesterday);
      setTanggalMulai('');
      setTanggalAkhir('');
    } else if (type === '7_hari') {
      const sevenDaysAgo = getJakartaDate(-6);
      setTanggal('');
      setTanggalMulai(sevenDaysAgo);
      setTanggalAkhir(today);
    } else if (type === 'bulan_ini') {
      const yearMonth = today.slice(0, 7);
      setTanggal('');
      setTanggalMulai(`${yearMonth}-01`);
      setTanggalAkhir(today);
    } else if (type === 'semua') {
      setTanggal('');
      setTanggalMulai('');
      setTanggalAkhir('');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        fasilitas,
        status,
        search: search.trim()
      };

      if (dateFilterType === 'hari_ini' || dateFilterType === 'kemarin' || (dateFilterType === 'custom' && tanggal)) {
        params.tanggal = tanggal;
      } else if (tanggalMulai && tanggalAkhir) {
        params.tanggal_mulai = tanggalMulai;
        params.tanggal_akhir = tanggalAkhir;
      } else if (tanggalMulai) {
        params.tanggal_mulai = tanggalMulai;
      }

      const res = await getCheckinLogs(params);
      if (res.success) {
        setLogs(res.data || []);
        setTotalCount(res.total_count || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tanggal, tanggalMulai, tanggalAkhir, fasilitas, status, page, limit, dateFilterType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilter = () => {
    setDateFilterType('hari_ini');
    setTanggal(getJakartaDate(0));
    setTanggalMulai('');
    setTanggalAkhir('');
    setFasilitas('Semua');
    setStatus('Semua');
    setSearch('');
    setPage(1);
  };

  const calculateDuration = (inTime, outTime) => {
    if (!outTime) return 'Masih di dalam';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff = 0;
    return diff >= 60 ? `${Math.floor(diff / 60)}j ${diff % 60}m` : `${diff} mnt`;
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2 text-[#c5a059] mb-0.5">
            <History className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-widest uppercase">Pencatatan Masuk & Keluar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Riwayat Check-in & Akses Fasilitas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Log seluruh aktivitas scan kartu/QR member di gerbang Gym & Kolam Renang
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetFilter}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
            title="Kembalikan filter ke hari ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 rounded-xl text-xs font-black shadow-md shadow-[#c5a059]/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Quick Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Aktivitas</span>
            <span className="text-xl font-black font-mono text-slate-900">{stats.total || totalCount}</span>
            <span className="text-[10px] text-slate-400 block">Sesuai filter aktif</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Masuk Gym</span>
            <span className="text-xl font-black font-mono text-emerald-700">{stats.gym}</span>
            <span className="text-[10px] text-slate-400 block">Akses berhasil</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Masuk Pool</span>
            <span className="text-xl font-black font-mono text-sky-700">{stats.pool}</span>
            <span className="text-[10px] text-slate-400 block">Akses berhasil</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sedang di Dalam</span>
            <span className="text-xl font-black font-mono text-amber-600">{stats.active_inside}</span>
            <span className="text-[10px] text-slate-400 block">Belum check-out</span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-[#c5a059]" />
            Periode:
          </span>
          {[
            { id: 'hari_ini', label: 'Hari Ini' },
            { id: 'kemarin', label: 'Kemarin' },
            { id: '7_hari', label: '7 Hari Terakhir' },
            { id: 'bulan_ini', label: 'Bulan Ini' },
            { id: 'semua', label: 'Semua Riwayat' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => handleSelectDateType(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateFilterType === pill.id
                  ? 'bg-slate-900 text-[#dfc185] shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* Custom Date Input Trigger */}
          <div className="flex items-center space-x-1.5 ml-auto">
            <span className="text-[11px] text-slate-400 font-medium">Pilih Tanggal:</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                setDateFilterType('custom');
                setTanggalMulai('');
                setTanggalAkhir('');
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
        </div>

        {/* Detailed Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-0.5">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama / ID Member / No. HP..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#c5a059]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          {/* Fasilitas */}
          <div>
            <select
              value={fasilitas}
              onChange={(e) => {
                setFasilitas(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-[#c5a059]"
            >
              <option value="Semua">Semua Fasilitas (Gym & Pool)</option>
              <option value="Gym">Hanya Pintu Gym</option>
              <option value="Pool">Hanya Pintu Pool</option>
            </select>
          </div>

          {/* Hasil Validasi */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-[#c5a059]"
            >
              <option value="Semua">Semua Status Validasi</option>
              <option value="ACCESS GRANTED">ACCESS GRANTED (Berhasil)</option>
              <option value="MEMBERSHIP EXPIRED">MEMBERSHIP EXPIRED (Habis)</option>
              <option value="AKSES DITOLAK: FASILITAS TIDAK SESUAI">AKSES DITOLAK (Fasilitas)</option>
            </select>
          </div>

          {/* Per Page Limit */}
          <div className="flex items-center justify-end space-x-2 text-xs text-slate-500">
            <span>Baris per halaman:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-14 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#c5a059] mb-2" />
            <span className="text-xs font-medium">Memuat data log check-in...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-14 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Tidak ada log check-in ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada aktivitas scan kartu/QR pada tanggal atau kriteria filter yang dipilih. Coba pilih "Semua Riwayat" atau ubah tanggal.
            </p>
            <button
              onClick={handleResetFilter}
              className="mt-4 px-4 py-2 bg-slate-900 text-[#dfc185] rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Tampilkan Semua Riwayat
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">No</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-3 text-center">Fasilitas</th>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">Jam Masuk</th>
                  <th className="py-3 px-3.5">Jam Keluar</th>
                  <th className="py-3 px-3 text-center">Durasi</th>
                  <th className="py-3 px-4">Hasil Validasi</th>
                  <th className="py-3 px-4">Catatan / Paket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, index) => {
                  const isGranted = log.hasil_validasi === 'ACCESS GRANTED';
                  const isExpired = log.hasil_validasi === 'MEMBERSHIP EXPIRED';
                  const durationStr = calculateDuration(log.jam_masuk, log.jam_keluar);
                  const rowNumber = startIndex + index + 1;

                  return (
                    <tr key={log.id_log} className="hover:bg-slate-50/80 transition">
                      {/* No */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px] text-slate-400">
                        {rowNumber}
                      </td>

                      {/* Member */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={log.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                            alt={log.nama}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{log.nama}</span>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-[#b89047]">{log.member_id}</span>
                              {log.no_hp && (
                                <span className="text-[10px] text-slate-400 font-mono">• {log.no_hp}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fasilitas */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          log.fasilitas === 'Gym' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {log.fasilitas === 'Gym' ? <Dumbbell className="w-3 h-3" /> : <Waves className="w-3 h-3" />}
                          <span>{log.fasilitas}</span>
                        </span>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">
                        {log.tanggal}
                      </td>

                      {/* Jam Masuk */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {log.jam_masuk} <span className="text-[10px] text-slate-400 font-normal">WIB</span>
                      </td>

                      {/* Jam Keluar */}
                      <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                        {log.jam_keluar ? (
                          <span className="font-bold text-slate-700">
                            {log.jam_keluar} <span className="text-[10px] text-slate-400 font-normal">WIB</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1"></span>
                            Di dalam
                          </span>
                        )}
                      </td>

                      {/* Durasi */}
                      <td className="py-3 px-3 text-center font-mono text-slate-600 font-medium whitespace-nowrap">
                        {durationStr}
                      </td>

                      {/* Hasil Validasi */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isGranted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isExpired 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isGranted ? <CheckCircle className="w-3 h-3 text-emerald-600" /> :
                           isExpired ? <XCircle className="w-3 h-3 text-rose-600" /> :
                           <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.hasil_validasi}</span>
                        </span>
                      </td>

                      {/* Catatan / Paket */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                        {log.catatan || (log.nama_paket ? `Paket: ${log.nama_paket}` : '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <strong className="text-slate-900">{startIndex + 1}</strong> - <strong className="text-slate-900">{Math.min(startIndex + limit, totalCount)}</strong> dari <strong className="text-slate-900">{totalCount}</strong> aktivitas check-in
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs">
                Halaman {page} dari {totalPages}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
