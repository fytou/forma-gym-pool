import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Dumbbell, Plus, Search, Calendar, 
  CheckCircle2, Clock, X, AlertCircle, RefreshCw, Trash2,
  ChevronLeft, ChevronRight, Archive, Sparkles
} from 'lucide-react';
import { 
  getTrainers, addTrainer, getTrainerMembers, registerTrainerMember, 
  checkinTrainerSession, getTrainerSessions, getMembers, renewTrainerMember, 
  deleteTrainerMember 
} from '../utils/api';

export default function TrainerView() {
  const [activeTab, setActiveTab] = useState('active_members'); // 'active_members', 'finished_members', 'trainers', 'sessions'
  const [trainers, setTrainers] = useState([]);
  const [trainerMembers, setTrainerMembers] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Sessions log with pagination & search (1-10 per page)
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionLimit] = useState(10);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Register PT Member Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    member_id: '',
    id_trainer: '',
    nama_paket_pt: '10 Sesi PT Personal Strength',
    total_sesi: 10,
    biaya: 1200000,
    catatan: ''
  });

  // Checkin Session Modal
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedPTMember, setSelectedPTMember] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    topik_latihan: 'Latihan Beban (Chest & Triceps)',
    catatan_trainer: ''
  });

  // Renew / Tambah Sesi Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewForm, setRenewForm] = useState({
    tambah_sesi: 10,
    biaya: 1200000,
    nama_paket_pt: '10 Sesi PT Personal Strength',
    catatan: ''
  });

  // Add Trainer Modal
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);
  const [trainerForm, setTrainerForm] = useState({
    nama_trainer: '',
    no_hp: '',
    spesialisasi: 'Fitness & Strength',
    foto: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions(sessionPage, sessionSearch);
    }
  }, [activeTab, sessionPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, tmRes, mRes] = await Promise.all([
        getTrainers(),
        getTrainerMembers({ limit: 500 }),
        getMembers()
      ]);
      if (tRes.success) setTrainers(tRes.data || []);
      if (tmRes.success) setTrainerMembers(tmRes.data || []);
      if (mRes.success) setMembersList(mRes.data || []);
      
      // Also fetch sessions count
      const sRes = await getTrainerSessions({ page: 1, limit: 10 });
      if (sRes.success) {
        setSessions(sRes.data || []);
        setSessionTotal(sRes.total || 0);
        setSessionTotalPages(sRes.total_pages || 1);
      }
    } catch (e) {
      console.error('Error loading trainer data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (page = 1, search = '') => {
    setSessionLoading(true);
    try {
      const res = await getTrainerSessions({ page, limit: sessionLimit, search });
      if (res.success) {
        setSessions(res.data || []);
        setSessionTotal(res.total || 0);
        setSessionTotalPages(res.total_pages || 1);
        setSessionPage(res.page || 1);
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSessionSearchSubmit = (e) => {
    e.preventDefault();
    setSessionPage(1);
    loadSessions(1, sessionSearch);
  };

  const handleRegisterPT = async (e) => {
    e.preventDefault();
    try {
      const res = await registerTrainerMember(regForm);
      if (res.success) {
        setShowRegisterModal(false);
        setRegForm({
          member_id: '',
          id_trainer: '',
          nama_paket_pt: '10 Sesi PT Personal Strength',
          total_sesi: 10,
          biaya: 1200000,
          catatan: ''
        });
        alert(res.message);
        loadData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal mendaftarkan member PT');
    }
  };

  const handleCheckinSession = async (e) => {
    e.preventDefault();
    if (!selectedPTMember) return;
    try {
      const res = await checkinTrainerSession({
        id_pt_member: selectedPTMember.id_pt_member,
        topik_latihan: sessionForm.topik_latihan,
        catatan_trainer: sessionForm.catatan_trainer
      });
      if (res.success) {
        setShowCheckinModal(false);
        setSelectedPTMember(null);
        alert(res.message);
        loadData();
        if (activeTab === 'sessions') {
          loadSessions(1, sessionSearch);
        }
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal checkin sesi');
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewTarget) return;
    try {
      const res = await renewTrainerMember(renewTarget.id_pt_member, renewForm);
      if (res.success) {
        setShowRenewModal(false);
        setRenewTarget(null);
        alert(res.message);
        loadData();
      } else {
        alert(res.message || 'Gagal menambah sesi');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menambah sesi');
    }
  };

  const handleDeletePT = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus data Personal Trainer untuk ${name}?`)) return;
    try {
      const res = await deleteTrainerMember(id);
      if (res.success) {
        alert('Data member PT berhasil dihapus');
        loadData();
      } else {
        alert(res.message || 'Gagal menghapus data member PT');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus data');
    }
  };

  const handleAddTrainer = async (e) => {
    e.preventDefault();
    try {
      const res = await addTrainer(trainerForm);
      if (res.success) {
        setShowAddTrainerModal(false);
        setTrainerForm({ nama_trainer: '', no_hp: '', spesialisasi: 'Fitness & Strength', foto: '' });
        alert('Trainer baru berhasil ditambahkan');
        loadData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal menambah trainer');
    }
  };

  // Separation: Active Members (sesi_tersisa > 0 && status === 'Aktif') vs Finished Members (sesi_tersisa <= 0 || status === 'Selesai')
  const activeMembersList = trainerMembers.filter(m => (m.sesi_tersisa > 0) && (m.status === 'Aktif'));
  const finishedMembersList = trainerMembers.filter(m => (m.sesi_tersisa <= 0) || (m.status === 'Selesai'));

  const filterMember = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(m => 
      m.nama_member?.toLowerCase().includes(q) ||
      m.member_id?.toLowerCase().includes(q) ||
      m.nama_trainer?.toLowerCase().includes(q) ||
      m.nama_paket_pt?.toLowerCase().includes(q)
    );
  };

  const filteredActiveMembers = filterMember(activeMembersList);
  const filteredFinishedMembers = filterMember(finishedMembersList);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2">
            <Dumbbell className="w-6 h-6 text-[#c5a059]" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">Trainer & Personal Training (PT)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mendata member yang memakai trainer, kuota sesi, check-in pemotongan sesi, & arsip selesai
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddTrainerModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            <span>Tambah Trainer</span>
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 text-xs font-black rounded-xl shadow-md shadow-[#c5a059]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Daftar Member PT</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Rapi & Terpisah Sesi Aktif vs Selesai) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active_members')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'active_members'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Member PT Aktif</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'active_members' ? 'bg-[#c5a059] text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
          }`}>
            {activeMembersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('finished_members')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'finished_members'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Sesi Selesai / Habis</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'finished_members' ? 'bg-[#c5a059] text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
          }`}>
            {finishedMembersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trainers')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'trainers'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Master Trainer</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'trainers' ? 'bg-[#c5a059] text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
          }`}>
            {trainers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === 'sessions'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Riwayat Log Sesi (1-10)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'sessions' ? 'bg-[#c5a059] text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
          }`}>
            {sessionTotal}
          </span>
        </button>
      </div>

      {/* TAB 1: MEMBER PT AKTIF (HANYA YANG SESI TERSISA > 0) */}
      {activeTab === 'active_members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center shadow-sm">
            <Search className="w-4 h-4 text-slate-400 ml-2 mr-3" />
            <input
              type="text"
              placeholder="Cari member aktif, ID, atau nama trainer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActiveMembers.map((tm) => {
              const progress = Math.min(100, Math.round(((tm.total_sesi - tm.sesi_tersisa) / tm.total_sesi) * 100));

              return (
                <div key={tm.id_pt_member} className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-[#c5a059] shadow-sm flex flex-col justify-between transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {tm.member_id}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-sm leading-tight">{tm.nama_member}</h3>
                    <p className="text-xs text-[#c5a059] font-bold mt-0.5">Trainer: {tm.nama_trainer}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{tm.nama_paket_pt}</p>

                    {/* Progress Bar Sesi */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-xs mb-1 font-semibold">
                        <span className="text-slate-500">Sisa Kuota:</span>
                        <span className="text-emerald-700 font-mono font-black">{tm.sesi_tersisa} / {tm.total_sesi} Sesi</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#c5a059] rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                        <span>Terpakai: {tm.total_sesi - tm.sesi_tersisa} Sesi</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">Daftar: {tm.tanggal_daftar}</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeletePT(tm.id_pt_member, tm.nama_member)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus / Batalkan PT"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPTMember(tm);
                          setShowCheckinModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1 shadow-sm active:scale-95"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Check-In Sesi</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredActiveMembers.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm">Tidak ada member PT yang aktif</p>
              <p className="text-xs mt-1">Daftarkan member baru atau periksa tab Sesi Selesai / Habis</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESI SELESAI / HABIS (ARSIP & BISA DIPERPANJANG / DIHAPUS) */}
      {activeTab === 'finished_members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center shadow-sm">
            <Search className="w-4 h-4 text-slate-400 ml-2 mr-3" />
            <input
              type="text"
              placeholder="Cari member yang sesinya sudah habis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFinishedMembers.map((tm) => (
              <div key={tm.id_pt_member} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between opacity-95">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {tm.member_id}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      SESI HABIS
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm">{tm.nama_member}</h3>
                  <p className="text-xs text-[#c5a059] font-bold mt-0.5">Trainer: {tm.nama_trainer}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{tm.nama_paket_pt}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-xl">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Status Kuota:</span>
                      <span className="font-mono text-rose-600">0 / {tm.total_sesi} Sesi (Selesai)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Member telah menyelesaikan seluruh sesi latihan. Klik tombol di bawah untuk menambah sesi baru.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeletePT(tm.id_pt_member, tm.nama_member)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus / Bersihkan Data Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenewTarget(tm);
                      setRenewForm({
                        tambah_sesi: 10,
                        biaya: 1200000,
                        nama_paket_pt: tm.nama_paket_pt || '10 Sesi PT Personal Strength',
                        catatan: ''
                      });
                      setShowRenewModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1 shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Perpanjang / Tambah Sesi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredFinishedMembers.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
              <p className="font-bold text-sm">Tidak ada sesi yang habis</p>
              <p className="text-xs mt-1">Semua member PT saat ini masih memiliki kuota sesi aktif</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MASTER TRAINERS */}
      {activeTab === 'trainers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <div key={t.id_trainer} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
              <img
                src={t.foto || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200'}
                alt={t.nama_trainer}
                className="w-16 h-16 rounded-xl object-cover border border-[#c5a059]"
              />
              <div>
                <h3 className="font-black text-slate-900 text-sm">{t.nama_trainer}</h3>
                <p className="text-xs text-[#c5a059] font-bold">{t.spesialisasi}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t.no_hp || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: RIWAYAT LOG SESI (PAGINATION 1-10 PER PAGE) */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Search bar & info */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSessionSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari member, ID, nama trainer, atau topik latihan..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full pl-9 pr-20 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-[#dfc185] rounded-lg text-xs font-bold"
              >
                Cari
              </button>
            </form>

            <div className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 whitespace-nowrap">
              Total Log: <strong className="text-slate-900 font-mono">{sessionTotal}</strong> Sesi
            </div>
          </div>

          {/* Table (1-10 Rows) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 text-center w-14">No.</th>
                    <th className="p-3.5">Tanggal & Waktu</th>
                    <th className="p-3.5">Nama Member</th>
                    <th className="p-3.5">Trainer</th>
                    <th className="p-3.5">Topik / Program Latihan</th>
                    <th className="p-3.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionLoading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-[#c5a059]" />
                        <span>Memuat data log sesi...</span>
                      </td>
                    </tr>
                  ) : sessions.length > 0 ? (
                    sessions.map((s, idx) => {
                      const rowNum = (sessionPage - 1) * sessionLimit + idx + 1;
                      return (
                        <tr key={s.id_sesi} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 text-center font-mono font-bold text-slate-500">
                            {rowNum}
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{s.tanggal}</span>
                            <span className="text-slate-400 ml-1.5 font-medium">({s.jam_sesi})</span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{s.nama_member}</div>
                            <span className="font-mono text-[10px] text-slate-400">{s.member_id}</span>
                          </td>
                          <td className="p-3.5 font-bold text-[#c5a059] whitespace-nowrap">
                            {s.nama_trainer}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                              {s.topik_latihan || 'Latihan Rutin'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                            {s.catatan_trainer || '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        Belum ada catatan log sesi latihan yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (1-10 Pages) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Menampilkan {sessionTotal === 0 ? 0 : (sessionPage - 1) * sessionLimit + 1} - {Math.min(sessionPage * sessionLimit, sessionTotal)} dari {sessionTotal} log sesi
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={sessionPage <= 1 || sessionLoading}
                  onClick={() => setSessionPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-bold text-slate-700 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {Array.from({ length: sessionTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === sessionTotalPages || Math.abs(p - sessionPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && (
                          <span className="px-1 text-slate-400">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSessionPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition font-mono ${
                            sessionPage === p
                              ? 'bg-slate-900 text-[#dfc185] shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={sessionPage >= sessionTotalPages || sessionLoading}
                  onClick={() => setSessionPage(prev => Math.min(sessionTotalPages, prev + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-bold text-slate-700 flex items-center space-x-1"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECKIN POTONG SESI PT */}
      {showCheckinModal && selectedPTMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Check-In Sesi Latihan PT</h3>
              <button onClick={() => setShowCheckinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedPTMember.nama_member} ({selectedPTMember.member_id})</div>
              <div className="text-slate-500">Trainer: <strong className="text-[#c5a059]">{selectedPTMember.nama_trainer}</strong></div>
              <div className="text-slate-500">
                Sisa Kuota: <strong className="text-emerald-700">{selectedPTMember.sesi_tersisa} Sesi</strong>
              </div>
            </div>

            <form onSubmit={handleCheckinSession} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Topik / Program Latihan Hari Ini</label>
                <input
                  type="text"
                  required
                  value={sessionForm.topik_latihan}
                  onChange={(e) => setSessionForm({ ...sessionForm, topik_latihan: e.target.value })}
                  placeholder="Contoh: Chest & Triceps, Leg Day, Kardio Renang"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Trainer (Opsional)</label>
                <textarea
                  rows="2"
                  value={sessionForm.catatan_trainer}
                  onChange={(e) => setSessionForm({ ...sessionForm, catatan_trainer: e.target.value })}
                  placeholder="Catatan perkembangan atau beban latihan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                ></textarea>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black shadow"
                >
                  Konfirmasi Potong 1 Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERPANJANG / TAMBAH KUOTA SESI PT */}
      {showRenewModal && renewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Tambah / Perpanjang Sesi PT</h3>
              <button onClick={() => setShowRenewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900">{renewTarget.nama_member} ({renewTarget.member_id})</div>
              <div className="text-slate-500">Trainer: <strong className="text-[#c5a059]">{renewTarget.nama_trainer}</strong></div>
              <div className="text-slate-500">Sisa Kuota Saat Ini: <strong>{renewTarget.sesi_tersisa} Sesi</strong></div>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tambah Berapa Sesi</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={renewForm.tambah_sesi}
                    onChange={(e) => setRenewForm({ ...renewForm, tambah_sesi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Biaya Tambahan (Rp)</label>
                  <input
                    type="number"
                    value={renewForm.biaya}
                    onChange={(e) => setRenewForm({ ...renewForm, biaya: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Paket PT</label>
                <input
                  type="text"
                  value={renewForm.nama_paket_pt}
                  onChange={(e) => setRenewForm({ ...renewForm, nama_paket_pt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  value={renewForm.catatan}
                  onChange={(e) => setRenewForm({ ...renewForm, catatan: e.target.value })}
                  placeholder="Catatan tambahan perpanjangan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black shadow"
                >
                  Simpan Tambah Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DAFTAR MEMBER PT BARU */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Daftar Paket Personal Trainer</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPT} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Member Gym</label>
                <select
                  required
                  value={regForm.member_id}
                  onChange={(e) => setRegForm({ ...regForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="">-- Pilih Member Terdaftar --</option>
                  {membersList.map((m) => (
                    <option key={m.id_member} value={m.id_member}>
                      {m.nama} — ({m.id_member})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Trainer</label>
                <select
                  required
                  value={regForm.id_trainer}
                  onChange={(e) => setRegForm({ ...regForm, id_trainer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- Pilih Personal Trainer --</option>
                  {trainers.map((t) => (
                    <option key={t.id_trainer} value={t.id_trainer}>
                      {t.nama_trainer} ({t.spesialisasi})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Sesi</label>
                  <input
                    type="number"
                    required
                    value={regForm.total_sesi}
                    onChange={(e) => setRegForm({ ...regForm, total_sesi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Biaya Paket (Rp)</label>
                  <input
                    type="number"
                    required
                    value={regForm.biaya}
                    onChange={(e) => setRegForm({ ...regForm, biaya: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Paket PT</label>
                <input
                  type="text"
                  value={regForm.nama_paket_pt}
                  onChange={(e) => setRegForm({ ...regForm, nama_paket_pt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black shadow"
                >
                  Simpan Pendaftaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH TRAINER */}
      {showAddTrainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Tambah Master Trainer</h3>
              <button onClick={() => setShowAddTrainerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrainer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Trainer</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Coach Randy Kurniawan"
                  value={trainerForm.nama_trainer}
                  onChange={(e) => setTrainerForm({ ...trainerForm, nama_trainer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={trainerForm.no_hp}
                  onChange={(e) => setTrainerForm({ ...trainerForm, no_hp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Spesialisasi</label>
                <input
                  type="text"
                  placeholder="Contoh: Bodybuilding, Fat Loss, Renang"
                  value={trainerForm.spesialisasi}
                  onChange={(e) => setTrainerForm({ ...trainerForm, spesialisasi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrainerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] text-slate-950 font-black shadow"
                >
                  Simpan Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
