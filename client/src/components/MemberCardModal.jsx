import React, { useRef, useState } from 'react';
import { Printer, X, Download, ShieldCheck, Dumbbell, Waves, FileDown, Image as ImageIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatDateIndo, getQrCode } from '../utils/api';

// Helper to convert base64 dataURL to Blob safely
function dataURLtoBlob(dataurl) {
  try {
    const parts = dataurl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return null;
  }
}

// Render full card on any HTML5 canvas (2x sharp, accurate CR80 ID proportions)
function renderCardToCanvas(canvas, member, paketNama, paketFasilitas, validUntil, photoEl, qrEl) {
  const scale = 2; // 2x sharp HD resolution
  const w = 420 * scale;
  const h = 250 * scale;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, w, h);

  // Helper to draw stylish vector initials avatar (100% clean, never taints canvas)
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

  // Glow circles
  const radGlow1 = ctx.createRadialGradient(w - 20 * scale, 20 * scale, 10 * scale, w - 20 * scale, 20 * scale, 100 * scale);
  radGlow1.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
  radGlow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = radGlow1;
  ctx.fillRect(0, 0, w, h);

  // 2. Header
  // Logo icon box
  ctx.fillStyle = '#10b981';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(24 * scale, 20 * scale, 24 * scale, 24 * scale, 6 * scale);
    ctx.fill();
  } else {
    ctx.fillRect(24 * scale, 20 * scale, 24 * scale, 24 * scale);
  }

  // Dumbbell icon in logo box
  ctx.fillStyle = '#020617';
  ctx.fillRect(29 * scale, 28 * scale, 14 * scale, 8 * scale);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(34 * scale, 25 * scale, 4 * scale, 14 * scale);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${15 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('FORMA', 56 * scale, 35 * scale);

  // "MEMBER PASS" pill badge
  ctx.fillStyle = '#34d399';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(120 * scale, 23 * scale, 84 * scale, 16 * scale, 4 * scale);
    ctx.fill();
  } else {
    ctx.fillRect(120 * scale, 23 * scale, 84 * scale, 16 * scale);
  }
  ctx.fillStyle = '#020617';
  ctx.font = `bold ${9 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MEMBER PASS', 162 * scale, 35 * scale);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${8 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('SMART SYSTEM FOR BUSINESS', 56 * scale, 47 * scale);

  // Facility Badge (Top Right)
  const badgeText = paketFasilitas === 'Gym+Pool' ? 'ALL ACCESS' : paketFasilitas === 'Pool' ? 'POOL ONLY' : 'GYM ONLY';
  ctx.fillStyle = '#0f172a';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(w - 128 * scale, 18 * scale, 104 * scale, 24 * scale, 12 * scale);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  } else {
    ctx.fillRect(w - 128 * scale, 18 * scale, 104 * scale, 24 * scale);
  }
  ctx.fillStyle = '#34d399';
  ctx.font = `bold ${9 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, w - 76 * scale, 34 * scale);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1 * scale;
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

  // Member ID pill
  ctx.fillStyle = '#0f172a';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(108 * scale, 102 * scale, 100 * scale, 20 * scale, 4 * scale);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  } else {
    ctx.fillRect(108 * scale, 102 * scale, 100 * scale, 20 * scale);
  }
  ctx.fillStyle = '#34d399';
  ctx.font = `bold ${11 * scale}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(member.id_member, 158 * scale, 116 * scale);
  ctx.textAlign = 'left';

  // Package & Phone
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `${10 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(`Paket: ${paketNama}`, 108 * scale, 136 * scale);
  ctx.fillText(`HP: ${member.no_hp}`, 108 * scale, 152 * scale);

  // 5. QR Code Box
  if (qrEl) {
    try {
      ctx.fillStyle = '#ffffff';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(w - 100 * scale, 74 * scale, 76 * scale, 76 * scale, 10 * scale);
        ctx.fill();
      } else {
        ctx.fillRect(w - 100 * scale, 74 * scale, 76 * scale, 76 * scale);
      }
      ctx.drawImage(qrEl, w - 96 * scale, 78 * scale, 68 * scale, 68 * scale);
    } catch (e) {}
  }

  // QR Label
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${8 * scale}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SCAN MASUK', w - 62 * scale, 162 * scale);
  ctx.textAlign = 'left';

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
}

