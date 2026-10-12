import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Dumbbell, 
  Waves, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Camera, 
  CameraOff, 
  LogOut, 
  LogIn, 
  Users, 
  RefreshCw,
  Search,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanCheckin, manualCheckout, getDashboard, formatDateIndo } from '../utils/api';
import { playSuccessSound, playDeniedSound, playCheckoutSound } from '../utils/audio';
import RenewModal from '../components/RenewModal';

export default function CheckInView({ onNavigateToRegister }) {
  // Facility selector: Gym or Pool
  const [selectedFacility, setSelectedFacility] = useState('Gym');
  // Mode: 'auto' (smart check-in or checkout if already inside) | 'masuk' | 'keluar'
  const [mode, setMode] = useState('auto');
  // Barcode / text input
  const [inputCode, setInputCode] = useState('');
  // Loading & error
  const [loading, setLoading] = useState(false);
  // Last scan result
  const [scanResult, setScanResult] = useState(null);
  // Live occupancy list & metrics
  const [occupancy, setOccupancy] = useState({ gym: 0, pool: 0, list: [] });
  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  // Modal renewal
  const [renewingMember, setRenewingMember] = useState(null);
  // Search suggestion / quick picker
  const [recentMembers, setRecentMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Auto-focus barcode input
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    focusInput();
    loadOccupancy();
    loadMemberList();

    // Auto refresh occupancy every 15s
    const timer = setInterval(loadOccupancy, 15000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener: F1 for Gym, F2 for Pool, Escape to clear
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setSelectedFacility('Gym');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setSelectedFacility('Pool');
      } else if (e.key === 'Escape') {
        setScanResult(null);
        setInputCode('');
        focusInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadOccupancy() {
    try {
      const res = await getDashboard();
      if (res.success) {
        setOccupancy({
          gym: res.metrics.occupancy_gym,
          pool: res.metrics.occupancy_pool,
          list: res.occupancy_list || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMemberList() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (data.success) {
        setRecentMembers(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle barcode / keyboard submission
  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;

    await executeScan(inputCode.trim());
    setInputCode('');
    focusInput();
  };

  // Main scan execution
  async function executeScan(code) {
    setLoading(true);
    try {
      const res = await scanCheckin(code, selectedFacility, mode);
      setScanResult(res);

      if (res.status === 'ACCESS_GRANTED') {
        playSuccessSound();
      } else if (res.status === 'CHECKOUT_SUCCESS') {
        playCheckoutSound();
      } else {
        playDeniedSound();
      }

      // Refresh live occupancy
      loadOccupancy();
    } catch (err) {
      setScanResult({
        success: false,
        status: 'ERROR',
        title: 'GAGAL MEMPROSES SCAN',
        message: err.message || 'Koneksi ke server terputus'
      });
      playDeniedSound();
    } finally {
      setLoading(false);
    }
  }

  // Camera QR Scanner Toggle
  const toggleCamera = async () => {
    if (cameraActive) {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.error(e);
        }
      }
      setCameraActive(false);
    } else {
      setCameraActive(true);
      setTimeout(startCameraScanner, 200);
    }
  };

  const startCameraScanner = () => {
    try {
      const qrScanner = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = qrScanner;
      qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Success read QR
          executeScan(decodedText);
          // Optional short cooldown before next read
        },
        (errorMessage) => {
          // ignore frame parse errors
        }
      ).catch((err) => {
        console.error('Camera start error:', err);
        setCameraActive(false);
      });
    } catch (err) {
      console.error('Html5Qrcode init error:', err);
      setCameraActive(false);
    }
  };

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && cameraActive) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [cameraActive]);

  // Manual Check-out for someone in the occupancy list
  const handleQuickCheckout = async (logId, namaMember) => {
    try {
      const res = await manualCheckout(logId);
      if (res.success) {
        playCheckoutSound();
        loadOccupancy();
        setScanResult({
          success: true,
          status: 'CHECKOUT_SUCCESS',
          title: 'CHECK-OUT BERHASIL',
          message: `${namaMember} telah check-out. Durasi kunjungan: ${res.durasi}`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Facility Selector & Shortcuts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Facility toggle */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pintu / Fasilitas:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setSelectedFacility('Gym'); focusInput(); }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                selectedFacility === 'Gym'
                  ? 'bg-slate-900 text-emerald-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Pintu GYM</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">F1</span>
            </button>
            <button
              onClick={() => { setSelectedFacility('Pool'); focusInput(); }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                selectedFacility === 'Pool'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Waves className="w-4 h-4" />
              <span>Pintu POOL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-800 text-blue-200 font-mono">F2</span>
            </button>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Mode Alur:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => { setMode('auto'); focusInput(); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                mode === 'auto'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auto (Masuk/Keluar)
            </button>
            <button
              onClick={() => { setMode('masuk'); focusInput(); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                mode === 'masuk'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khusus Masuk
            </button>
            <button
              onClick={() => { setMode('keluar'); focusInput(); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                mode === 'keluar'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khusus Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Scan Area & Live Occupancy Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fast Scanner & Result Presentation (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scanner Input Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Pemindai QR & Barcode Member
                  </h2>
                  <p className="text-xs text-slate-500">
                    Arahkan scanner kartu atau ketik ID/nama member lalu tekan Enter
                  </p>
                </div>
              </div>

              {/* Toggle camera button */}
              <button
                onClick={toggleCamera}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  cameraActive
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    <span>Tutup Kamera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Aktifkan Webcam</span>
                  </>
                )}
              </button>
            </div>

            {/* Webcam Video Container */}
            {cameraActive && (
              <div className="mb-5 p-3 bg-slate-900 rounded-xl flex flex-col items-center">
                <div id="qr-reader-container" className="w-full max-w-sm rounded-lg overflow-hidden"></div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Arahkan QR Code kartu member ke depan lensa kamera
                </p>
              </div>
            )}

            {/* Scanner Input Form */}
            <form onSubmit={handleScanSubmit} className="relative">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Scan kartu QR / ketik ID (mis: MEM-000101) atau No HP..."
                    className="w-full pl-11 pr-4 py-4 text-base font-medium rounded-xl border-2 border-emerald-500/80 bg-emerald-50/20 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-inner font-mono"
                    autoFocus
                  />
                  <Scan className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="submit"
                  disabled={loading || !inputCode.trim()}
                  className="px-7 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-md shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50 flex items-center space-x-2 flex-shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>PROSES</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Helper Chips for Demo Testing */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center flex-wrap gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Pintasan Cepat Tes:</span>
              <button
                type="button"
                onClick={() => { setInputCode('MEM-000101'); executeScan('MEM-000101'); }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[11px]"
              >
                MEM-000101 (Roid - Gym+Pool)
              </button>
              <button
                type="button"
                onClick={() => { setInputCode('MEM-000102'); executeScan('MEM-000102'); }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[11px]"
              >
                MEM-000102 (Andi - Pool)
              </button>
              <button
                type="button"
                onClick={() => { setInputCode('MEM-000103'); executeScan('MEM-000103'); }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[11px]"
              >
                MEM-000103 (Siti - Gym Soon)
              </button>
              <button
                type="button"
                onClick={() => { setInputCode('MEM-000104'); executeScan('MEM-000104'); }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-rose-700 font-mono text-[11px]"
              >
                MEM-000104 (Budi - Expired)
              </button>
            </div>
          </div>

          {/* RESULTS DISPLAY PANEL - HIGH VISIBILITY & INSTANT CLARITY */}
          {scanResult ? (
            <div className="animate-in fade-in zoom-in-95 duration-150">
              {/* 1. ACCESS GRANTED (HIJAU BESAR) */}
              {scanResult.status === 'ACCESS_GRANTED' && (
                <div className="rounded-2xl border-4 border-emerald-500 bg-emerald-500/10 p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-500/30 pb-5">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div>
                        <span className="text-xs font-black tracking-widest text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          VALIDASI SUKSES
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight mt-1">
                          ACCESS GRANTED
                        </h1>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Pintu Masuk</span>
                      <span className="text-lg font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                        {scanResult.fasilitas} • {scanResult.jam_masuk} WIB
                      </span>
                    </div>
                  </div>

                  {/* Member Details */}
                  {scanResult.member && (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                      <div className="sm:col-span-3 flex justify-center">
                        <img
                          src={scanResult.member.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={scanResult.member.nama}
                          className="w-28 h-28 rounded-2xl object-cover border-4 border-emerald-500 shadow-md"
                        />
                      </div>

                      <div className="sm:col-span-9 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h2 className="text-2xl font-black text-slate-900">
                            {scanResult.member.nama}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono text-xs font-bold">
                            {scanResult.member.id_member}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <span className="text-xs text-slate-500 block">Paket Aktif:</span>
                            <span className="font-bold text-slate-900">{scanResult.paket}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <span className="text-xs text-slate-500 block">Masa Berlaku:</span>
                            <span className="font-bold text-emerald-700">
                              {scanResult.sisa_hari} Hari Lagi
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-emerald-800 font-medium pt-1">
                          ✓ Member berhak mengakses fasilitas {scanResult.fasilitas}. Selamat berolahraga!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reset action */}
                  <div className="mt-5 pt-4 border-t border-emerald-500/30 flex justify-end">
                    <button
                      onClick={() => { setScanResult(null); focusInput(); }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      Scan Member Berikutnya (Esc)
                    </button>
                  </div>
                </div>
              )}

              {/* 2. MEMBERSHIP EXPIRED (MERAH BESAR) */}
              {scanResult.status === 'EXPIRED' && (
                <div className="rounded-2xl border-4 border-rose-500 bg-rose-500/10 p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-rose-500/30 pb-5">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
                        <XCircle className="w-9 h-9" />
                      </div>
                      <div>
                        <span className="text-xs font-black tracking-widest text-rose-700 uppercase bg-rose-100 px-2.5 py-0.5 rounded-full">
                          AKSES DITOLAK
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-rose-700 tracking-tight mt-1">
                          MEMBERSHIP EXPIRED
                        </h1>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-rose-600 font-bold block">{scanResult.reason}</span>
                    </div>
                  </div>

                  {scanResult.member && (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                      <div className="sm:col-span-3 flex justify-center">
                        <img
                          src={scanResult.member.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={scanResult.member.nama}
                          className="w-28 h-28 rounded-2xl object-cover border-4 border-rose-400 grayscale shadow-md"
                        />
                      </div>

                      <div className="sm:col-span-9 space-y-3">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900">
                            {scanResult.member.nama}
                          </h2>
                          <p className="text-xs font-mono text-slate-500">{scanResult.member.id_member} • {scanResult.member.no_hp}</p>
                        </div>

                        <div className="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs text-rose-800">
                          Masa aktif membership member telah berakhir. Front desk dapat langsung memperpanjang paket sekarang untuk membuka akses.
                        </div>

                        {/* Quick action: Renew now */}
                        <div className="flex items-center space-x-3 pt-1">
                          <button
                            onClick={() => setRenewingMember(scanResult.member)}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/30 transition flex items-center space-x-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Perpanjang Membership Sekarang</span>
                          </button>
                          <button
                            onClick={() => { setScanResult(null); focusInput(); }}
                            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                          >
                            Tutup (Esc)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. FACILITY ACCESS DENIED (ORANYE / KUNING) */}
              {scanResult.status === 'FACILITY_DENIED' && (
                <div className="rounded-2xl border-4 border-amber-500 bg-amber-500/10 p-6 shadow-xl">
                  <div className="flex items-center space-x-3.5 border-b border-amber-500/30 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center">
                      <AlertTriangle className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-widest text-amber-800 uppercase bg-amber-100 px-2.5 py-0.5 rounded-full">
                        FASILITAS TIDAK SESUAI
                      </span>
                      <h1 className="text-3xl font-black text-amber-800 mt-1">
                        AKSES DITOLAK
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white/90 rounded-xl border border-amber-200">
                    <p className="text-sm font-semibold text-slate-900">
                      {scanResult.message}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Member memiliki paket yang aktif, namun paket tersebut tidak mengizinkan akses ke fasilitas <strong className="text-amber-800">{scanResult.fasilitas}</strong>.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={() => setRenewingMember(scanResult.member)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
                    >
                      Upgrade ke Paket Gym+Pool
                    </button>
                    <button
                      onClick={() => { setScanResult(null); focusInput(); }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                    >
                      Tutup (Esc)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. CHECKOUT SUCCESS (BIRU BESAR) */}
              {scanResult.status === 'CHECKOUT_SUCCESS' && (
                <div className="rounded-2xl border-4 border-blue-500 bg-blue-500/10 p-6 shadow-xl">
                  <div className="flex items-center space-x-3.5 border-b border-blue-500/30 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                      <LogOut className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-widest text-blue-700 uppercase bg-blue-100 px-2.5 py-0.5 rounded-full">
                        STATUS: DI LUAR FASILITAS
                      </span>
                      <h1 className="text-3xl font-black text-blue-800 mt-1">
                        CHECK-OUT BERHASIL
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white/90 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        {scanResult.member ? scanResult.member.nama : 'Member'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Masuk: {scanResult.jam_masuk} • Keluar: {scanResult.jam_keluar} WIB
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Durasi Latihan:</span>
                      <span className="text-xl font-extrabold text-blue-700 font-mono">
                        {scanResult.durasi}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => { setScanResult(null); focusInput(); }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
                    >
                      Scan Member Berikutnya (Esc)
                    </button>
                  </div>
                </div>
              )}

              {/* 5. ALREADY INSIDE (PILIHAN CHECK-OUT) */}
              {scanResult.status === 'ALREADY_INSIDE' && (
                <div className="rounded-2xl border-4 border-indigo-500 bg-indigo-500/10 p-6 shadow-xl">
                  <div className="flex items-center space-x-3.5 border-b border-indigo-500/30 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-widest text-indigo-700 uppercase bg-indigo-100 px-2.5 py-0.5 rounded-full">
                        MEMBER SUDAH DI DALAM
                      </span>
                      <h1 className="text-2xl font-black text-indigo-900 mt-1">
                        Sedang Berada di Fasilitas
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white/90 rounded-xl border border-indigo-200">
                    <p className="text-sm font-semibold text-slate-900">
                      {scanResult.message}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={() => handleQuickCheckout(scanResult.log_id, scanResult.member.nama)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Check-Out Member Sekarang</span>
                    </button>
                    <button
                      onClick={() => { setScanResult(null); focusInput(); }}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* 6. NOT FOUND */}
              {scanResult.status === 'NOT_FOUND' && (
                <div className="rounded-2xl border-4 border-slate-400 bg-slate-100 p-6 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-10 h-10 text-slate-600" />
                    <div>
                      <h2 className="text-xl font-black text-slate-800">MEMBER TIDAK DITEMUKAN</h2>
                      <p className="text-xs text-slate-600 mt-1">{scanResult.message}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={onNavigateToRegister}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
                    >
                      + Daftarkan Member Baru Ini
                    </button>
                    <button
                      onClick={() => { setScanResult(null); focusInput(); }}
                      className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standby State Display */
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center mb-3">
                <Scan className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-700">
                Menunggu Scan Kartu Member
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Sistem siap menerima input pemindai otomatis. Hasil verifikasi akses dan data keanggotaan akan langsung tampil di sini dalam hitungan detik.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Okupansi Widget (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Real-time Occupancy Box */}
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-5 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="font-bold text-sm tracking-wide">Okupansi Real-time</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">LIVE COUNT</span>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Area GYM</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  {occupancy.gym} <span className="text-xs font-normal text-slate-400">orang</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Waves className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kolam POOL</span>
                </div>
                <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
                  {occupancy.pool} <span className="text-xs font-normal text-slate-400">orang</span>
                </div>
              </div>
            </div>

            {/* List of members currently inside */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">
                  Sedang di Dalam ({occupancy.list.length})
                </span>
                <button
                  onClick={loadOccupancy}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {occupancy.list.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-800/40 rounded-xl">
                  Belum ada member di dalam fasilitas saat ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {occupancy.list.map((log) => (
                    <div
                      key={log.id_log}
                      className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <img
                          src={log.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={log.nama}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-600"
                        />
                        <div className="truncate">
                          <h4 className="font-bold text-slate-200 truncate leading-tight">{log.nama}</h4>
                          <span className="text-[10px] text-slate-400">
                            Masuk {log.jam_masuk} • <strong className={log.fasilitas === 'Gym' ? 'text-emerald-400' : 'text-blue-400'}>{log.fasilitas}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleQuickCheckout(log.id_log, log.nama)}
                        title="Check-out member ini"
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white transition flex-shrink-0 ml-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Renewal Modal */}
      {renewingMember && (
        <RenewModal
          member={renewingMember}
          onClose={() => setRenewingMember(null)}
          onSuccess={(msg) => {
            setScanResult(null);
            loadOccupancy();
            focusInput();
          }}
        />
      )}
    </div>
  );
}
