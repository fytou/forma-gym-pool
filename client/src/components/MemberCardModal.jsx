import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, Dumbbell, Waves } from 'lucide-react';
import { formatDateIndo } from '../utils/api';

export default function MemberCardModal({ member, qrImage, onClose }) {
  const cardRef = useRef(null);

  if (!member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrImage) return;
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = `QR-${member.id_member}-${member.nama.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const paketNama = member.membership?.nama_paket || 'Tanpa Paket';
  const paketFasilitas = member.membership?.paket_fasilitas || 'Gym';
  const validUntil = member.membership?.tanggal_berakhir ? formatDateIndo(member.membership.tanggal_berakhir) : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden no-print animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-wide">Kartu Fisik Member FORMA</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-4 text-center max-w-md">
            Cetak kartu fisik ini untuk member sebagai kartu akses masuk gym & pool. QR Code di bawah siap dipindai oleh scanner barcode / kamera front desk.
          </p>

          {/* PRINTABLE CARD AREA (Standard CR80 ID Card Aspect Ratio 85.6mm x 53.98mm) */}
          <div 
            ref={cardRef}
            className="print-card-area w-[420px] h-[250px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white rounded-2xl shadow-xl border border-slate-800 p-5 flex flex-col justify-between relative overflow-hidden select-none"
          >
            {/* Background design elements */}
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-teal-500/10 blur-xl pointer-events-none"></div>
            
            {/* Card Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-sm tracking-widest text-white">FORMA</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 uppercase tracking-wider">
                      MEMBER PASS
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-400 tracking-wider">SMART SYSTEM FOR BUSINESS</p>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-emerald-400 border border-emerald-500/30">
                {paketFasilitas === 'Gym+Pool' ? (
                  <>
                    <Dumbbell className="w-3 h-3" />
                    <span>+</span>
                    <Waves className="w-3 h-3" />
                    <span className="ml-0.5 font-bold">ALL ACCESS</span>
                  </>
                ) : paketFasilitas === 'Pool' ? (
                  <>
                    <Waves className="w-3 h-3" />
                    <span className="font-bold">POOL ONLY</span>
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-3 h-3" />
                    <span className="font-bold">GYM ONLY</span>
                  </>
                )}
              </div>
            </div>

            {/* Card Content: Foto, Info & QR */}
            <div className="flex items-center justify-between my-2 relative z-10">
              <div className="flex items-center space-x-3.5">
                {/* Member photo */}
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-md bg-slate-800 flex-shrink-0">
                  <img
                    src={member.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                    alt={member.nama}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
                    }}
                  />
                </div>

                {/* Member details */}
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white tracking-tight leading-tight line-clamp-1">
                    {member.nama}
                  </h4>
                  <div className="inline-block bg-slate-800/90 text-emerald-300 font-mono text-xs px-2 py-0.5 rounded border border-emerald-500/20 font-bold tracking-wider">
                    {member.id_member}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-slate-400">Paket:</span> <span className="font-medium text-slate-200">{paketNama}</span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-slate-400">HP:</span> {member.no_hp}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center ml-2 flex-shrink-0">
                <div className="w-20 h-20 bg-white p-1 rounded-xl shadow-md flex items-center justify-center border border-slate-300">
                  {qrImage ? (
                    <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 animate-pulse rounded"></div>
                  )}
                </div>
                <span className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                  Scan Masuk
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-800/80 relative z-10">
              <div>
                Berlaku s/d: <strong className="text-emerald-400 font-medium">{validUntil}</strong>
              </div>
              <div className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                FORMA-SECURE-ACCESS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleDownloadQr}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File QR</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-md shadow-emerald-500/25 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu Member</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
