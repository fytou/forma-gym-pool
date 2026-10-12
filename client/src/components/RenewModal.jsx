import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Calendar, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatDateIndo, renewMember, getPackages } from '../utils/api';

export default function RenewModal({ member, onClose, onSuccess }) {
  const [packages, setPackages] = useState([]);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await getPackages();
        if (res.success && res.data.length > 0) {
          setPackages(res.data);
          // Default to member's current package if exists, or first package
          const currId = member.membership?.paket_id || res.data[0].id_paket;
          setSelectedPkgId(currId);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPackages();

    // Default start date calculation:
    // If current membership active, start day after expiration.
    // If expired, start today.
    const todayStr = new Date().toISOString().split('T')[0];
    if (member.membership?.tanggal_berakhir && member.membership.tanggal_berakhir >= todayStr) {
      const nextDay = new Date(member.membership.tanggal_berakhir);
      nextDay.setDate(nextDay.getDate() + 1);
      setStartDate(nextDay.toISOString().split('T')[0]);
    } else {
      setStartDate(todayStr);
    }
  }, [member]);

  const selectedPackage = packages.find(p => p.id_paket === Number(selectedPkgId));

  // Compute calculated end date
  let calculatedEndDate = '';
  if (startDate && selectedPackage) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + Number(selectedPackage.durasi));
    calculatedEndDate = end.toISOString().split('T')[0];
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPkgId) {
      setError('Silakan pilih paket membership');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await renewMember(member.id_member, {
        paket_id: Number(selectedPkgId),
        tanggal_mulai: startDate,
        metode_bayar: paymentMethod
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setError(res.message || 'Gagal memperpanjang membership');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <RefreshCw className="w-5 h-5 text-[#dfc185]" />
            <div>
              <h3 className="font-bold text-base">Perpanjangan Membership</h3>
              <p className="text-xs text-slate-400">Perpanjang masa aktif keanggotaan member</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Preview Card */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center space-x-3.5">
          <img
            src={member.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
            alt={member.nama}
            className="w-12 h-12 rounded-xl object-cover border border-slate-300"
          />
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{member.nama}</h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="font-mono font-medium text-slate-700">{member.id_member}</span>
              <span>•</span>
              <span>{member.no_hp}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Status saat ini: <strong className={member.status === 'Active' ? 'text-[#b89047]' : 'text-rose-600'}>
                {member.status === 'Active' ? `Aktif (${member.sisa_hari} hari lagi)` : 'Sudah Berakhir'}
              </strong>
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pilih Paket */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Paket Membership Baru
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {packages.map((pkg) => {
                const isSelected = Number(selectedPkgId) === pkg.id_paket;
                return (
                  <div
                    key={pkg.id_paket}
                    onClick={() => setSelectedPkgId(pkg.id_paket)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-[#c5a059] bg-[#c5a059]/10 shadow-sm ring-1 ring-[#c5a059]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{pkg.nama_paket}</span>
                        <span className="text-[10px] px-1.5 py-0.5 font-bold rounded bg-slate-100 text-slate-600 uppercase">
                          {pkg.fasilitas}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pkg.durasi_label}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[#967434] font-mono">
                        {formatRupiah(pkg.harga)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tanggal Mulai & Periode Baru */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Mulai Baru
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#c5a059] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Berakhir Pada (Auto)
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                {calculatedEndDate ? formatDateIndo(calculatedEndDate) : '-'}
              </div>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Tunai', 'Transfer Bank', 'QRIS Manual'].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    paymentMethod === m
                      ? 'border-[#c5a059] bg-[#c5a059] text-slate-950 font-bold shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          {selectedPackage && (
            <div className="p-3 bg-[#c5a059]/15 rounded-xl border border-[#c5a059]/40 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-600">Total Pembayaran:</span>
                <p className="font-extrabold text-base text-[#967434] font-mono">
                  {formatRupiah(selectedPackage.harga)}
                </p>
              </div>
              <div className="text-right text-[11px] text-[#967434] font-medium">
                Aktif {selectedPackage.durasi} Hari ke depan
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPackage}
              className="flex-1 py-2.5 text-xs font-black text-slate-950 bg-[#c5a059] hover:bg-[#b89047] rounded-xl shadow-md shadow-[#c5a059]/25 transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Konfirmasi Perpanjangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
