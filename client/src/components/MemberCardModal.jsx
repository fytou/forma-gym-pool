import React, { useRef, useState } from 'react';
import { Printer, X, Download, ShieldCheck, Dumbbell, Waves, FileDown, Image, RefreshCw } from 'lucide-react';
import { formatDateIndo } from '../utils/api';

export default function MemberCardModal({ member, qrImage, onClose }) {
  const cardRef = useRef(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

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

  // Download entire card as high-res PNG image (fast, CORS-safe, never hangs)
  const handleDownloadCardImage = async () => {
    setDownloadingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x sharpness
      const w = 420 * scale;
      const h = 250 * scale;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Helper to draw clean avatar fallback
      const drawAvatar = () => {
        const px = 24 * scale;
        const py = 74 * scale;
        const ps = 70 * scale;
        ctx.fillStyle = '#0f172a';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(px, py, ps, ps, 12 * scale);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, ps, ps);
        }
        const initials = (member.nama || 'M')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${24 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(initials, px + ps / 2, py + ps / 2 + 8 * scale);
        ctx.textAlign = 'left';
      };

      // Helper function to render complete card on canvas
      const renderCard = (photoEl, qrEl) => {
        ctx.clearRect(0, 0, w, h);

        // 1. Background gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#020617'); // slate-950
        grad.addColorStop(0.5, '#0f172a'); // slate-900
        grad.addColorStop(1, '#022c22'); // emerald-950
        ctx.fillStyle = grad;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, w, h, 20 * scale);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, w, h);
        }

        // Border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // 2. Header
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${16 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('FORMA', 24 * scale, 34 * scale);

        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('MEMBER PASS', 90 * scale, 34 * scale);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${8 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('SMART SYSTEM FOR BUSINESS', 24 * scale, 48 * scale);

        // Facility Badge
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w - 140 * scale, 18 * scale, 116 * scale, 24 * scale);
        ctx.strokeStyle = '#059669';
        ctx.strokeRect(w - 140 * scale, 18 * scale, 116 * scale, 24 * scale);
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${10 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(paketFasilitas === 'Gym+Pool' ? 'ALL ACCESS' : paketFasilitas, w - 82 * scale, 34 * scale);
        ctx.textAlign = 'left';

        // Divider
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(24 * scale, 58 * scale);
        ctx.lineTo(w - 24 * scale, 58 * scale);
        ctx.stroke();

        // 3. Photo or Avatar
        const px = 24 * scale;
        const py = 74 * scale;
        const ps = 70 * scale;

        if (photoEl) {
          try {
            ctx.save();
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, ps, ps, 12 * scale);
            else ctx.rect(px, py, ps, ps);
            ctx.clip();
            ctx.drawImage(photoEl, px, py, ps, ps);
            ctx.restore();
          } catch (e) {
            drawAvatar();
          }
        } else {
          drawAvatar();
        }

        // Photo border
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5 * scale;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(px, py, ps, ps, 12 * scale);
          ctx.stroke();
        }

        // 4. Member Details
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${16 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(member.nama, 108 * scale, 94 * scale);

        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${12 * scale}px "JetBrains Mono", monospace`;
        ctx.fillText(member.id_member, 108 * scale, 114 * scale);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `${10 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(`Paket: ${paketNama}`, 108 * scale, 132 * scale);
        ctx.fillText(`HP: ${member.no_hp}`, 108 * scale, 148 * scale);

        // 5. QR Code
        if (qrEl) {
          try {
            ctx.fillStyle = '#ffffff';
            if (ctx.roundRect) ctx.roundRect(w - 100 * scale, 74 * scale, 76 * scale, 76 * scale, 10 * scale);
            else ctx.fillRect(w - 100 * scale, 74 * scale, 76 * scale, 76 * scale);
            ctx.fill();
            ctx.drawImage(qrEl, w - 96 * scale, 78 * scale, 68 * scale, 68 * scale);
          } catch (e) {}
        }

        // 6. Footer
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(24 * scale, 210 * scale);
        ctx.lineTo(w - 24 * scale, 210 * scale);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${9 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('Berlaku s/d: ', 24 * scale, 228 * scale);
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${9 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(validUntil, 84 * scale, 228 * scale);

        ctx.fillStyle = '#64748b';
        ctx.font = `${8 * scale}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText('FORMA-SECURE-ACCESS', w - 24 * scale, 228 * scale);
      };

      // Fast preload QR (data URL is immediate < 5ms)
      const qrEl = await new Promise((res) => {
        if (!qrImage) return res(null);
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = qrImage;
      });

      // Fast preload photo if local data or upload
      let photoEl = null;
      if (member.foto && (member.foto.startsWith('data:') || member.foto.startsWith('/uploads'))) {
        photoEl = await new Promise((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = member.foto;
        });
      }

      // Render card
      renderCard(photoEl, qrEl);

      // Safe export without tainted canvas crash
      let dataUrl;
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch (taintErr) {
        renderCard(null, qrEl);
        dataUrl = canvas.toDataURL('image/png');
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Kartu-Member-${member.id_member}-${member.nama.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setDownloadingImage(false);
    }
  };

  const paketNama = member.membership?.nama_paket || 'Tanpa Paket';
  const paketFasilitas = member.membership?.paket_fasilitas || 'Gym';
  const validUntil = member.membership?.tanggal_berakhir ? formatDateIndo(member.membership.tanggal_berakhir) : '-';

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="modal-box bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="no-print bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
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

        {/* Modal Body / Print Wrapper */}
        <div className="print-card-wrapper p-6 bg-slate-100 flex flex-col items-center">
          <p className="no-print text-xs text-slate-500 mb-4 text-center max-w-md">
            Gunakan tombol <strong>Cetak / Simpan PDF</strong> untuk cetak printer / download PDF, atau tombol <strong>Simpan Gambar Kartu (PNG)</strong> untuk mengirimkan kartu ke WhatsApp member.
          </p>

          {/* PRINTABLE CARD AREA (Standard CR80 ID Card Dimensions) */}
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
        <div className="no-print px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>File QR</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCardImage}
              disabled={downloadingImage}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition disabled:opacity-50"
            >
              {downloadingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Image className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>Download Gambar (PNG)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-extrabold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-md shadow-emerald-500/25 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
