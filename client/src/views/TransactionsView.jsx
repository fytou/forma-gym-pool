import React, { useState, useEffect } from 'react';
import { 
  Receipt, Wallet, RefreshCw, Calendar, Search, Filter, 
  ChevronLeft, ChevronRight, User, ArrowDownRight, CreditCard,
  TrendingUp, Download, Eye, CheckCircle2, DollarSign, Plus, ArrowUpRight, 
  ShoppingBag, Dumbbell, X, Layers, Pencil, Trash2, CalendarDays, Ticket,
  Coffee, Printer, BarChart3, Clock, ArrowRight
} from 'lucide-react';
import { 
  getTransactions, formatRupiah, formatDateIndo, getFinanceSummary, getDailyFinanceRecap,
  addExpense, updateExpense, deleteExpense, deletePosTransaction, getUnifiedTransactions, getExpenses 
} from '../utils/api';

export default function TransactionsView() {
  // viewMode: 'recap_harian' (Tabel Pendapatan Per Hari) or 'transaksi_rinci' (Daftar Transaksi Satuan)
  const [viewMode, setViewMode] = useState('recap_harian');

  // activeFinanceTab: 'all', 'memberships', 'visit', 'pos_belanja', 'pt', 'expenses'
  const [activeFinanceTab, setActiveFinanceTab] = useState('all');
  const [financeSummary, setFinanceSummary] = useState(null);
  
  // Daily Recap state
  const [dailyRecapList, setDailyRecapList] = useState([]);
  const [dailyRecapSummary, setDailyRecapSummary] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Expense Modals State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    kategori: 'Operasional',
    deskripsi: '',
    nominal: '',
    metode_bayar: 'Tunai'
  });

  const [editingExpense, setEditingExpense] = useState(null);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editExpenseForm, setEditExpenseForm] = useState({
    kategori: 'Operasional',
    deskripsi: '',
    nominal: '',
    metode_bayar: 'Tunai'
  });

  const [loading, setLoading] = useState(true);
  
  // Unified transactions state
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

  // filterPeriod: 'hari_ini', 'kemarin', 'tanggal_spesifik', 'bulan_ini', 'custom_bulan', 'semua'
  const [filterPeriod, setFilterPeriod] = useState('bulan_ini');
  
  const getJakartaDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  };

  const [filterTanggal, setFilterTanggal] = useState(() => getJakartaDate(0));

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Selected item detail modal
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchFinanceSummary = async () => {
    try {
      const res = await getFinanceSummary();
      if (res.success) setFinanceSummary(res.data);
    } catch (e) {
      console.error('Fetch finance summary error:', e);
    }
  };

  const fetchDailyRecap = async () => {
    setLoadingDaily(true);
    try {
      const params = {};
      if (filterPeriod === 'hari_ini' || filterPeriod === 'kemarin' || (filterPeriod === 'tanggal_spesifik' && filterTanggal)) {
        params.tanggal = filterTanggal;
      } else if (filterPeriod === 'bulan_ini') {
        params.bulan = currentMonth;
        params.tahun = currentYear;
      } else if (filterPeriod === 'custom_bulan') {
        if (selectedMonth) params.bulan = selectedMonth;
        if (selectedYear) params.tahun = selectedYear;
      }

      const res = await getDailyFinanceRecap(params);
      if (res.success) {
        setDailyRecapList(res.data || []);
        setDailyRecapSummary(res.summary || null);
      }
    } catch (e) {
      console.error('Fetch daily recap error:', e);
    } finally {
      setLoadingDaily(false);
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

      if (filterPeriod === 'hari_ini' || filterPeriod === 'kemarin' || (filterPeriod === 'tanggal_spesifik' && filterTanggal)) {
        params.tanggal = filterTanggal;
      } else if (filterPeriod === 'bulan_ini') {
        params.bulan = currentMonth;
        params.tahun = currentYear;
      } else if (filterPeriod === 'custom_bulan') {
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
        } else if (activeFinanceTab === 'visit') {
          params.kategori = 'Tiket Visit';
        } else if (activeFinanceTab === 'pos_belanja') {
          params.kategori = 'Belanja Kasir';
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
      console.error('Fetch transaction list error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyRecap();
  }, [filterPeriod, filterTanggal, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
    fetchFinanceSummary();
  }, [activeFinanceTab, page, limit, filterPeriod, filterTanggal, selectedMonth, selectedYear]);

  const handlePeriodChange = (mode) => {
    setFilterPeriod(mode);
    setPage(1);

    if (mode === 'hari_ini') {
      setFilterTanggal(getJakartaDate(0));
    } else if (mode === 'kemarin') {
      setFilterTanggal(getJakartaDate(-1));
    } else if (mode === 'bulan_ini') {
      setSelectedMonth(String(currentMonth));
      setSelectedYear(String(currentYear));
    }
  };

  const handleDrilldownDay = (tgl) => {
    setFilterTanggal(tgl);
    setFilterPeriod('tanggal_spesifik');
    setViewMode('transaksi_rinci');
    setPage(1);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await addExpense(expenseForm);
      if (res.success) {
        setShowExpenseModal(false);
        setExpenseForm({ kategori: 'Operasional', deskripsi: '', nominal: '', metode_bayar: 'Tunai' });
        fetchFinanceSummary();
        fetchDailyRecap();
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
        fetchDailyRecap();
        fetchData();
      } else {
        alert(res.message || 'Gagal mengubah pengeluaran');
      }
    } catch (err) {
      alert(err.message || 'Gagal mengubah pengeluaran');
    }
  };

  const handleDeleteExpense = async (id, deskripsi) => {
    if (!window.confirm(`Yakin ingin menghapus catatan pengeluaran "${deskripsi}"?\n\nTotal pengeluaran dan kas bersih akan langsung diperbarui.`)) {
      return;
    }
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        fetchFinanceSummary();
        fetchDailyRecap();
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
        fetchDailyRecap();
        fetchData();
      } else {
        alert(res.message || 'Gagal membatalkan transaksi POS');
      }
    } catch (err) {
      alert(err.message || 'Gagal membatalkan transaksi POS');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

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

  const formatTanggalLengkap = (tglStr) => {
    if (!tglStr) return '-';
    try {
      const [y, m, d] = tglStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch {
      return tglStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2 text-[#c5a059] mb-0.5">
            <Receipt className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-widest uppercase">Keuangan & Rekap Arus Kas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Laporan Keuangan & Omzet Harian Gym
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rekapitulasi pendapatan harian: Tiket Visit, Belanja POS, Member Gym, Trainer PT, dan Pengeluaran
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
            title="Cetak Laporan Keuangan"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Laporan</span>
          </button>

          <button
            onClick={() => {
              fetchData();
              fetchDailyRecap();
              fetchFinanceSummary();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 rounded-xl text-xs font-black shadow-md shadow-[#c5a059]/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingDaily ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Banner / Card Ringkasan Hari Ini (WIB Realtime) */}
      {financeSummary?.today && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/20 text-[#dfc185] border border-[#c5a059]/40 flex items-center justify-center shrink-0">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#c5a059] text-slate-950">
                    Hari Ini (WIB)
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {formatTanggalLengkap(financeSummary.today.tanggal)}
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xs text-slate-400">Total Omzet Masuk:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-[#dfc185]">
                    {formatRupiah(financeSummary.today.gross_income)}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown Mini Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-medium">Member Gym</span>
                <span className="font-mono font-bold text-white text-xs block mt-0.5">
                  {formatRupiah(financeSummary.today.member_income)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-sky-400 block font-medium">Tiket Visit</span>
                <span className="font-mono font-bold text-sky-300 text-xs block mt-0.5">
                  {formatRupiah(financeSummary.today.visit_income)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-amber-400 block font-medium">Belanja / Kafe</span>
                <span className="font-mono font-bold text-amber-300 text-xs block mt-0.5">
                  {formatRupiah(financeSummary.today.belanja_income)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-emerald-400 block font-medium">Kas Bersih Hari Ini</span>
                <span className="font-mono font-bold text-emerald-400 text-xs block mt-0.5">
                  {formatRupiah(financeSummary.today.net_profit)}
                </span>
              </div>
            </div>

            <div>
              <button
                onClick={() => handlePeriodChange('hari_ini')}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <span>Lihat Transaksi Hari Ini</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Financial Overview Cards (Separated Visit vs Belanja vs Member vs PT) */}
      {financeSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Member Gym */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-500 mb-1">
              <Receipt className="w-4 h-4 text-[#c5a059]" />
              <span className="text-[11px] font-bold uppercase">Member Gym</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {formatRupiah(financeSummary.total_member_income)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pendaftaran & Paket</div>
          </div>

          {/* Tiket Visit */}
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex items-center space-x-2 text-sky-700 mb-1">
              <Ticket className="w-4 h-4 text-sky-600" />
              <span className="text-[11px] font-bold uppercase">Tiket Visit Harian</span>
            </div>
            <div className="text-base sm:text-lg font-black text-sky-900 font-mono">
              {formatRupiah(financeSummary.total_visit_income || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Visit Gym & Kolam Renang</div>
          </div>

          {/* Belanja / Kafe */}
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center space-x-2 text-amber-700 mb-1">
              <Coffee className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] font-bold uppercase">Belanja / Kafe</span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-900 font-mono">
              {formatRupiah(financeSummary.total_belanja_income || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Minuman, F&B, Handuk</div>
          </div>

          {/* Trainer PT */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2 text-indigo-700 mb-1">
              <Dumbbell className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px] font-bold uppercase">Paket Trainer (PT)</span>
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-950 font-mono">
              {formatRupiah(financeSummary.total_pt_income)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Personal Coaching</div>
          </div>

          {/* Total Bersih */}
          <div className="col-span-2 lg:col-span-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white shadow-sm">
            <span className="text-[11px] font-bold text-[#dfc185] uppercase block mb-1">
              Total Keuntungan Bersih
            </span>
            <div className="text-lg font-black text-[#dfc185] font-mono">
              {formatRupiah(financeSummary.net_profit)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Setelah beban operasional</div>
          </div>
        </div>
      )}

      {/* View Mode Switcher (Tab Mode: Rekap Pendapatan Per Hari vs Transaksi Rinci) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('recap_harian')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition ${
              viewMode === 'recap_harian'
                ? 'bg-slate-900 text-[#dfc185] shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#c5a059]" />
            <span>Rekap Pendapatan Per Hari (Tabel Harian)</span>
          </button>

          <button
            onClick={() => setViewMode('transaksi_rinci')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition ${
              viewMode === 'transaksi_rinci'
                ? 'bg-slate-900 text-[#dfc185] shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4 text-[#c5a059]" />
            <span>Daftar Transaksi Rinci</span>
          </button>
        </div>

        {/* Quick Filter Period Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs w-full sm:w-auto justify-start sm:justify-end">
          <span className="text-slate-400 font-bold text-[11px] mr-1 hidden md:inline">Periode:</span>
          {[
            { id: 'hari_ini', label: 'Hari Ini' },
            { id: 'kemarin', label: 'Kemarin' },
            { id: 'bulan_ini', label: `Bulan Ini (${months[currentMonth - 1]?.label})` },
            { id: 'custom_bulan', label: 'Pilih Bulan' },
            { id: 'semua', label: 'Semua' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => handlePeriodChange(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                filterPeriod === pill.id
                  ? 'bg-[#c5a059] text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* Date Picker for Tanggal Spesifik */}
          <div className="flex items-center space-x-1 pl-1">
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => {
                setFilterTanggal(e.target.value);
                setFilterPeriod('tanggal_spesifik');
                setPage(1);
              }}
              className="px-2 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-[#c5a059]"
              title="Pilih tanggal spesifik yang ingin dicek"
            />
          </div>
        </div>
      </div>

      {/* Custom Month / Year Selector if 'custom_bulan' */}
      {filterPeriod === 'custom_bulan' && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 text-xs animate-fade-in">
          <span className="text-slate-600 font-bold">Pilih Periode Bulan & Tahun:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#c5a059]"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#c5a059]"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: REKAP PENDAPATAN PER HARI (TABLE VIEW GROUPED BY DAY) */}
      {/* ============================================================== */}
      {viewMode === 'recap_harian' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase flex items-center space-x-2">
                <span>Rekapitulasi Arus Kas & Pendapatan Harian</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c5a059]/20 text-[#967434]">
                  {dailyRecapList.length} Hari Tercatat
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian omzet harian per kategori: Member Gym, Tiket Visit (Gym & Kolam), Belanja Kasir, Trainer PT, dan Pengeluaran
              </p>
            </div>

            {dailyRecapSummary && (
              <div className="flex items-center space-x-3 text-right">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Omzet Periode Ini:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm sm:text-base">
                    {formatRupiah(dailyRecapSummary.total_omzet)}
                  </span>
                </div>
                <div className="text-xs border-l border-slate-200 pl-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kas Bersih:</span>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                    {formatRupiah(dailyRecapSummary.kas_bersih)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {loadingDaily ? (
            <div className="p-14 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#c5a059] mb-2" />
              <span className="text-xs font-medium">Menghitung rekap harian...</span>
            </div>
          ) : dailyRecapList.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Belum ada data pendapatan pada periode ini</p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan pilih periode lain seperti "Bulan Ini" atau "Semua" di bagian atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4 text-right">Member Gym</th>
                    <th className="py-3.5 px-4 text-right">Tiket Visit</th>
                    <th className="py-3.5 px-4 text-right">Belanja / Kafe</th>
                    <th className="py-3.5 px-4 text-right">Trainer (PT)</th>
                    <th className="py-3.5 px-4 text-right bg-emerald-50/50 text-emerald-900">Total Omzet</th>
                    <th className="py-3.5 px-4 text-right text-rose-700">Pengeluaran</th>
                    <th className="py-3.5 px-4 text-right bg-amber-50/60 text-amber-900 font-black">Kas Bersih</th>
                    <th className="py-3.5 px-3 text-center">Trx</th>
                    <th className="py-3.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyRecapList.map((day) => {
                    const isToday = day.tanggal === getJakartaDate(0);

                    return (
                      <tr 
                        key={day.tanggal} 
                        className={`hover:bg-slate-50 transition ${isToday ? 'bg-amber-50/30' : ''}`}
                      >
                        {/* Tanggal */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 block font-mono text-xs">
                              {day.tanggal}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#c5a059] text-slate-950">
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {formatTanggalLengkap(day.tanggal)}
                          </span>
                        </td>

                        {/* Member Gym */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                          {day.omzet_member > 0 ? formatRupiah(day.omzet_member) : '-'}
                        </td>

                        {/* Tiket Visit */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-700">
                          {day.omzet_visit > 0 ? formatRupiah(day.omzet_visit) : '-'}
                        </td>

                        {/* Belanja Kasir / Kafe */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                          {day.omzet_belanja > 0 ? formatRupiah(day.omzet_belanja) : '-'}
                        </td>

                        {/* Trainer PT */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-indigo-700">
                          {day.omzet_pt > 0 ? formatRupiah(day.omzet_pt) : '-'}
                        </td>

                        {/* Total Omzet */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm bg-emerald-50/40">
                          {formatRupiah(day.total_omzet)}
                        </td>

                        {/* Pengeluaran */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                          {day.pengeluaran > 0 ? `- ${formatRupiah(day.pengeluaran)}` : '-'}
                        </td>

                        {/* Kas Bersih */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950 text-sm bg-amber-50/50">
                          {formatRupiah(day.kas_bersih)}
                        </td>

                        {/* Jumlah Trx */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-bold">
                          {day.total_transaksi}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-3.5 text-center">
                          <button
                            onClick={() => handleDrilldownDay(day.tanggal)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-[#c5a059] hover:text-slate-950 rounded-lg transition active:scale-95"
                            title="Buka daftar transaksi rinci hari ini"
                          >
                            <span>Rincian</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer Total Row */}
                {dailyRecapSummary && (
                  <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-800">
                    <tr>
                      <td className="py-3.5 px-4">
                        TOTAL REKAP ({dailyRecapSummary.total_hari} HARI)
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {formatRupiah(dailyRecapSummary.total_member)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sky-300">
                        {formatRupiah(dailyRecapSummary.total_visit)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-300">
                        {formatRupiah(dailyRecapSummary.total_belanja)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-indigo-300">
                        {formatRupiah(dailyRecapSummary.total_pt)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-black text-sm bg-slate-800">
                        {formatRupiah(dailyRecapSummary.total_omzet)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-400">
                        - {formatRupiah(dailyRecapSummary.total_pengeluaran)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#dfc185] font-black text-sm bg-slate-800">
                        {formatRupiah(dailyRecapSummary.kas_bersih)}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-center text-slate-400 font-sans text-[10px]">
                        Laporan Selesai
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: DAFTAR TRANSAKSI RINCI (ITEMIZED DETAIL WITH TABS)     */}
      {/* ============================================================== */}
      {viewMode === 'transaksi_rinci' && (
        <div className="space-y-4">
          {/* Tabs Kategori Pemasukan & Pengeluaran */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'all', label: 'Semua Pemasukan (All)', icon: Layers },
              { id: 'memberships', label: 'Member Gym', icon: Receipt },
              { id: 'visit', label: 'Tiket Visit (Gym & Kolam)', icon: Ticket },
              { id: 'pos_belanja', label: 'Belanja Kasir / Kafe', icon: ShoppingBag },
              { id: 'pt', label: 'Paket Trainer (PT)', icon: Dumbbell },
              { id: 'expenses', label: `Pengeluaran Operasional (${financeSummary?.expenses?.length || 0})`, icon: ArrowUpRight }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveFinanceTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
                    activeFinanceTab === tab.id
                      ? 'bg-slate-900 text-[#dfc185] shadow'
                      : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Bar & Active Scope Indicator */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, No. Struk/TRX, atau keterangan..."
                className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c5a059] focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-bold text-[11px] rounded-lg transition"
              >
                Cari
              </button>
            </form>

            <div className="flex items-center space-x-3 text-xs text-slate-600">
              <span className="font-medium">
                Total Nilai: <strong className="font-mono font-black text-slate-900 text-sm">{formatRupiah(totalNominal)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Jumlah: <strong className="font-mono font-bold text-slate-900">{totalCount}</strong> trx
              </span>
            </div>
          </div>

          {/* Table List of Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#c5a059] mb-2" />
                <span className="text-xs">Memuat daftar transaksi...</span>
              </div>
            ) : dataList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada transaksi yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau ubah filter periode.</p>
              </div>
            ) : activeFinanceTab === 'expenses' ? (
              /* EXPENSES TABLE */
              <>
                <div className="overflow-x-auto">
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
                          <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">{e.tanggal}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {e.kategori}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{e.deskripsi}</td>
                          <td className="p-3.5 text-slate-600">{e.metode_bayar}</td>
                          <td className="p-3.5 text-slate-500">{e.pic}</td>
                          <td className="p-3.5 font-mono font-black text-rose-600 text-right whitespace-nowrap">
                            - {formatRupiah(e.nominal)}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
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
                </div>

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
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-semibold px-2">{page} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* UNIFIED REVENUE TRANSACTIONS TABLE */
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
                        const isVisit = item.kategori === 'Tiket Visit';
                        const isBelanja = item.kategori === 'Belanja / Kafe';
                        const isBoth = item.kategori === 'Tiket Visit & Belanja';
                        const isPt = item.kategori === 'Trainer (PT)';

                        return (
                          <tr key={item.unique_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {item.no_referensi}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isGym 
                                  ? 'bg-[#c5a059]/20 text-[#967434] border border-[#c5a059]/40' 
                                  : isVisit
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                  : isBelanja
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isBoth
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}>
                                {item.kategori}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block leading-tight">{item.pihak_terkait}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.kode_id}</span>
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate" title={item.deskripsi}>
                              {item.deskripsi}
                            </td>

                            <td className="py-3 px-4 font-mono font-black text-emerald-600 text-sm whitespace-nowrap">
                              {formatRupiah(item.nominal)}
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.metode_bayar}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {item.waktu}
                            </td>

                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#967434] hover:bg-[#c5a059]/15 transition"
                                  title="Lihat Rincian Bukti Transaksi"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {(item.kategori.includes('POS') || item.kategori.includes('Visit') || item.kategori.includes('Belanja')) && (
                                  <button
                                    onClick={() => handleDeletePos(item.no_referensi || item.unique_id.replace('POS-', ''), item.no_referensi)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Batalkan & Hapus Transaksi Kasir (Kembalikan Stok Barang)"
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
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-semibold px-2">{page} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
                  <option value="Lainnya">Pengeluaran Lainnya</option>
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
