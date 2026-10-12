import React, { useState, useEffect } from 'react';
import { Receipt, Wallet, RefreshCw, Calendar, Tag, CreditCard } from 'lucide-react';
import { getTransactions, formatRupiah, formatDateIndo } from '../utils/api';

export default function TransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await getTransactions();
      if (res.success) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalPendapatan = transactions.reduce((sum, t) => sum + (Number(t.jumlah_bayar) || 0), 0);
  const totalDaftar = transactions.filter(t => t.jenis === 'daftar').length;
  const totalPerpanjang = transactions.filter(t => t.jenis === 'perpanjang').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Transaksi & Pendapatan Membership
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Riwayat pembayaran pendaftaran dan perpanjangan keanggotaan
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Refresh Transaksi</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#c5a059]/40 shadow-sm bg-gradient-to-br from-white to-[#c5a059]/10">
          <div className="w-9 h-9 rounded-xl bg-[#c5a059] text-slate-950 flex items-center justify-center mb-3 shadow-md shadow-[#c5a059]/20">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-[#967434] uppercase tracking-wider block">
            Total Pendapatan
          </span>
          <div className="text-2xl font-black text-[#967434] mt-1 font-mono">
            {formatRupiah(totalPendapatan)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Transaksi Pendaftaran
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {totalDaftar} <span className="text-xs font-normal text-slate-400">member baru</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
            <RefreshCw className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Transaksi Perpanjangan
          </span>
          <div className="text-2xl font-black text-indigo-900 mt-1 font-mono">
            {totalPerpanjang} <span className="text-xs font-normal text-slate-400">perpanjangan</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
            <span className="text-xs">Memuat data transaksi...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Belum ada transaksi tercatat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Tanggal Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isDaftar = t.jenis === 'daftar';
                  return (
                    <tr key={t.id_transaksi} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        TRX-{String(t.id_transaksi).padStart(5, '0')}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{t.nama}</span>
                        <span className="text-[10px] font-mono text-slate-400">{t.id_member} • {t.no_hp}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {t.nama_paket}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDaftar 
                            ? 'bg-[#c5a059]/20 text-[#967434] border border-[#c5a059]/40' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isDaftar ? 'Pendaftaran Baru' : 'Perpanjangan'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-black text-[#967434] text-sm">
                        {formatRupiah(t.jumlah_bayar)}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {t.metode_bayar}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {t.tanggal_bayar}
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
