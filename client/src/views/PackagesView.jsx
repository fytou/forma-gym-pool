import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Dumbbell, 
  Waves, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { getPackages, createPackage, updatePackage, deletePackage, formatRupiah } from '../utils/api';

export default function PackagesView() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);

  // Form states
  const [namaPaket, setNamaPaket] = useState('');
  const [harga, setHarga] = useState('');
  const [durasi, setDurasi] = useState('30');
  const [durasiLabel, setDurasiLabel] = useState('1 Bulan (30 Hari)');
  const [fasilitas, setFasilitas] = useState('Gym');
  const [deskripsi, setDeskripsi] = useState('');
  const [error, setError] = useState('');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await getPackages();
      if (res.success) {
        setPackages(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openAddModal = () => {
    setEditingPkg(null);
    setNamaPaket('');
    setHarga('');
    setDurasi('30');
    setDurasiLabel('1 Bulan (30 Hari)');
    setFasilitas('Gym');
    setDeskripsi('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (pkg) => {
    setEditingPkg(pkg);
    setNamaPaket(pkg.nama_paket);
    setHarga(String(pkg.harga));
    setDurasi(String(pkg.durasi));
    setDurasiLabel(pkg.durasi_label);
    setFasilitas(pkg.fasilitas);
    setDeskripsi(pkg.deskripsi || '');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!namaPaket || !harga || !durasi || !fasilitas) {
      setError('Mohon lengkapi semua field utama');
      return;
    }

    try {
      const payload = {
        nama_paket: namaPaket.trim(),
        harga: Number(harga),
        durasi: Number(durasi),
        durasi_label: durasiLabel.trim() || `${durasi} Hari`,
        fasilitas,
        deskripsi: deskripsi.trim()
      };

      if (editingPkg) {
        await updatePackage(editingPkg.id_paket, payload);
      } else {
        await createPackage(payload);
      }

      setShowModal(false);
      fetchPackages();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Nonaktifkan paket "${nama}"?`)) return;
    try {
      await deletePackage(id);
      fetchPackages();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Paket Keanggotaan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pilihan paket membership, harga, durasi, dan hak akses fasilitas gym/pool
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Paket Baru</span>
        </button>
      </div>

      {/* Access Rule Matrix Explainer */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm">Aturan Validasi Hak Akses Fasilitas (PRD)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Sistem secara otomatis memverifikasi akses setiap kali member melakukan scan di pintu gym atau pool sesuai paketnya:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="font-bold text-slate-200 block">Paket GYM ONLY</span>
            <div className="mt-2 space-y-1 text-slate-400">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" /> <span>Pintu Gym: Diberikan Akses</span>
              </div>
              <div className="flex items-center space-x-1.5 text-rose-400">
                <X className="w-3.5 h-3.5" /> <span>Pintu Pool: Ditolak</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="font-bold text-slate-200 block">Paket POOL ONLY</span>
            <div className="mt-2 space-y-1 text-slate-400">
              <div className="flex items-center space-x-1.5 text-rose-400">
                <X className="w-3.5 h-3.5" /> <span>Pintu Gym: Ditolak</span>
              </div>
              <div className="flex items-center space-x-1.5 text-blue-400">
                <Check className="w-3.5 h-3.5" /> <span>Pintu Pool: Diberikan Akses</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="font-bold text-slate-200 block">Paket GYM + POOL (COMBO)</span>
            <div className="mt-2 space-y-1 text-slate-400">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" /> <span>Pintu Gym: Diberikan Akses</span>
              </div>
              <div className="flex items-center space-x-1.5 text-blue-400">
                <Check className="w-3.5 h-3.5" /> <span>Pintu Pool: Diberikan Akses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => {
          const isGymPool = pkg.fasilitas === 'Gym+Pool';
          const isPool = pkg.fasilitas === 'Pool';
          return (
            <div
              key={pkg.id_paket}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1 ${
                    isGymPool ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    isPool ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-800 border border-slate-300'
                  }`}>
                    {isGymPool ? <><Dumbbell className="w-3 h-3" /><span>+</span><Waves className="w-3 h-3" /></> :
                     isPool ? <Waves className="w-3.5 h-3.5" /> : <Dumbbell className="w-3.5 h-3.5" />}
                    <span className="ml-1 uppercase">{pkg.fasilitas}</span>
                  </span>

                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    {pkg.durasi} Hari
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 tracking-tight">{pkg.nama_paket}</h3>
                <p className="text-xs text-slate-500 mt-1">{pkg.durasi_label}</p>

                <div className="my-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400 block">Harga Membership:</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                    {formatRupiah(pkg.harga)}
                  </span>
                </div>

                {pkg.deskripsi && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {pkg.deskripsi}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => openEditModal(pkg)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition text-xs font-semibold flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Ubah</span>
                </button>
                <button
                  onClick={() => handleDelete(pkg.id_paket, pkg.nama_paket)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <h3 className="font-bold text-base">
                {editingPkg ? 'Ubah Paket Membership' : 'Tambah Paket Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Paket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaPaket}
                  onChange={(e) => setNamaPaket(e.target.value)}
                  placeholder="Contoh: Monthly Gym + Pool"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={harga}
                    onChange={(e) => setHarga(e.target.value)}
                    placeholder="250000"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Durasi (Hari) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={durasi}
                    onChange={(e) => {
                      setDurasi(e.target.value);
                      setDurasiLabel(`${e.target.value} Hari`);
                    }}
                    placeholder="30"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Label Durasi
                </label>
                <input
                  type="text"
                  value={durasiLabel}
                  onChange={(e) => setDurasiLabel(e.target.value)}
                  placeholder="Contoh: 1 Bulan (30 Hari)"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Akses Fasilitas <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Gym', 'Pool', 'Gym+Pool'].map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setFasilitas(f)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                        fasilitas === f
                          ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-sm'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Contoh: Akses bebas fitness dan gym setiap hari"
                  rows={2}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-md transition"
                >
                  {editingPkg ? 'Simpan Perubahan' : 'Tambah Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
