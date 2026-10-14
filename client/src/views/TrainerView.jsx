import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Dumbbell, Plus, Search, Calendar, 
  CheckCircle2, Clock, X, AlertCircle
} from 'lucide-react';
import { getTrainers, addTrainer, getTrainerMembers, registerTrainerMember, checkinTrainerSession, getTrainerSessions } from '../utils/api';

export default function TrainerView() {
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'trainers', 'sessions'
  const [trainers, setTrainers] = useState([]);
  const [trainerMembers, setTrainerMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const loadData = async () => {
    try {
      const [tRes, tmRes, sRes] = await Promise.all([
        getTrainers(),
        getTrainerMembers(),
        getTrainerSessions()
      ]);
      if (tRes.success) setTrainers(tRes.data);
      if (tmRes.success) setTrainerMembers(tmRes.data);
      if (sRes.success) setSessions(sRes.data);
    } catch (e) {
      console.error(e);
    }
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
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal checkin sesi');
    }
  };

  const handleAddTrainer = async (e) => {
    e.preventDefault();
    try {
      const res = await addTrainer(trainerForm);
      if (res.success) {
        setShowAddTrainerModal(false);
        setTrainerForm({ nama_trainer: '', no_hp: '', spesialisasi: 'Fitness & Strength', foto: '' });
        loadData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal menambah trainer');
    }
  };

  const filteredMembers = trainerMembers.filter(m => 
    m.nama_member?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.member_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.nama_trainer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Mendata member yang memakai trainer, kuota sesi, dan check-in pemotongan sesi PT
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

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'members'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Member PT Aktif ({trainerMembers.filter(m => m.status === 'Aktif').length})
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'trainers'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Master Trainer ({trainers.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'sessions'
              ? 'bg-slate-900 text-[#dfc185] shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Riwayat Latihan / Sesi ({sessions.length})
        </button>
      </div>

      {/* TAB 1: MEMBER PT LIST */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center">
            <Search className="w-4 h-4 text-slate-400 ml-2 mr-3" />
            <input
              type="text"
              placeholder="Cari nama member, ID, atau trainer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((tm) => {
              const progress = Math.round(((tm.total_sesi - tm.sesi_tersisa) / tm.total_sesi) * 100);
              const isFinished = tm.sesi_tersisa <= 0;

              return (
                <div key={tm.id_pt_member} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {tm.member_id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isFinished ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isFinished ? 'Sesi Habis' : 'Aktif'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-sm">{tm.nama_member}</h3>
                    <p className="text-xs text-[#c5a059] font-bold mt-0.5">Trainer: {tm.nama_trainer}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{tm.nama_paket_pt}</p>

                    {/* Session Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-xs mb-1 font-semibold">
                        <span className="text-slate-500">Sisa Kuota:</span>
                        <span className="text-slate-900 font-mono font-black">{tm.sesi_tersisa} / {tm.total_sesi} Sesi</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#c5a059] rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Daftar: {tm.tanggal_daftar}</span>
                    <button
                      type="button"
                      disabled={isFinished}
                      onClick={() => {
                        setSelectedPTMember(tm);
                        setShowCheckinModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#b89047] disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Check-In Sesi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm">Belum ada member PT terdaftar</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MASTER TRAINERS */}
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

      {/* TAB 3: RIWAYAT SESI */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Tanggal & Jam</th>
                <th className="p-3.5">Member</th>
                <th className="p-3.5">Trainer</th>
                <th className="p-3.5">Topik Latihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id_sesi} className="hover:bg-slate-50/60">
                  <td className="p-3.5 font-mono text-slate-700">
                    {s.tanggal} <span className="text-slate-400">({s.jam_sesi})</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{s.nama_member}</td>
                  <td className="p-3.5 font-bold text-[#c5a059]">{s.nama_trainer}</td>
                  <td className="p-3.5 text-slate-600">{s.topik_latihan || 'Latihan Rutin'}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400">Belum ada catatan log sesi latihan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CHECKIN POTONG SESI PT */}
      {showCheckinModal && selectedPTMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
              <div className="text-slate-500">Sisa Kuota: <strong>{selectedPTMember.sesi_tersisa} Sesi</strong></div>
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
                  placeholder="Evaluasi performa beban atau repetisi member..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
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

      {/* MODAL DAFTAR MEMBER PT BARU */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Daftar Paket Personal Trainer</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPT} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ID Member Gym</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MEM-000101 atau FM-2026-00112"
                  value={regForm.member_id}
                  onChange={(e) => setRegForm({ ...regForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-[#c5a059]"
                />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
