import React, { useState, useEffect } from 'react';
import { 
  Receipt, Wallet, RefreshCw, Calendar, Search, Filter, 
  ChevronLeft, ChevronRight, User, ArrowDownRight, CreditCard,
  TrendingUp, Download, Eye, CheckCircle2, DollarSign, Plus, ArrowUpRight, ShoppingBag, Dumbbell, X
} from 'lucide-react';
import { getTransactions, formatRupiah, formatDateIndo, getFinanceSummary, addExpense } from '../utils/api';

export default function TransactionsView() {
  const [activeFinanceTab, setActiveFinanceTab] = useState('summary'); // 'summary' or 'memberships'
  const [financeSummary, setFinanceSummary] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    kategori: 'Operasional',
    deskripsi: '',
    nominal: '',
    metode_bayar: 'Tunai'
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Total aggregations from backend
  const [totalNominal, setTotalNominal] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [search, setSearch] = useState('');
  const [jenis, setJenis] = useState('Semua');
  
  // Current Month & Year defaults
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [filterPeriod, setFilterPeriod] = useState('bulan_ini'); // 'bulan_ini', 'semua', 'custom'

  // Pagination state (10 items per page as requested by user)
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected member detail modal for complaint / verification
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchFinanceSummary = async () => {
    try {
      const res = await getFinanceSummary();
      if (res.success) setFinanceSummary(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await addExpense(expenseForm);
      if (res.success) {
        setShowExpenseModal(false);
        setExpenseForm({ kategori: 'Operasional', deskripsi: '', nominal: '', metode_bayar: 'Tunai' });
        fetchFinanceSummary();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('Gagal menambah pengeluaran');
    }
  };

  const fetchTransactionsData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        jenis
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (filterPeriod === 'bulan_ini') {
        params.bulan = currentMonth;
        params.tahun = currentYear;
      } else if (filterPeriod === 'custom') {
        if (selectedMonth) params.bulan = selectedMonth;
        if (selectedYear) params.tahun = selectedYear;
      }

      const res = await getTransactions(params);
      if (res.success) {
        setTransactions(res.data || []);
        setTotalNominal(res.total_nominal || 0);
        setTotalCount(res.total_count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsData();
    fetchFinanceSummary();
  }, [page, jenis, filterPeriod, selectedMonth, selectedYear]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactionsData();
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Indonesian Months
  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#c5a059] mb-0.5">
            <Receipt className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-widest uppercase">Keuangan & Rekap Pembayaran</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Laporan Keuangan & Arus Kas Gym
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi pemasukan member, POS kasir, trainer (PT), dan pengeluaran operasional
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Pengeluaran</span>
          </button>
          <button
            onClick={() => {
              setPage(1);
              fetchTransactionsData();
              fetchFinanceSummary();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#c5a059] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards (Consolidated from All Modules!) */}
      {financeSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Omzet Member Gym</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              {formatRupiah(financeSummary.total_member_income)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pendaftaran & Perpanjangan</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Penjualan POS Kasir</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              {formatRupiah(financeSummary.total_pos_income)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Minuman, F&B, Merchandise</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Paket Trainer (PT)</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              {formatRupiah(financeSummary.total_pt_income)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Personal Coaching Member</div>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-white">
            <span className="text-[11px] font-bold text-[#dfc185] uppercase">Total Keuntungan Bersih</span>
            <div className="text-xl font-black text-[#dfc185] font-mono mt-1">
              {formatRupiah(financeSummary.net_profit)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Setelah dikurangi beban operasional</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveFinanceTab('summary')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'summary'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua Transaksi Member ({totalCount})
        </button>
        <button
          onClick={() => setActiveFinanceTab('expenses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'expenses'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pengeluaran Operasional ({financeSummary?.expenses?.length || 0})
        </button>
      </div>

      {activeFinanceTab === 'summary' && (
        <>
      {/* Summary Cards (Dynamic by Period Filter!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#c5a059]/50 shadow-sm bg-gradient-to-br from-white via-white to-[#c5a059]/15">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#c5a059] text-slate-950 flex items-center justify-center shadow-md shadow-[#c5a059]/20 font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#967434] font-bold border border-[#c5a059]/40">
              {filterPeriod === 'bulan_ini' ? 'Bulan Ini' : filterPeriod === 'custom' ? `Periode Terpilih` : 'Semua Periode'}
            </span>
          </div>
          <span className="text-xs font-bold text-[#967434] uppercase tracking-wider block">
            Pendapatan {filterPeriod === 'bulan_ini' ? 'Bulan Ini' : 'Periode Ini'}
          </span>
          <div className="text-2xl font-black text-[#967434] mt-1 font-mono">
            {formatRupiah(totalNominal)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Total omzet dari {totalCount} transaksi yang difilter.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
            <Receipt className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Jumlah Transaksi
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {totalCount} <span className="text-xs font-normal text-slate-400">transaksi</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Rekapitulasi pembayaran member baru & perpanjangan.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Rata-rata per Transaksi
          </span>
          <div className="text-2xl font-black text-indigo-950 mt-1 font-mono">
            {totalCount > 0 ? formatRupiah(Math.round(totalNominal / totalCount)) : 'Rp 0'}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Nilai transaksi rata-rata periode terpilih.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box: Cari Member atau No Transaksi */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama member, ID, No HP, atau No. TRX..."
              className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c5a059] focus:bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-bold text-[11px] rounded-lg transition"
            >
              Cari
            </button>
          </form>

          {/* Period Filter Buttons */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-slate-400 text-xs font-semibold mr-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Periode:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setFilterPeriod('bulan_ini');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                filterPeriod === 'bulan_ini'
                  ? 'bg-[#c5a059] text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini ({months[currentMonth - 1]?.label})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPeriod('semua');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                filterPeriod === 'semua'
                  ? 'bg-[#c5a059] text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Riwayat
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPeriod('custom');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                filterPeriod === 'custom'
                  ? 'bg-[#c5a059] text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pilih Bulan & Tahun
            </button>
          </div>
        </div>

        {/* Custom Month/Year Dropdown & Jenis Filter */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {filterPeriod === 'custom' && (
            <div className="flex items-center space-x-2 animate-in fade-in">
              <span className="text-slate-500 font-medium">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#c5a059]"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <span className="text-slate-500 font-medium">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#c5a059]"
              >
                {years.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Jenis: Semua, Pendaftaran, Perpanjangan */}
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-slate-400 text-xs">Jenis:</span>
            {['Semua', 'daftar', 'perpanjang'].map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => {
                  setJenis(j);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  jenis === j
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {j === 'Semua' ? 'Semua' : j === 'daftar' ? 'Pendaftaran' : 'Perpanjangan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table (Max 10 per page) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
            <span className="text-xs">Memuat data transaksi...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada transaksi yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau pilihan bulan/periode.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">No. Transaksi</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Paket Dipilih</th>
                    <th className="py-3 px-4">Jenis Transaksi</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4">Tanggal Pembayaran</th>
                    <th className="py-3 px-4 text-center">Bukti / Detail</th>
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

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTx(t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#967434] hover:bg-[#c5a059]/15 transition"
                            title="Lihat Rincian Bukti Bayar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 baris per halaman) */}
            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Menampilkan halaman <strong className="text-slate-800 font-bold">{page}</strong> dari <strong className="text-slate-800 font-bold">{totalPages}</strong> ({totalCount} total transaksi)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono font-semibold px-2">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </>
      )}

      {/* Modal Detail Bukti Transaksi Member (Solusi Komplain Pembayaran) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#121318] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-bold text-sm tracking-wide text-white">Bukti Riwayat Transaksi Sah</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Receipt Card */}
            <div className="bg-[#0a0b0e] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-800">
                <div className="font-black text-sm text-white">FORMA GYM • CAFE • POOL</div>
                <div className="text-[10px] text-slate-400 mt-0.5">BUKTI RESMI PEMBAYARAN</div>
                <div className="text-[11px] text-[#c5a059] font-bold mt-1">
                  TRX-{String(selectedTx.id_transaksi).padStart(5, '0')}
                </div>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-bold text-white text-right">{selectedTx.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Member:</span>
                  <span className="text-[#c5a059]">{selectedTx.id_member}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. HP:</span>
                  <span>{selectedTx.no_hp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paket:</span>
                  <span className="text-white">{selectedTx.nama_paket}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis:</span>
                  <span>{selectedTx.jenis === 'daftar' ? 'Pendaftaran Baru' : 'Perpanjangan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="text-white">{selectedTx.metode_bayar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Bayar:</span>
                  <span>{selectedTx.tanggal_bayar}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">TOTAL BAYAR:</span>
                <span className="font-black text-[#c5a059] text-base">{formatRupiah(selectedTx.jumlah_bayar)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#c5a059] text-slate-950 hover:bg-[#b89047] transition shadow"
              >
                Tutup Bukti Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES TAB VIEW */}
      {activeFinanceTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm uppercase">Daftar Beban & Pengeluaran Operasional</h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition"
            >
              + Catat Pengeluaran Baru
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Deskripsi / Keperluan</th>
                <th className="p-3.5">Metode</th>
                <th className="p-3.5">PIC</th>
                <th className="p-3.5 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {financeSummary?.expenses?.map((e) => (
                <tr key={e.id_pengeluaran} className="hover:bg-slate-50/60">
                  <td className="p-3.5 font-mono text-slate-700">{e.tanggal}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {e.kategori}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{e.deskripsi}</td>
                  <td className="p-3.5 text-slate-600">{e.metode_bayar}</td>
                  <td className="p-3.5 text-slate-500">{e.pic}</td>
                  <td className="p-3.5 font-mono font-black text-rose-600 text-right">
                    - {formatRupiah(e.nominal)}
                  </td>
                </tr>
              ))}
              {(!financeSummary?.expenses || financeSummary.expenses.length === 0) && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">Belum ada catatan pengeluaran</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CATAT PENGELUARAN */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Catat Pengeluaran Operasional</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Beban</label>
                <select
                  value={expenseForm.kategori}
                  onChange={(e) => setExpenseForm({ ...expenseForm, kategori: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Operasional">Operasional Gym</option>
                  <option value="Restock POS">Restock Barang Kasir (Minuman/F&B)</option>
                  <option value="Perawatan Alat">Perawatan & Servis Mesin Fitness</option>
                  <option value="Kebersihan & Kolam">Kimia Kolam Renang & Sanitasi</option>
                  <option value="Gaji / Komisi">Komisi Trainer & Gaji Staff</option>
                  <option value="Listrik & Air">Listrik, Air & Internet</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Keperluan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli kaporit kolam renang 1 pail"
                  value={expenseForm.deskripsi}
                  onChange={(e) => setExpenseForm({ ...expenseForm, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Nominal"
                    value={expenseForm.nominal}
                    onChange={(e) => setExpenseForm({ ...expenseForm, nominal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Metode Bayar</label>
                  <select
                    value={expenseForm.metode_bayar}
                    onChange={(e) => setExpenseForm({ ...expenseForm, metode_bayar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Tunai">Tunai Kas Kecil</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow"
                >
                  Simpan Beban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
