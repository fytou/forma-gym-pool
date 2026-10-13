import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Trash2, Key, CheckCircle2, 
  AlertCircle, RefreshCw, Lock, Sparkles, CreditCard
} from 'lucide-react';
import { getUsers, addUser, deleteUser, formatDateIndo } from '../utils/api';

export default function UsersView() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [role, setRole] = useState('kasir');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      if (res.success && res.data) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || !namaLengkap.trim()) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await addUser({
        username: username.trim(),
        password,
        nama_lengkap: namaLengkap.trim(),
        role
      });

      if (res.success) {
        setSuccessMsg(`Akun kasir/admin "${username}" berhasil dibuat!`);
        setUsername('');
        setPassword('');
        setNamaLengkap('');
        setRole('kasir');
        setShowAddModal(false);
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message || 'Gagal menambahkan akun.');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.role === 'superadmin' && user.username === 'superadmin') {
      alert('Akun Superadmin utama tidak dapat dihapus.');
      return;
    }

    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus akun "${user.nama_lengkap}" (@${user.username})?`);
    if (!confirmDelete) return;

    try {
      const res = await deleteUser(user.id_user);
      if (res.success) {
        setSuccessMsg(res.message || 'Akun berhasil dihapus.');
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert(res.message || 'Gagal menghapus user.');
      }
    } catch (err) {
      alert('Gagal menghapus akun.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#c5a059] mb-1">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-bold tracking-widest uppercase">Kelola Akun Akses Kasir & Staf</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Manajemen Akun Staf & Front Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Sebagai Superadmin, Anda dapat membuatkan username & password khusus untuk setiap kasir atau staf front desk baru yang bertugas.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#c5a059] text-slate-950 hover:bg-[#b89047] active:scale-95 transition shadow-lg shadow-[#c5a059]/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Kasir Baru</span>
        </button>
      </div>

      {/* Toast Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-800">Daftar Akun Kasir & Admin Terdaftar</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#c5a059]/15 text-[#967434] border border-[#c5a059]/30">
              {usersList.length} Akun
            </span>
          </div>

          <button
            onClick={fetchUsers}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#c5a059]" />
            Memuat daftar pengguna...
          </div>
        ) : usersList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Belum ada akun kasir terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Nama Lengkap Staf</th>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Peran / Role</th>
                  <th className="px-6 py-3">Tanggal Dibuat</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => {
                  const isSuper = u.role === 'superadmin';
                  return (
                    <tr key={u.id_user} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            isSuper 
                              ? 'bg-[#c5a059] text-slate-950' 
                              : 'bg-slate-800 text-amber-200'
                          }`}>
                            {isSuper ? <Shield className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.nama_lengkap}</div>
                            <div className="text-[11px] text-slate-400">ID User: #{u.id_user}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-bold text-slate-800">
                          @{u.username}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isSuper
                            ? 'bg-[#c5a059]/15 text-[#967434] border-[#c5a059]/40'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          <span>{isSuper ? '👑 Super Administrator' : '💳 Kasir / Front Desk'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {u.created_at || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.username === 'superadmin' ? (
                          <span className="text-[10px] text-slate-400 italic">Akun Utama</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Akun Kasir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah User / Kasir Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#121318] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-bold text-base text-white">Buatkan Akun Kasir Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Nama Lengkap Kasir */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Nama Lengkap Kasir / Staf
                </label>
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Rian Anggara"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              {/* Username Login */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Username untuk Login
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: rian / kasir2"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#c5a059] font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Username otomatis huruf kecil tanpa spasi.</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Password Login
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tentukan kata sandi kasir"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Peran / Hak Akses
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="kasir">💳 Kasir / Front Desk (Check-in, Daftar, Cetak Kartu)</option>
                  <option value="superadmin">👑 Super Administrator (Akses Penuh + Kelola Paket & Transaksi)</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#c5a059] text-slate-950 hover:bg-[#b89047] transition shadow-md shadow-[#c5a059]/20 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
