import React, { useRef, useState } from 'react';
import { 
  Printer, X, Download, ShieldCheck, Dumbbell, Waves, Coffee, 
  MessageCircle, Image as ImageIcon, RefreshCw, CheckCircle2 
} from 'lucide-react';
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

// Render full card on any HTML5 canvas (Luxury Black & Gold Theme matching FORMA standard)
function renderCardToCanvas(canvas, member, paketNama, paketFasilitas, validUntil, photoEl, qrEl, logoEl) {
  const scale = 2; // 2x sharp HD resolution
  const w = 540 * scale;
  const h = 320 * scale;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, w, h);

  // Helper to draw stylish vector initials avatar (100% clean, never taints canvas)
  const drawAvatar = (px, py, pw, ph) => {
    ctx.fillStyle = '#141414';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 8 * scale);
      ctx.fill();
    } else {
      ctx.fillRect(px, py, pw, ph);
    }
    const initials = (member.nama || 'M')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    ctx.fillStyle = '#c5a059';
    ctx.font = `bold ${22 * scale}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(initials, px + pw / 2, py + ph / 2 + 8 * scale);
    ctx.textAlign = 'left';
  };

  // 1. Solid matte luxury black background
  ctx.fillStyle = '#0c0c0c';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16 * scale);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }

  // Outer gold border
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 2 * scale;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16 * scale);
    ctx.stroke();
  }

  // Inner gold border line (inset by 8 * scale)
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.65)';
  ctx.lineWidth = 1 * scale;
  const inset = 8 * scale;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, 10 * scale);
    ctx.stroke();
  }

  // Subtle concentric circle watermark lines (bottom-right)
  ctx.save();
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.1)';
  ctx.lineWidth = 1 * scale;
  for (let r = 80; r <= 240; r += 50) {
    ctx.beginPath();
    ctx.arc(w - 20 * scale, h - 20 * scale, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Vertical subtle divider between Left Logo and Right Info
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.35)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(215 * scale, 18 * scale);
  ctx.lineTo(215 * scale, 274 * scale);
  ctx.stroke();

  // ==========================================
  // LEFT COLUMN: OFFICIAL FORMA LOGO IMAGE
  // ==========================================
  if (logoEl) {
    try {
      const logoSize = 180 * scale;
      const lx = 18 * scale;
      const ly = (274 * scale - logoSize) / 2 + 10 * scale;
      ctx.drawImage(logoEl, lx, ly, logoSize, logoSize);
    } catch (e) {
      ctx.fillStyle = '#c5a059';
      ctx.font = `bold ${16 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('F O R M A', 112 * scale, 150 * scale);
      ctx.textAlign = 'left';
    }
  } else {
    ctx.fillStyle = '#c5a059';
    ctx.font = `bold ${16 * scale}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('F O R M A', 112 * scale, 150 * scale);
    ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('— GYM • CAFE • POOL —', 112 * scale, 168 * scale);
    ctx.textAlign = 'left';
  }

  // ==========================================
  // RIGHT COLUMN: MEMBERSHIP DETAILS
  // ==========================================
  const rx = 235 * scale;

  // Header Title (GYM MEMBERSHIP / ALL ACCESS MEMBERSHIP)
  const headerTitle = paketFasilitas === 'Gym+Pool'
    ? 'ALL ACCESS MEMBERSHIP'
    : paketFasilitas === 'Pool'
    ? 'POOL MEMBERSHIP'
    : 'GYM MEMBERSHIP';

  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${13 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(headerTitle, rx, 38 * scale);

  // Underline
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(rx, 46 * scale);
  ctx.lineTo(w - 24 * scale, 46 * scale);
  ctx.stroke();

  // Member Name
  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('MEMBER NAME', rx, 66 * scale);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${15 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(member.nama.toUpperCase(), rx, 86 * scale);

  // Member ID
  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('MEMBER ID', rx, 108 * scale);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${13 * scale}px "JetBrains Mono", monospace`;
  ctx.fillText(member.id_member, rx, 126 * scale);

  // NIK / No. KTP
  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('NO. KTP / NIK:', rx, 145 * scale);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = `${9.5 * scale}px "JetBrains Mono", monospace`;
  ctx.fillText(member.nik || '-', rx + 80 * scale, 145 * scale);

  // Photo, QR, and Plan Section
  const py = 160 * scale;
  const pw = 66 * scale;
  const ph = 76 * scale;

  // 1. Member Photo
  if (photoEl) {
    try {
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, py, pw, ph, 8 * scale);
      else ctx.rect(rx, py, pw, ph);
      ctx.clip();
      ctx.drawImage(photoEl, rx, py, pw, ph);
      ctx.restore();
    } catch (e) {
      drawAvatar(rx, py, pw, ph);
    }
  } else {
    drawAvatar(rx, py, pw, ph);
  }

  // Photo border in gold
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 1.5 * scale;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(rx, py, pw, ph, 8 * scale);
    ctx.stroke();
  }

  // 2. QR Code Box
  const qrx = rx + pw + 10 * scale;
  const qrs = 76 * scale;

  ctx.fillStyle = '#ffffff';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(qrx, py, qrs, qrs, 8 * scale);
    ctx.fill();
  } else {
    ctx.fillRect(qrx, py, qrs, qrs);
  }

  if (qrEl) {
    try {
      ctx.drawImage(qrEl, qrx + 3 * scale, py + 3 * scale, qrs - 6 * scale, qrs - 6 * scale);
    } catch (e) {}
  }

  // 3. Plan & Validity details
  const plx = qrx + qrs + 12 * scale;
  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('PAKET / PLAN:', plx, py + 16 * scale);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${10.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(paketNama.toUpperCase(), plx, py + 32 * scale);

  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('MASA BERLAKU:', plx, py + 52 * scale);

  ctx.fillStyle = '#dfc185';
  ctx.font = `bold ${10.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(validUntil, plx, py + 68 * scale);

  // ==========================================
  // FOOTER STRIP
  // ==========================================
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(24 * scale, 274 * scale);
  ctx.lineTo(w - 24 * scale, 274 * scale);
  ctx.stroke();

  ctx.fillStyle = '#c5a059';
  ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('GYM  |  CAFE  |  POOL', 28 * scale, 296 * scale);

  ctx.textAlign = 'right';
  ctx.fillText('THANK YOU FOR BEING A PART OF FORMA', w - 28 * scale, 296 * scale);
}

export default function MemberCardModal({ member, qrImage, onClose }) {
  const cardRef = useRef(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [waToast, setWaToast] = useState(false);

  if (!member) return null;

  const paketNama = member.membership?.nama_paket || 'Tanpa Paket';
  const paketFasilitas = member.membership?.paket_fasilitas || 'Gym';
  const validUntil = member.membership?.tanggal_berakhir ? formatDateIndo(member.membership.tanggal_berakhir) : '-';

  const headerTitle = paketFasilitas === 'Gym+Pool'
    ? 'ALL ACCESS MEMBERSHIP'
    : paketFasilitas === 'Pool'
    ? 'POOL MEMBERSHIP'
    : 'GYM MEMBERSHIP';

  const handlePrint = () => {
    window.print();
  };

  // Helper: Generasi Blob Kartu PNG Resolusi Tinggi (100% Kebal Taint)
  const generateCardBlob = async () => {
    // 1. Pastikan QR image tersedia
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

    // 2. Preload foto member dengan CORS
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

    // 3. Preload Official Logo Image
    let logoEl = null;
    try {
      logoEl = await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 1200);
        img.src = '/logo.png';
        if (img.complete && img.naturalWidth > 0) resolve(img);
      });
    } catch (e) {}

    // 4. Render ke Blob (Double-buffered: canvas1 dengan foto, canvas2 dengan avatar vector)
    let blob = null;

    if (photoEl) {
      try {
        const canvas1 = document.createElement('canvas');
        renderCardToCanvas(canvas1, member, paketNama, paketFasilitas, validUntil, photoEl, qrEl, logoEl);
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
        console.warn('Canvas with photo was tainted, falling back to clean vector card:', taintErr);
        blob = null;
      }
    }

    if (!blob) {
      const canvas2 = document.createElement('canvas');
      renderCardToCanvas(canvas2, member, paketNama, paketFasilitas, validUntil, null, qrEl, logoEl);
      blob = await new Promise((resolve) => {
        canvas2.toBlob((b) => resolve(b), 'image/png');
      });
    }

    return blob;
  };

  // Unduh Kartu Fisik PNG
  const handleDownloadCardImage = async () => {
    if (downloadingImage) return;
    setDownloadingImage(true);

    try {
      const blob = await generateCardBlob();
      if (!blob) throw new Error('Gagal merender gambar kartu.');

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

  // Kirim Kartu ke WhatsApp: Otomatis Unduh Gambar + Copy ke Clipboard + Buka WhatsApp
  const handleSendWhatsApp = async () => {
    if (!member.no_hp) {
      alert('Nomor telepon / WhatsApp member belum terdaftar.');
      return;
    }

    let phone = member.no_hp.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    } else if (phone.startsWith('8')) {
      phone = '62' + phone;
    }

    const message = 
`Halo Kak *${member.nama}*, selamat bergabung di *FORMA (Gym, Cafe & Pool)*! 🏋️‍♂️☕🏊‍♂️

Berikut adalah rincian data keanggotaan resmi Anda:
👤 *Nama:* ${member.nama}
🆔 *ID Member:* ${member.id_member}
🪪 *No. KTP / NIK:* ${member.nik || '-'}
📦 *Paket:* ${paketNama}
📅 *Masa Berlaku:* ${validUntil}

Kartu fisik & QR Code Anda telah aktif dan dapat langsung digunakan untuk scan masuk di gate check-in FORMA.

_Kuat, Fokus, Segar Setiap Hari._
Terima kasih telah menjadi bagian dari keluarga besar FORMA! 🙏`;

    setSendingWa(true);
    try {
      // 1. Generate PNG Card Blob
      const blob = await generateCardBlob();

      if (blob) {
        // 2. Otomatis unduh kartu ke folder Downloads
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

        // 3. Salin gambar kartu ke Clipboard agar di WhatsApp Web staf tinggal Ctrl+V (Paste)
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
          } catch (clipErr) {
            console.warn('Clipboard write image not allowed or failed:', clipErr);
          }
        }
      }

      setWaToast(true);
      setTimeout(() => setWaToast(false), 8000);

      // 4. Buka tab WhatsApp dengan pesan terisi rapi
      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('Error preparing WhatsApp card:', err);
      // Fallback: tetap buka WhatsApp jika render gambar gagal
      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="modal-box bg-[#131418] rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200 text-white">
        {/* Modal Header */}
        <div className="no-print bg-[#0c0d10] px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
            <h3 className="font-bold text-base tracking-wide text-slate-100">
              Kartu Member FORMA (Barcode & QR)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Print Wrapper */}
        <div className="print-card-wrapper p-6 bg-[#16171d] flex flex-col items-center">
          {/* PRINTABLE CARD AREA (Exact 1:1 Black & Gold Luxury ID Theme) */}
          <div 
            ref={cardRef}
            className="print-card-area w-[540px] h-[320px] bg-[#0c0c0c] text-white rounded-2xl border-[1.5px] border-[#c5a059] p-2 relative overflow-hidden select-none flex-shrink-0 shadow-2xl"
          >
            {/* Inner Gold Border Inset */}
            <div className="w-full h-full rounded-xl border border-[#c5a059]/65 p-3.5 flex flex-col justify-between relative overflow-hidden">
              {/* Concentric Watermark in background */}
              <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full border border-[#c5a059]/15 pointer-events-none"></div>
              <div className="absolute -right-10 -bottom-10 w-52 h-52 rounded-full border border-[#c5a059]/15 pointer-events-none"></div>

              {/* Main Content: Left Logo & Right Info */}
              <div className="flex items-stretch flex-1">
                {/* LEFT: OFFICIAL FORMA LOGO */}
                <div className="w-[38%] flex items-center justify-center border-r border-[#c5a059]/35 pr-3">
                  <img
                    src="/logo.png"
                    alt="FORMA Official Logo"
                    className="w-full h-auto max-h-[250px] object-contain drop-shadow"
                  />
                </div>

                {/* RIGHT: MEMBER DETAILS */}
                <div className="w-[62%] pl-4 flex flex-col justify-between">
                  {/* Top Header */}
                  <div className="border-b border-[#c5a059]/70 pb-1">
                    <h3 className="text-xs font-black tracking-widest text-[#c5a059] uppercase">
                      {headerTitle}
                    </h3>
                  </div>

                  {/* Member Name */}
                  <div className="mt-1">
                    <span className="text-[8px] font-bold tracking-widest text-[#c5a059] uppercase block">
                      MEMBER NAME
                    </span>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight leading-tight line-clamp-1">
                      {member.nama}
                    </h4>
                  </div>

                  {/* Member ID & NIK */}
                  <div className="mt-1">
                    <span className="text-[8px] font-bold tracking-widest text-[#c5a059] uppercase block">
                      MEMBER ID
                    </span>
                    <div className="font-mono text-xs font-extrabold text-white tracking-wider">
                      {member.id_member}
                    </div>
                    <div className="flex items-center space-x-2 text-[9px] mt-0.5">
                      <span className="text-[#c5a059] font-bold">NO. KTP / NIK:</span>
                      <span className="font-mono text-slate-200">{member.nik || '-'}</span>
                    </div>
                  </div>

                  {/* Photo, QR Code & Plan */}
                  <div className="flex items-center space-x-2.5 mt-2">
                    {/* Photo */}
                    <div className="w-14 h-16 rounded-lg overflow-hidden border-[1.5px] border-[#c5a059] bg-[#141414] flex-shrink-0 shadow">
                      <img
                        src={member.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                        alt={member.nama}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
                        }}
                      />
                    </div>

                    {/* QR Code */}
                    <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0 shadow border border-slate-300">
                      {qrImage ? (
                        <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-slate-200 animate-pulse rounded"></div>
                      )}
                    </div>

                    {/* Plan & Validity */}
                    <div className="flex-1 space-y-1 text-left pl-1">
                      <div>
                        <span className="text-[7.5px] font-bold tracking-wider text-[#c5a059] block uppercase">
                          PAKET / PLAN:
                        </span>
                        <span className="text-[10px] font-black text-white block uppercase leading-tight line-clamp-1">
                          {paketNama}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] font-bold tracking-wider text-[#c5a059] block uppercase">
                          MASA BERLAKU:
                        </span>
                        <span className="text-[10.5px] font-black text-[#dfc185] block tracking-tight">
                          {validUntil}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Strip */}
              <div className="pt-1.5 border-t border-[#c5a059]/60 flex items-center justify-between text-[8px] tracking-widest text-[#c5a059] uppercase font-bold mt-2">
                <span>GYM  |  CAFE  |  POOL</span>
                <span>THANK YOU FOR BEING A PART OF FORMA</span>
              </div>
            </div>
          </div>

          {/* Quick Info Bar below card (Matching Client Mockup Image 2) */}
          <div className="no-print w-[540px] mt-4 flex items-center justify-between text-xs px-1">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/80 font-medium">
              Paket: <strong className="text-white font-bold">{paketNama}</strong>
            </div>
            <div className="text-slate-400 text-xs">
              Masa Berlaku: <strong className="text-[#dfc185] font-bold">Berlaku sampai {validUntil}</strong>
            </div>
          </div>

          {/* WhatsApp Toast Guidance Banner */}
          {waToast && (
            <div className="no-print w-[540px] mt-3 p-3 bg-[#1e1b13] border border-[#c5a059]/50 rounded-xl text-[#dfc185] text-xs flex items-center space-x-2.5 animate-in fade-in duration-200 shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <strong className="text-white font-bold">Gambar kartu otomatis diunduh & disalin!</strong>
                <br />
                Di WhatsApp, Anda cukup tekan <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-[10px]">Ctrl + V</kbd> untuk tempel gambar, atau klik lampirkan (<span className="text-white font-bold">📎</span>) dari folder Downloads.
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions (Image 2 style with WhatsApp button) */}
        <div className="no-print px-6 py-4 bg-[#0e0f13] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>File QR</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition"
            >
              Tutup
            </button>
          </div>

          {/* Main 3 Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            {/* 1. Cetak Kartu */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-black text-slate-950 bg-[#c5a059] hover:bg-[#b89047] rounded-xl shadow transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu</span>
            </button>

            {/* 2. Unduh Kartu (PNG) */}
            <button
              type="button"
              onClick={handleDownloadCardImage}
              disabled={downloadingImage}
              className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition disabled:opacity-50 ${
                downloadSuccess
                  ? 'bg-[#c5a059] text-slate-950 border-[#c5a059]'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
              }`}
            >
              {downloadingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>{downloadSuccess ? 'Tersimpan!' : 'Unduh Kartu (PNG)'}</span>
            </button>

            {/* 3. Kirim ke WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="flex items-center space-x-1.5 px-4.5 py-2.5 text-xs font-black text-white bg-[#25D366] hover:bg-[#20ba59] rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              title="Unduh kartu otomatis & kirim pesan resmi ke WhatsApp member"
            >
              {sendingWa ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              <span>{sendingWa ? 'Menyiapkan...' : 'Kirim ke WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
