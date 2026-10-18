import React, { useState, useEffect } from 'react';
import { 
  Receipt, Wallet, RefreshCw, Calendar, Search, Filter, 
  ChevronLeft, ChevronRight, User, ArrowDownRight, CreditCard,
  TrendingUp, Download, Eye, CheckCircle2, DollarSign, Plus, ArrowUpRight, ShoppingBag, Dumbbell, X, Layers,
  Pencil, Trash2
} from 'lucide-react';
import { 
  getTransactions, formatRupiah, formatDateIndo, getFinanceSummary, 
  addExpense, updateExpense, deleteExpense, getPosHistory, deletePosTransaction, getTrainerMembers, getUnifiedTransactions, getExpenses 
} from '../utils/api';

export default function TransactionsView() {
  // activeFinanceTab: 'all', 'memberships', 'pos', 'pt', 'expenses'
  const [activeFinanceTab, setActiveFinanceTab] = useState('all');
  const [financeSummary, setFinanceSummary] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    kategori: 'Operasional',
    deskripsi: '',
    nominal: '',
    metode_bayar: 'Tunai'
  });

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState(null);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editExpenseForm, setEditExpenseForm] = useState({
    kategori: 'Operasional',
    deskripsi: '',
    nominal: '',
    metode_bayar: 'Tunai'
  });

  const [loading, setLoading] = useState(true);
  
  // Unified transactions state (for 'all', 'memberships', 'pos', 'pt')
  const [dataList, setDataList] = useState([]);
  const [totalNominal, setTotalNominal] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [search, setSearch] = useState('');
  
  // Current Month & Year defaults
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [filterPeriod, setFilterPeriod] = useState('bulan_ini'); // 'bulan_ini', 'semua', 'custom'

  // Pagination state (10 items per page)
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected item detail modal
  const [selectedItem, setSelectedItem] = useState(null);

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
        fetchData();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('Gagal menambah pengeluaran');
    }
  };

  const handleOpenEditExpense = (exp) => {
    setEditingExpense(exp);
    setEditExpenseForm({
      kategori: exp.kategori || 'Operasional',
      deskripsi: exp.deskripsi || '',
      nominal: exp.nominal || '',
      metode_bayar: exp.metode_bayar || 'Tunai'
    });
    setShowEditExpenseModal(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const res = await updateExpense(editingExpense.id_pengeluaran, editExpenseForm);
      if (res.success) {
        setShowEditExpenseModal(false);
        setEditingExpense(null);
        fetchFinanceSummary();
        fetchData();
      } else {
        alert(res.message || 'Gagal mengubah pengeluaran');
      }
    } catch (err) {
      alert(err.message || 'Gagal mengubah pengeluaran');
    }
  };

  const handleDeleteExpense = async (id, deskripsi) => {
    if (!window.confirm(`Yakin ingin menghapus catatan pengeluaran "${deskripsi}"?\n\nTotal pengeluaran dan laba bersih di rekap keuangan akan langsung diperbarui.`)) {
      return;
    }
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        fetchFinanceSummary();
        fetchData();
      } else {
        alert(res.message || 'Gagal menghapus pengeluaran');
      }
    } catch (err) {
      alert(err.message || 'Gagal menghapus pengeluaran');
    }
  };

  const handleDeletePos = async (posId, nomorStruk) => {
    if (!window.confirm(`Yakin ingin membatalkan & menghapus transaksi kasir "${nomorStruk}"?\n\nStok produk akan otomatis dikembalikan ke inventaris kasir, dan pendapatan penjualan akan dihapus dari rekap keuangan.`)) {
      return;
    }
    try {
      const res = await deletePosTransaction(posId);
      if (res.success) {
        alert(res.message);
        setSelectedItem(null);
        fetchFinanceSummary();
        fetchData();
      } else {
        alert(res.message || 'Gagal membatalkan transaksi POS');
      }
    } catch (err) {
      alert(err.message || 'Gagal membatalkan transaksi POS');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit
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

      if (activeFinanceTab === 'expenses') {
        const res = await getExpenses(params);
        if (res.success) {
          setDataList(res.data || []);
          setTotalNominal(res.total_nominal || 0);
          setTotalCount(res.total_count || 0);
        }
      } else {
        if (activeFinanceTab === 'memberships') {
          params.kategori = 'Member Gym';
        } else if (activeFinanceTab === 'pos') {
          params.kategori = 'POS Kasir';
        } else if (activeFinanceTab === 'pt') {
          params.kategori = 'Trainer (PT)';
        } else {
          params.kategori = 'Semua';
        }

        const res = await getUnifiedTransactions(params);
        if (res.success) {
          setDataList(res.data || []);
          setTotalNominal(res.total_nominal || 0);
          setTotalCount(res.total_count || 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFinanceSummary();
  }, [activeFinanceTab, page, filterPeriod, selectedMonth, selectedYear]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
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
              fetchData();
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveFinanceTab('all');
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'all'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Pemasukan (All)</span>
        </button>

        <button
          onClick={() => {
            setActiveFinanceTab('memberships');
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'memberships'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Member Gym</span>
        </button>

        <button
          onClick={() => {
            setActiveFinanceTab('pos');
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'pos'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>POS Kasir / Minuman</span>
        </button>

        <button
          onClick={() => {
            setActiveFinanceTab('pt');
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'pt'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Paket Trainer (PT)</span>
        </button>

        <button
          onClick={() => {
            setActiveFinanceTab('expenses');
            setPage(1);
          }}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeFinanceTab === 'expenses'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Pengeluaran Operasional ({financeSummary?.expenses?.length || 0})</span>
        </button>
      </div>

      {activeFinanceTab !== 'expenses' && (
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
                Total Nominal ({activeFinanceTab === 'all' ? 'Semua Pemasukan' : activeFinanceTab === 'memberships' ? 'Member Gym' : activeFinanceTab === 'pos' ? 'POS Kasir' : 'Trainer PT'})
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
                Tercatat pada filter periode ini.
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
                Nilai rata-rata dari data terfilter.
              </p>
            </div>
          </div>

          {/* Filter & Search Bar - Shared across All, Gym, POS, PT! */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, No. Struk/TRX, atau keterangan..."
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

            {/* Custom Month/Year Dropdown */}
            {filterPeriod === 'custom' && (
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 animate-in fade-in text-xs">
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
          </div>

          {/* Unified Transactions Table (Max 10 per page, pagination standard) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
                <span className="text-xs">Memuat data transaksi...</span>
              </div>
            ) : dataList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada riwayat transaksi yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau pilihan bulan/periode.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">No. Referensi</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">Nama Pelanggan / Member</th>
                        <th className="py-3 px-4">Keterangan / Rincian</th>
                        <th className="py-3 px-4">Nominal</th>
                        <th className="py-3 px-4">Metode Bayar</th>
                        <th className="py-3 px-4">Waktu Transaksi</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataList.map((item) => {
                        const isGym = item.kategori === 'Member Gym';
                        const isPos = item.kategori === 'POS Kasir';
                        const isPt = item.kategori === 'Trainer (PT)';

                        return (
                          <tr key={item.unique_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              {item.no_referensi}
                            </td>

                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isGym 
                                  ? 'bg-[#c5a059]/20 text-[#967434] border border-[#c5a059]/40' 
                                  : isPos
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}>
                                {item.kategori}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{item.pihak_terkait}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.kode_id}</span>
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate" title={item.deskripsi}>
                              {item.deskripsi}
                            </td>

                            <td className="py-3 px-4 font-mono font-black text-emerald-600 text-sm">
                              {formatRupiah(item.nominal)}
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.metode_bayar}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {item.waktu}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#967434] hover:bg-[#c5a059]/15 transition"
                                  title="Lihat Rincian Bukti Transaksi"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {item.kategori === 'POS Kasir' && (
                                  <button
                                    onClick={() => handleDeletePos(item.no_referensi || item.unique_id.replace('POS-', ''), item.no_referensi)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Batalkan & Hapus Transaksi POS (Kembalikan Stok Barang)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls (10 baris per halaman untuk semua modul) */}
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

      {/* Modal Detail Bukti Transaksi Sah */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#121318] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-bold text-sm tracking-wide text-white">Bukti Riwayat Transaksi Sah</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Receipt Card */}
            <div className="bg-[#0a0b0e] border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-800">
                <div className="font-black text-sm text-white">FORMA GYM • CAFE • POOL</div>
                <div className="text-[10px] text-slate-400 mt-0.5">BUKTI RESMI TRANSAKSI KEUANGAN</div>
                <div className="text-[11px] text-[#c5a059] font-bold mt-1">
                  {selectedItem.no_referensi}
                </div>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-bold text-[#c5a059]">{selectedItem.kategori}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan/Member:</span>
                  <span className="font-bold text-white text-right">{selectedItem.pihak_terkait}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID / Kode:</span>
                  <span className="text-slate-300">{selectedItem.kode_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Keterangan:</span>
                  <span className="text-white text-right max-w-[200px]">{selectedItem.deskripsi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="text-white">{selectedItem.metode_bayar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Bayar:</span>
                  <span>{selectedItem.waktu}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">TOTAL BAYAR:</span>
                <span className="font-black text-[#c5a059] text-base">{formatRupiah(selectedItem.nominal)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
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
        <>
          {/* Summary Cards for Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white via-white to-rose-50">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                  {filterPeriod === 'bulan_ini' ? 'Bulan Ini' : filterPeriod === 'custom' ? `Periode Terpilih` : 'Semua Periode'}
                </span>
              </div>
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                Total Pengeluaran Operasional
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
                {formatRupiah(totalNominal)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Total beban operasional dari {totalCount} transaksi yang difilter.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
                <Receipt className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Jumlah Catatan Pengeluaran
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {totalCount} <span className="text-xs font-normal text-slate-400">transaksi beban</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tercatat pada periode filter aktif.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Rata-rata per Beban
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {totalCount > 0 ? formatRupiah(Math.round(totalNominal / totalCount)) : 'Rp 0'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Rata-rata per transaksi pengeluaran.
              </p>
            </div>
          </div>

          {/* Filter & Search Bar for Expenses */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari deskripsi beban, kategori, metode, atau PIC..."
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

            {/* Custom Month/Year Dropdown */}
            {filterPeriod === 'custom' && (
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 animate-in fade-in text-xs">
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
          </div>

          {/* Expenses Table with Pagination */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm uppercase">Daftar Beban & Pengeluaran Operasional</h3>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
              >
                + Catat Pengeluaran Baru
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
                <span className="text-xs">Memuat data pengeluaran...</span>
              </div>
            ) : dataList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada pengeluaran yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau pilihan bulan/periode.</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Deskripsi / Keperluan</th>
                      <th className="p-3.5">Metode</th>
                      <th className="p-3.5">PIC</th>
                      <th className="p-3.5 text-right">Nominal</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataList.map((e) => (
                      <tr key={e.id_pengeluaran} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 font-mono text-slate-700">{e.tanggal}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {e.kategori}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{e.deskripsi}</td>
                        <td className="p-3.5 text-slate-600">{e.metode_bayar}</td>
                        <td className="p-3.5 text-slate-500">{e.pic}</td>
                        <td className="p-3.5 font-mono font-black text-rose-600 text-right">
                          - {formatRupiah(e.nominal)}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition"
                              title="Edit Catatan Pengeluaran"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(e.id_pengeluaran, e.deskripsi)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                              title="Hapus Catatan Pengeluaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls for Expenses */}
                <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Menampilkan halaman <strong className="text-slate-800 font-bold">{page}</strong> dari <strong className="text-slate-800 font-bold">{totalPages}</strong> ({totalCount} total pengeluaran)
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

      {/* MODAL EDIT PENGELUARAN */}
      {showEditExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Edit Catatan Pengeluaran</h3>
              <button 
                onClick={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpense(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Beban</label>
                <select
                  value={editExpenseForm.kategori}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, kategori: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Operasional">Operasional Gym</option>
                  <option value="Restock POS">Restock Barang Kasir (Minuman/F&B)</option>
                  <option value="Perawatan Alat">Perawatan & Servis Mesin Fitness</option>
                  <option value="Kebersihan & Kolam">Kimia Kolam Renang & Sanitasi</option>
                  <option value="Gaji / Komisi">Komisi Trainer & Gaji Staff</option>
                  <option value="Utilitas">Listrik, Air & Internet</option>
                  <option value="Lainnya">Pengeluaran Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Keperluan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli kaporit kolam renang 1 pail"
                  value={editExpenseForm.deskripsi}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, deskripsi: e.target.value })}
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
                    value={editExpenseForm.nominal}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, nominal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Metode Bayar</label>
                  <select
                    value={editExpenseForm.metode_bayar}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, metode_bayar: e.target.value })}
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
                  onClick={() => {
                    setShowEditExpenseModal(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