export default function MemberCardModal({ member, qrImage, onClose }) {
  const cardRef = useRef(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!member) return null;

  const paketNama = member.membership?.nama_paket || 'Tanpa Paket';
  const paketFasilitas = member.membership?.paket_fasilitas || 'Gym';
  const validUntil = member.membership?.tanggal_berakhir ? formatDateIndo(member.membership.tanggal_berakhir) : '-';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrImage) return;
    const fileName = `QR-${member.id_member}-${(member.nama || 'member').replace(/\s+/g, '_')}.png`;
    try {
      const blob = dataURLtoBlob(qrImage);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1500);
        return;
      }
    } catch (e) {}

    // Fallback
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download entire card as high-res PNG image (fast, double-buffered, 100% taint immunity)
  const handleDownloadCardImage = async () => {
    if (downloadingImage) return;
    setDownloadingImage(true);

    try {
      // 1. Ensure QR image
      let qrSource = qrImage;
      if (!qrSource && member.qr_code) {
        try {
          const res = await getQrCode(member.qr_code);
          if (res.success) qrSource = res.qr;
        } catch (e) {}
      }

      // Preload QR image
      const qrEl = await new Promise((resolve) => {
        if (!qrSource) return resolve(null);
        const img = new window.Image();
        let done = false;
        const finish = (result) => {
          if (!done) {
            done = true;
            resolve(result);
          }
        };
        img.onload = () => finish(img);
        img.onerror = () => finish(null);
        setTimeout(() => finish(null), 1200);
        img.src = qrSource;
        if (img.complete && img.naturalWidth > 0) finish(img);
      });

      // 2. Preload photo safely with CORS
      let photoEl = null;
      if (member.foto) {
        photoEl = await new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          let done = false;
          const finish = (result) => {
            if (!done) {
              done = true;
              resolve(result);
            }
          };
          img.onload = () => finish(img);
          img.onerror = () => finish(null);
          setTimeout(() => finish(null), 1500);

          let src = member.foto;
          if (src.startsWith('http') || src.startsWith('/')) {
            const sep = src.includes('?') ? '&' : '?';
            src = `${src}${sep}cb=${Date.now()}`;
          }
          img.src = src;
          if (img.complete && img.naturalWidth > 0) finish(img);
        });
      }

      // 3. Export to Blob (Double-buffered: try photo, fallback to clean vector canvas)
      let blob = null;

      // First attempt: try with photo if loaded
      if (photoEl) {
        try {
          const canvas1 = document.createElement('canvas');
          renderCardToCanvas(canvas1, member, paketNama, paketFasilitas, validUntil, photoEl, qrEl);
          blob = await new Promise((resolve, reject) => {
            try {
              canvas1.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Tainted canvas'));
              }, 'image/png');
            } catch (err) {
              reject(err);
            }
          });
        } catch (taintErr) {
          console.warn('Canvas with photo failed or tainted, falling back to clean vector card:', taintErr);
          blob = null;
        }
      }

      // Guaranteed second attempt: fresh canvas with vector avatar (never taints)
      if (!blob) {
        const canvas2 = document.createElement('canvas');
        renderCardToCanvas(canvas2, member, paketNama, paketFasilitas, validUntil, null, qrEl);
        blob = await new Promise((resolve) => {
          canvas2.toBlob((b) => resolve(b), 'image/png');
        });
      }

      if (!blob) {
        throw new Error('Gagal merender gambar kartu.');
      }

      // 4. Trigger download via Object URL
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `Kartu-Member-${member.id_member}-${(member.nama || 'member').replace(/\s+/g, '_')}.png`;

      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 2000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Error generating card image:', err);
      alert('Gagal mendownload gambar: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setDownloadingImage(false);
    }
  };

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
            Gunakan tombol <strong>Cetak / Simpan PDF</strong> untuk cetak printer / download PDF, atau tombol <strong>Download Gambar (PNG)</strong> untuk menyimpan kartu fisik ke galeri / WhatsApp member.
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
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition disabled:opacity-50 ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200'
              }`}
            >
              {downloadingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>{downloadSuccess ? 'Tersimpan!' : 'Download Gambar (PNG)'}</span>
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
