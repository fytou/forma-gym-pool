import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Scan, 
  Wallet, 
  Dumbbell, 
  Waves, 
  RefreshCw,
  LogOut,
  Calendar
} from 'lucide-react';
import { getDashboard, formatRupiah, manualCheckout } from '../utils/api';
import { playCheckoutSound } from '../utils/audio';

export default function DashboardView({ onNavigateToCheckin, onNavigateToMembers }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckout = async (logId) => {
    try {
      const res = await manualCheckout(logId);
      if (res.success) {
        playCheckoutSound();
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const m = data?.metrics || {
    total_member: 0,
    member_aktif: 0,
    member_expired: 0,
    member_expiring_soon: 0,
    total_checkin: 0,
    pendapatan: 0,
    occupancy_gym: 0,
    occupancy_pool: 0
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard FORMA Gym & Pool
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan status keanggotaan, check-in, dan pendapatan real-time
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          <span>Perbarui Data</span>
        </button>
      </div>

      {/* 6 METRIK UTAMA PERSIS SESUAI PRD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Member */}
        <div 
          onClick={() => onNavigateToMembers('Semua')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Member
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {m.total_member}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Terdaftar di sistem</span>
        </div>

        {/* 2. Member Aktif */}
        <div 
          onClick={() => onNavigateToMembers('Active')}
          className="bg-white p-5 rounded-2xl border border-[#c5a059]/40 shadow-sm hover:border-[#c5a059] transition cursor-pointer bg-gradient-to-b from-white to-[#c5a059]/10"
        >
          <div className="w-9 h-9 rounded-xl bg-[#c5a059]/20 text-[#967434] flex items-center justify-center mb-3">
            <UserCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#967434] uppercase tracking-wider block">
            Member Aktif
          </span>
          <div className="text-2xl font-black text-[#967434] mt-1 font-mono">
            {m.member_aktif}
          </div>
          <span className="text-[10px] text-[#b89047] mt-1 block font-medium">Akses berlaku</span>
        </div>

        {/* 3. Member Akan Expired */}
        <div 
          onClick={() => onNavigateToMembers('Expiring Soon')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-300 transition cursor-pointer bg-gradient-to-b from-white to-amber-50/30"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Akan Expired
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
            {m.member_expiring_soon}
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block">≤ 7 hari lagi</span>
        </div>

        {/* 4. Member Expired */}
        <div 
          onClick={() => onNavigateToMembers('Expired')}
          className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm hover:border-rose-300 transition cursor-pointer bg-gradient-to-b from-white to-rose-50/30"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
            <UserX className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
            Member Expired
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
            {m.member_expired}
          </div>
          <span className="text-[10px] text-rose-600 mt-1 block">Perlu perpanjangan</span>
        </div>

        {/* 5. Total Check-in */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
            <Scan className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Check-in
          </span>
          <div className="text-2xl font-black text-indigo-900 mt-1 font-mono">
            {m.total_checkin}
          </div>
          <span className="text-[10px] text-indigo-600 mt-1 block">
            Hari ini: <strong>{m.today_checkin}</strong>
          </span>
        </div>

        {/* 6. Pendapatan Membership */}
        <div className="bg-white p-5 rounded-2xl border border-[#c5a059]/40 shadow-sm bg-gradient-to-b from-white to-[#c5a059]/10">
          <div className="w-9 h-9 rounded-xl bg-[#c5a059] text-slate-950 flex items-center justify-center mb-3 shadow-md shadow-[#c5a059]/20">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#967434] uppercase tracking-wider block">
            Pendapatan
          </span>
          <div className="text-lg font-black text-[#967434] mt-1 font-mono tracking-tight truncate">
            {m.pendapatan_formatted || formatRupiah(m.pendapatan)}
          </div>
          <span className="text-[10px] text-[#b89047] mt-1 block font-medium">Total membership</span>
        </div>
      </div>

      {/* Okupansi Real-time Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#c5a059] animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Okupansi Fasilitas Saat Ini
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Member yang sedang berada di dalam gym & pool (belum check-out)
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80">
              <Dumbbell className="w-5 h-5 text-[#dfc185]" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Okupansi GYM</span>
                <span className="text-xl font-black text-[#dfc185] font-mono">{m.occupancy_gym} Member</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80">
              <Waves className="w-5 h-5 text-blue-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Okupansi POOL</span>
                <span className="text-xl font-black text-blue-400 font-mono">{m.occupancy_pool} Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live inside table */}
        <div className="mt-5">
          {data?.occupancy_list?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Fasilitas saat ini kosong. Belum ada member yang melakukan check-in.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Fasilitas</th>
                    <th className="py-2.5 px-3">Jam Masuk</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data?.occupancy_list?.map((item) => (
                    <tr key={item.id_log} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 flex items-center space-x-3">
                        <img
                          src={item.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={item.nama}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <span className="font-bold text-white block">{item.nama}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.member_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.fasilitas === 'Gym' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {item.fasilitas}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {item.jam_masuk} WIB
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {item.nama_paket || 'Paket Member'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleCheckout(item.id_log)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition"
                        >
                          Check-out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Aktivitas Check-in Terbaru
        </h3>

        {data?.recent_checkins?.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Belum ada aktivitas check-in hari ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data?.recent_checkins?.map((log) => {
              const isGranted = log.hasil_validasi === 'ACCESS GRANTED';
              return (
                <div key={log.id_log} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <img
                      src={log.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                      alt={log.nama}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900">{log.nama}</h4>
                      <p className="text-[11px] text-slate-500">
                        {log.member_id} • Fasilitas: <strong className="text-slate-700">{log.fasilitas}</strong> • Masuk {log.jam_masuk} {log.jam_keluar ? `(Keluar ${log.jam_keluar})` : ''}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isGranted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.hasil_validasi}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
