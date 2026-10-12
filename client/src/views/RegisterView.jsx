import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  Camera, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  Dumbbell, 
  Waves, 
  CreditCard,
  Printer,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPackages, registerMember, formatRupiah, formatDateIndo } from '../utils/api';
import MemberCardModal from '../components/MemberCardModal';

export default function RegisterView({ onSuccess }) {
  const [packages, setPackages] = useState([]);
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');

  // Photo handling: webcam snapshot, file upload, or preset
  const [photoType, setPhotoType] = useState('preset'); // 'webcam', 'upload', 'preset'
  const [photoData, setPhotoData] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80');
  const [photoFile, setPhotoFile] = useState(null);
  const [webcamStreaming, setWebcamStreaming] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newlyCreatedMember, setNewlyCreatedMember] = useState(null);
  const [generatedQrImage, setGeneratedQrImage] = useState(null);

  useEffect(() => {
    // Default start date = today
    const todayStr = new Date().toISOString().split('T')[0];
    setStartDate(todayStr);

    async function loadData() {
      try {
        const res = await getPackages();
        if (res.success && res.data.length > 0) {
          setPackages(res.data);
          setSelectedPkgId(res.data[0].id_paket); // Default package
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();

    return () => {
      stopWebcam();
    };
  }, []);

  const selectedPackage = packages.find(p => p.id_paket === Number(selectedPkgId));

  // Compute expiration date preview
  let calculatedEndDate = '';
  if (startDate && selectedPackage) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + Number(selectedPackage.durasi));
    calculatedEndDate = end.toISOString().split('T')[0];
  }

  // Webcam controls
  const startWebcam = async () => {
    setPhotoType('webcam');
    setError('');
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
      } catch (errConstraint) {
        // Fallback to basic video constraint if ideal resolution fails
        console.warn('Fallback to basic video constraint:', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }
      }

      setWebcamStreaming(true);
    } catch (err) {
      console.error('Webcam access error:', err);
      setError('Kamera tidak dapat diakses (izin kamera ditolak atau kamera sedang dipakai aplikasi lain). Silakan izinkan browser atau gunakan upload foto.');
      setPhotoType('preset');
      setWebcamStreaming(false);
    }
  };

  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 320;
    const h = video.videoHeight || 320;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoData(dataUrl);
    setPhotoFile(null);
    stopWebcam();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoData(URL.createObjectURL(file));
      setPhotoType('upload');
      stopWebcam();
    }
  };

  // Avatar presets for ultra fast 10-second member registration
  const avatarPresets = [
    { label: 'Pria 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
    { label: 'Wanita 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80' },
    { label: 'Pria 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
    { label: 'Wanita 2', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !noHp.trim() || !selectedPkgId) {
      setError('Mohon lengkapi nama, nomor HP, dan pilihan paket');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('nama', nama.trim());
      formData.append('no_hp', noHp.trim());
      formData.append('paket_id', selectedPkgId);
      formData.append('tanggal_mulai', startDate);
      formData.append('metode_bayar', paymentMethod);

      if (photoFile) {
        formData.append('foto_file', photoFile);
      } else {
        formData.append('foto_data', photoData);
      }

      const res = await registerMember(formData);

      if (res.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        setNewlyCreatedMember(res.data);
        setGeneratedQrImage(res.qr_image);

        // Reset form
        setNama('');
        setNoHp('');
      } else {
        setError(res.message || 'Gagal mendaftarkan member');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="no-print space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-emerald-600" />
            <span>Pendaftaran Member Baru</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Alur cepat 1 layar: isi data member, pilih paket, catat bayar, dan terbitkan kartu QR (&lt; 2 menit).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          {/* Section 1: Profil Member & Foto */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">1</span>
              <span>Identitas & Foto Member</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Photo selector box */}
              <div className="md:col-span-4 flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-200 mb-3 relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${webcamStreaming ? 'block' : 'hidden'}`}
                  />
                  {!webcamStreaming && (
                    <img src={photoData} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>

                {webcamStreaming ? (
                  <div className="space-y-1.5 w-full">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow"
                    >
                      Ambil Foto (Capture)
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="w-full py-1 px-3 bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={startWebcam}
                        className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Webcam</span>
                      </button>
                      <label className="flex-1 py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center space-x-1 text-center">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>

                    {/* Presets */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 block mb-1">Preset Cepat:</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {avatarPresets.map((p, idx) => (
                          <img
                            key={idx}
                            src={p.url}
                            alt={p.label}
                            onClick={() => { setPhotoData(p.url); setPhotoFile(null); }}
                            className={`w-9 h-9 rounded-lg object-cover cursor-pointer border-2 transition ${
                              photoData === p.url ? 'border-emerald-500 scale-105' : 'border-slate-300 opacity-70 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Identity Form Inputs */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap Member <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Roid Fitrah, Siti Rahma..."
                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Format nomor Indonesia aktif untuk konfirmasi keanggotaan
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Paket Keanggotaan */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">2</span>
              <span>Pilih Paket Keanggotaan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {packages.map((pkg) => {
                const isSelected = Number(selectedPkgId) === pkg.id_paket;
                return (
                  <div
                    key={pkg.id_paket}
                    onClick={() => setSelectedPkgId(pkg.id_paket)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{pkg.nama_paket}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          pkg.fasilitas === 'Gym+Pool' ? 'bg-emerald-100 text-emerald-800' :
                          pkg.fasilitas === 'Pool' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {pkg.fasilitas}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{pkg.durasi_label}</p>
                      {pkg.deskripsi && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{pkg.deskripsi}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {formatRupiah(pkg.harga)}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Periode & Pembayaran */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">3</span>
              <span>Periode Aktif & Pembayaran</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Berakhir Pada (Auto)
                </label>
                <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700">
                  {calculatedEndDate ? formatDateIndo(calculatedEndDate) : '-'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="QRIS Manual">QRIS Manual</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Submit Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-xs text-slate-500">Total Tagihan:</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {selectedPackage ? formatRupiah(selectedPackage.harga) : 'Rp 0'}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedPackage}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>DAFTARKAN & TERBITKAN KARTU QR</span>
              </>
            )}
          </button>
        </div>
      </form>
      </div>

      {/* Instant Print Card Modal popup after success */}
      {newlyCreatedMember && (
        <MemberCardModal
          member={newlyCreatedMember}
          qrImage={generatedQrImage}
          onClose={() => setNewlyCreatedMember(null)}
        />
      )}
    </div>
  );
}
