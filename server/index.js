const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');
const { db, computeMemberStatus } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `member-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// Serve client build if it exists
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Helper: Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// Helper: Get member with active membership info
function getMemberWithDetails(memberId) {
  const member = db.prepare('SELECT * FROM members WHERE id_member = ?').get(memberId);
  if (!member) return null;

  // Find latest or active membership
  const membership = db.prepare(`
    SELECT m.*, p.nama_paket, p.harga, p.durasi, p.fasilitas as paket_fasilitas
    FROM memberships m
    JOIN packages p ON m.paket_id = p.id_paket
    WHERE m.member_id = ?
    ORDER BY m.tanggal_berakhir DESC, m.id_membership DESC
    LIMIT 1
  `).get(memberId);

  const status = computeMemberStatus(membership ? membership.tanggal_berakhir : null);

  // Compute remaining days
  let sisaHari = 0;
  if (membership && membership.tanggal_berakhir) {
    const today = new Date().toISOString().split('T')[0];
    const diff = new Date(membership.tanggal_berakhir) - new Date(today);
    sisaHari = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Check if member is currently inside any facility
  const todayStr = new Date().toISOString().split('T')[0];
  const activeLog = db.prepare(`
    SELECT * FROM checkin_logs 
    WHERE member_id = ? AND tanggal = ? AND jam_keluar IS NULL AND hasil_validasi = 'ACCESS GRANTED'
    ORDER BY id_log DESC LIMIT 1
  `).get(memberId, todayStr);

  return {
    ...member,
    status,
    sisa_hari: sisaHari,
    membership: membership || null,
    currently_inside: activeLog ? activeLog.fasilitas : null,
    current_log_id: activeLog ? activeLog.id_log : null,
    checked_in_at: activeLog ? activeLog.jam_masuk : null
  };
}

// ==========================================
// 1. DASHBOARD ENDPOINT (6 PRD Metrics)
// ==========================================
app.get('/api/dashboard', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Total Member
    const totalMember = db.prepare('SELECT COUNT(*) as count FROM members').get().count;

    // Gather all members with status
    const allMembers = db.prepare('SELECT id_member FROM members').all();
    let memberAktif = 0;
    let memberExpiringSoon = 0;
    let memberExpired = 0;

    for (const m of allMembers) {
      const details = getMemberWithDetails(m.id_member);
      if (details.status === 'Active') memberAktif++;
      else if (details.status === 'Expiring Soon') memberExpiringSoon++;
      else memberExpired++;
    }

    // 5. Total Check-in
    const totalCheckin = db.prepare(`SELECT COUNT(*) as count FROM checkin_logs WHERE hasil_validasi = 'ACCESS GRANTED'`).get().count;
    const todayCheckin = db.prepare(`SELECT COUNT(*) as count FROM checkin_logs WHERE tanggal = ? AND hasil_validasi = 'ACCESS GRANTED'`).get(todayStr).count;

    // 6. Total Pendapatan
    const revenueRow = db.prepare('SELECT SUM(jumlah_bayar) as total FROM transactions').get();
    const pendapatan = revenueRow && revenueRow.total ? revenueRow.total : 0;

    // Occupancy (Okupansi Real-time Gym & Pool)
    const activeLogs = db.prepare(`
      SELECT cl.*, m.nama, m.no_hp, m.foto, p.nama_paket
      FROM checkin_logs cl
      JOIN members m ON cl.member_id = m.id_member
      LEFT JOIN memberships ms ON ms.member_id = m.id_member
      LEFT JOIN packages p ON ms.paket_id = p.id_paket
      WHERE cl.tanggal = ? AND cl.jam_keluar IS NULL AND cl.hasil_validasi = 'ACCESS GRANTED'
      ORDER BY cl.jam_masuk DESC
    `).all(todayStr);

    const occupancyGym = activeLogs.filter(l => l.fasilitas === 'Gym').length;
    const occupancyPool = activeLogs.filter(l => l.fasilitas === 'Pool').length;

    // Recent 6 check-in logs
    const recentLogs = db.prepare(`
      SELECT cl.*, m.nama, m.foto, p.nama_paket
      FROM checkin_logs cl
      JOIN members m ON cl.member_id = m.id_member
      LEFT JOIN memberships ms ON ms.member_id = m.id_member
      LEFT JOIN packages p ON ms.paket_id = p.id_paket
      ORDER BY cl.id_log DESC
      LIMIT 8
    `).all();

    res.json({
      success: true,
      metrics: {
        total_member: totalMember,
        member_aktif: memberAktif,
        member_expired: memberExpired,
        member_expiring_soon: memberExpiringSoon,
        total_checkin: totalCheckin,
        today_checkin: todayCheckin,
        pendapatan: pendapatan,
        pendapatan_formatted: formatRupiah(pendapatan),
        occupancy_gym: occupancyGym,
        occupancy_pool: occupancyPool,
        total_inside: occupancyGym + occupancyPool
      },
      occupancy_list: activeLogs,
      recent_checkins: recentLogs
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat data dashboard: ' + err.message });
  }
});

// ==========================================
// 2. MEMBER ENDPOINTS
// ==========================================
app.get('/api/members', (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM members ORDER BY id_member DESC';
    let members = db.prepare(query).all();

    let detailedMembers = members.map(m => getMemberWithDetails(m.id_member));

    // Filter by search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      detailedMembers = detailedMembers.filter(m => 
        m.nama.toLowerCase().includes(q) ||
        m.no_hp.toLowerCase().includes(q) ||
        m.id_member.toLowerCase().includes(q) ||
        m.qr_code.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (status && status !== 'Semua') {
      detailedMembers = detailedMembers.filter(m => m.status === status);
    }

    res.json({ success: true, data: detailedMembers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/members/:id', (req, res) => {
  try {
    const member = getMemberWithDetails(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }

    // History memberships
    const memberships = db.prepare(`
      SELECT m.*, p.nama_paket, p.harga, p.fasilitas, p.durasi
      FROM memberships m
      JOIN packages p ON m.paket_id = p.id_paket
      WHERE m.member_id = ?
      ORDER BY m.id_membership DESC
    `).all(req.params.id);

    // History check-ins
    const checkinHistory = db.prepare(`
      SELECT * FROM checkin_logs
      WHERE member_id = ?
      ORDER BY id_log DESC
      LIMIT 50
    `).all(req.params.id);

    // History transactions
    const transactions = db.prepare(`
      SELECT t.*, p.nama_paket
      FROM transactions t
      JOIN memberships m ON t.membership_id = m.id_membership
      JOIN packages p ON m.paket_id = p.id_paket
      WHERE m.member_id = ?
      ORDER BY t.id_transaksi DESC
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...member,
        memberships,
        checkin_history: checkinHistory,
        transactions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Auto-generate ID Member (MEM-000124)
function generateNextMemberId() {
  const last = db.prepare('SELECT id_member FROM members ORDER BY rowid DESC LIMIT 1').get();
  if (!last || !last.id_member) {
    return 'MEM-000101';
  }
  const match = last.id_member.match(/MEM-(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10) + 1;
    return `MEM-${String(num).padStart(6, '0')}`;
  }
  return 'MEM-000101';
}

// Register Member Baru (< 2 Menit workflow)
app.post('/api/members', upload.single('foto_file'), async (req, res) => {
  try {
    const {
      nama,
      no_hp,
      paket_id,
      tanggal_mulai,
      metode_bayar,
      foto_data
    } = req.body;

    if (!nama || !no_hp || !paket_id) {
      return res.status(400).json({ success: false, message: 'Nama, nomor HP, dan paket wajib diisi' });
    }

    // Determine photo
    let fotoUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'; // fallback
    if (req.file) {
      fotoUrl = `/uploads/${req.file.filename}`;
    } else if (foto_data && foto_data.startsWith('data:image')) {
      // Save base64 snapshot
      const base64Data = foto_data.replace(/^data:image\/\w+;base64,/, '');
      const filename = `snap-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(uploadsDir, filename), base64Data, 'base64');
      fotoUrl = `/uploads/${filename}`;
    } else if (foto_data) {
      fotoUrl = foto_data;
    }

    const newId = generateNextMemberId();
    const qrCode = newId;

    // Get package details
    const pkg = db.prepare('SELECT * FROM packages WHERE id_paket = ?').get(paket_id);
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Paket yang dipilih tidak valid' });
    }

    // Calculate dates
    const startDate = tanggal_mulai || new Date().toISOString().split('T')[0];
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + Number(pkg.durasi));
    const endDate = endDateObj.toISOString().split('T')[0];

    // Insert Member
    db.prepare(`
      INSERT INTO members (id_member, nama, no_hp, foto, qr_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(newId, nama.trim(), no_hp.trim(), fotoUrl, qrCode);

    // Insert Membership
    db.prepare(`
      INSERT INTO memberships (member_id, paket_id, tanggal_mulai, tanggal_berakhir, status_pembayaran)
      VALUES (?, ?, ?, ?, 'Lunas')
    `).run(newId, pkg.id_paket, startDate, endDate);

    const membershipRow = db.prepare('SELECT id_membership FROM memberships WHERE member_id = ? ORDER BY id_membership DESC LIMIT 1').get(newId);

    // Insert Transaction
    db.prepare(`
      INSERT INTO transactions (membership_id, jumlah_bayar, metode_bayar, jenis)
      VALUES (?, ?, ?, 'daftar')
    `).run(membershipRow.id_membership, pkg.harga, metode_bayar || 'Tunai');

    // Generate QR Code image as data URL
    const qrDataUrl = await QRCode.toDataURL(qrCode, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const fullMember = getMemberWithDetails(newId);

    res.json({
      success: true,
      message: 'Member baru berhasil didaftarkan!',
      data: fullMember,
      qr_image: qrDataUrl
    });
  } catch (err) {
    console.error('Error registering member:', err);
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan member: ' + err.message });
  }
});

// Update Member
app.put('/api/members/:id', upload.single('foto_file'), (req, res) => {
  try {
    const { nama, no_hp, foto_data } = req.body;
    const memberId = req.params.id;

    const existing = db.prepare('SELECT * FROM members WHERE id_member = ?').get(memberId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }

    let fotoUrl = existing.foto;
    if (req.file) {
      fotoUrl = `/uploads/${req.file.filename}`;
    } else if (foto_data && foto_data.startsWith('data:image')) {
      const base64Data = foto_data.replace(/^data:image\/\w+;base64,/, '');
      const filename = `snap-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(uploadsDir, filename), base64Data, 'base64');
      fotoUrl = `/uploads/${filename}`;
    } else if (foto_data) {
      fotoUrl = foto_data;
    }

    db.prepare(`
      UPDATE members
      SET nama = ?, no_hp = ?, foto = ?
      WHERE id_member = ?
    `).run(nama.trim(), no_hp.trim(), fotoUrl, memberId);

    const updated = getMemberWithDetails(memberId);
    res.json({ success: true, message: 'Data member berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Renew Membership (Perpanjangan)
app.post('/api/members/:id/renew', (req, res) => {
  try {
    const memberId = req.params.id;
    const { paket_id, tanggal_mulai, metode_bayar } = req.body;

    const member = getMemberWithDetails(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }

    const pkg = db.prepare('SELECT * FROM packages WHERE id_paket = ?').get(paket_id);
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Paket tidak valid' });
    }

    // Date logic:
    // If user specified custom start date, use it.
    // If not, if current membership is still active, start date = day after old end date.
    // If already expired, start date = today.
    const todayStr = new Date().toISOString().split('T')[0];
    let startDate = tanggal_mulai;
    if (!startDate) {
      if (member.membership && member.membership.tanggal_berakhir >= todayStr) {
        const nextDay = new Date(member.membership.tanggal_berakhir);
        nextDay.setDate(nextDay.getDate() + 1);
        startDate = nextDay.toISOString().split('T')[0];
      } else {
        startDate = todayStr;
      }
    }

    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + Number(pkg.durasi));
    const endDate = endDateObj.toISOString().split('T')[0];

    // Insert new membership record
    db.prepare(`
      INSERT INTO memberships (member_id, paket_id, tanggal_mulai, tanggal_berakhir, status_pembayaran)
      VALUES (?, ?, ?, ?, 'Lunas')
    `).run(memberId, pkg.id_paket, startDate, endDate);

    const membershipRow = db.prepare('SELECT id_membership FROM memberships WHERE member_id = ? ORDER BY id_membership DESC LIMIT 1').get(memberId);

    // Insert transaction
    db.prepare(`
      INSERT INTO transactions (membership_id, jumlah_bayar, metode_bayar, jenis)
      VALUES (?, ?, ?, 'perpanjang')
    `).run(membershipRow.id_membership, pkg.harga, metode_bayar || 'Tunai');

    const updatedMember = getMemberWithDetails(memberId);

    res.json({
      success: true,
      message: `Membership ${member.nama} berhasil diperpanjang hingga ${endDate}!`,
      data: updatedMember
    });
  } catch (err) {
    console.error('Error renewing membership:', err);
    res.status(500).json({ success: false, message: 'Gagal memperpanjang membership: ' + err.message });
  }
});

// Delete member
app.delete('/api/members/:id', (req, res) => {
  try {
    const memberId = req.params.id;
    db.prepare('DELETE FROM members WHERE id_member = ?').run(memberId);
    res.json({ success: true, message: 'Member berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. PACKAGES ENDPOINTS
// ==========================================
app.get('/api/packages', (req, res) => {
  try {
    const packages = db.prepare('SELECT * FROM packages WHERE is_active = 1 ORDER BY harga ASC').all();
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/packages', (req, res) => {
  try {
    const { nama_paket, harga, durasi, durasi_label, fasilitas, deskripsi } = req.body;
    if (!nama_paket || !harga || !durasi || !fasilitas) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    db.prepare(`
      INSERT INTO packages (nama_paket, harga, durasi, durasi_label, fasilitas, deskripsi)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nama_paket, Number(harga), Number(durasi), durasi_label || `${durasi} Hari`, fasilitas, deskripsi || '');

    const packages = db.prepare('SELECT * FROM packages WHERE is_active = 1 ORDER BY harga ASC').all();
    res.json({ success: true, message: 'Paket berhasil ditambahkan', data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/packages/:id', (req, res) => {
  try {
    const { nama_paket, harga, durasi, durasi_label, fasilitas, deskripsi } = req.body;
    db.prepare(`
      UPDATE packages 
      SET nama_paket = ?, harga = ?, durasi = ?, durasi_label = ?, fasilitas = ?, deskripsi = ?
      WHERE id_paket = ?
    `).run(nama_paket, Number(harga), Number(durasi), durasi_label || `${durasi} Hari`, fasilitas, deskripsi || '', req.params.id);

    const packages = db.prepare('SELECT * FROM packages WHERE is_active = 1 ORDER BY harga ASC').all();
    res.json({ success: true, message: 'Paket berhasil diperbarui', data: packages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/packages/:id', (req, res) => {
  try {
    db.prepare('UPDATE packages SET is_active = 0 WHERE id_paket = ?').run(req.params.id);
    res.json({ success: true, message: 'Paket berhasil dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. CHECK-IN & CHECK-OUT CORE ENGINE
// ==========================================
app.post('/api/checkin/scan', (req, res) => {
  try {
    const { code, fasilitas = 'Gym', mode = 'auto' } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Kode QR / ID Member belum diinput' });
    }

    const cleanCode = code.trim();
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    // Find member by qr_code OR id_member OR phone
    let memberRow = db.prepare(`
      SELECT id_member FROM members 
      WHERE qr_code = ? OR id_member = ? OR no_hp = ?
    `).get(cleanCode, cleanCode, cleanCode);

    if (!memberRow) {
      return res.status(404).json({
        success: false,
        action: 'REJECTED',
        status: 'NOT_FOUND',
        title: 'MEMBER TIDAK DITEMUKAN',
        message: `Kode '${cleanCode}' tidak terdaftar di sistem. Periksa kembali ID atau daftarkan member baru.`
      });
    }

    const member = getMemberWithDetails(memberRow.id_member);

    // Check if member currently has an active checkin today in ANY facility or this facility
    const currentActiveLog = db.prepare(`
      SELECT * FROM checkin_logs
      WHERE member_id = ? AND tanggal = ? AND jam_keluar IS NULL AND hasil_validasi = 'ACCESS GRANTED'
      ORDER BY id_log DESC LIMIT 1
    `).get(member.id_member, todayStr);

    // ==========================================
    // CASE A: CHECK-OUT LOGIC
    // Triggered if mode === 'keluar' OR (mode === 'auto' and member is currently inside this facility)
    // ==========================================
    if (mode === 'keluar' || (mode === 'auto' && currentActiveLog && currentActiveLog.fasilitas === fasilitas)) {
      if (!currentActiveLog) {
        return res.json({
          success: false,
          action: 'CHECK_OUT',
          status: 'WARNING',
          title: 'BELUM CHECK-IN',
          member,
          message: `${member.nama} belum tercatat masuk ke fasilitas hari ini.`
        });
      }

      // Calculate duration
      const [inH, inM] = currentActiveLog.jam_masuk.split(':').map(Number);
      const [outH, outM] = nowTimeStr.split(':').map(Number);
      let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes < 0) diffMinutes = 0;
      const durationStr = diffMinutes >= 60 
        ? `${Math.floor(diffMinutes / 60)} jam ${diffMinutes % 60} menit` 
        : `${diffMinutes} menit`;

      // Update checkin log with jam_keluar
      db.prepare(`
        UPDATE checkin_logs 
        SET jam_keluar = ?
        WHERE id_log = ?
      `).run(nowTimeStr, currentActiveLog.id_log);

      return res.json({
        success: true,
        action: 'CHECK_OUT',
        status: 'CHECKOUT_SUCCESS',
        title: 'CHECK-OUT BERHASIL',
        member,
        fasilitas: currentActiveLog.fasilitas,
        jam_masuk: currentActiveLog.jam_masuk,
        jam_keluar: nowTimeStr,
        durasi: durationStr,
        message: `Member ${member.nama} telah keluar dari fasilitas ${currentActiveLog.fasilitas}. Durasi kunjungan: ${durationStr}.`
      });
    }

    // ==========================================
    // CASE B: CHECK-IN LOGIC
    // ==========================================
    // 1. Check if already inside this facility
    if (currentActiveLog && currentActiveLog.fasilitas === fasilitas) {
      return res.json({
        success: true,
        action: 'ALREADY_INSIDE',
        status: 'ALREADY_INSIDE',
        title: 'MEMBER SUDAH DI DALAM',
        member,
        fasilitas,
        jam_masuk: currentActiveLog.jam_masuk,
        log_id: currentActiveLog.id_log,
        message: `${member.nama} sudah berada di dalam ${fasilitas} sejak jam ${currentActiveLog.jam_masuk}. Ingin check-out sekarang?`
      });
    }

    // 2. Validate Membership Expiration
    if (member.status === 'Expired' || !member.membership) {
      // Record failed check-in attempt
      db.prepare(`
        INSERT INTO checkin_logs (member_id, fasilitas, tanggal, jam_masuk, jam_keluar, hasil_validasi, catatan)
        VALUES (?, ?, ?, ?, NULL, 'MEMBERSHIP EXPIRED', ?)
      `).run(
        member.id_member,
        fasilitas,
        todayStr,
        nowTimeStr,
        member.membership ? `Masa aktif habis pada ${member.membership.tanggal_berakhir}` : 'Belum pernah punya membership'
      );

      return res.json({
        success: false,
        action: 'CHECK_IN',
        status: 'EXPIRED',
        title: 'MEMBERSHIP EXPIRED',
        member,
        fasilitas,
        message: 'Akses Ditolak: Masa berlaku keanggotaan sudah habis.',
        reason: member.membership ? `Kedaluwarsa pada ${member.membership.tanggal_berakhir}` : 'Tidak memiliki paket aktif'
      });
    }

    // 3. Validate Facility Access Rule
    const allowedFacility = member.membership.paket_fasilitas; // 'Gym', 'Pool', 'Gym+Pool'
    let hasAccess = false;

    if (allowedFacility === 'Gym+Pool') {
      hasAccess = true;
    } else if (allowedFacility === 'Gym' && fasilitas === 'Gym') {
      hasAccess = true;
    } else if (allowedFacility === 'Pool' && fasilitas === 'Pool') {
      hasAccess = true;
    }

    if (!hasAccess) {
      // Record denied facility log
      db.prepare(`
        INSERT INTO checkin_logs (member_id, fasilitas, tanggal, jam_masuk, jam_keluar, hasil_validasi, catatan)
        VALUES (?, ?, ?, ?, NULL, 'AKSES DITOLAK: FASILITAS TIDAK SESUAI', ?)
      `).run(
        member.id_member,
        fasilitas,
        todayStr,
        nowTimeStr,
        `Paket ${member.membership.nama_paket} (${allowedFacility}) tidak mencakup fasilitas ${fasilitas}`
      );

      return res.json({
        success: false,
        action: 'CHECK_IN',
        status: 'FACILITY_DENIED',
        title: 'AKSES FASILITAS DITOLAK',
        member,
        fasilitas,
        paket_fasilitas: allowedFacility,
        message: `Paket '${member.membership.nama_paket}' hanya berlaku untuk fasilitas ${allowedFacility}, tidak dapat mengakses ${fasilitas}.`
      });
    }

    // 4. ACCESS GRANTED!
    db.prepare(`
      INSERT INTO checkin_logs (member_id, fasilitas, tanggal, jam_masuk, jam_keluar, hasil_validasi, catatan)
      VALUES (?, ?, ?, ?, NULL, 'ACCESS GRANTED', ?)
    `).run(
      member.id_member,
      fasilitas,
      todayStr,
      nowTimeStr,
      `Akses berhasil menggunakan paket ${member.membership.nama_paket}`
    );

    const createdLog = db.prepare('SELECT id_log FROM checkin_logs WHERE member_id = ? ORDER BY id_log DESC LIMIT 1').get(member.id_member);

    return res.json({
      success: true,
      action: 'CHECK_IN',
      status: 'ACCESS_GRANTED',
      title: 'ACCESS GRANTED',
      member,
      fasilitas,
      log_id: createdLog.id_log,
      jam_masuk: nowTimeStr,
      paket: member.membership.nama_paket,
      sisa_hari: member.sisa_hari,
      message: `Akses berhasil diberikan untuk ${member.nama} ke fasilitas ${fasilitas}.`
    });

  } catch (err) {
    console.error('Error processing scan:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses check-in: ' + err.message });
  }
});

// Manual Checkout by Log ID
app.post('/api/checkin/checkout/:logId', (req, res) => {
  try {
    const logId = req.params.logId;
    const log = db.prepare('SELECT * FROM checkin_logs WHERE id_log = ?').get(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Data check-in tidak ditemukan' });
    }

    const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const [inH, inM] = log.jam_masuk.split(':').map(Number);
    const [outH, outM] = nowTimeStr.split(':').map(Number);
    let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes = 0;
    const durationStr = diffMinutes >= 60 
      ? `${Math.floor(diffMinutes / 60)} jam ${diffMinutes % 60} menit` 
      : `${diffMinutes} menit`;

    db.prepare('UPDATE checkin_logs SET jam_keluar = ? WHERE id_log = ?').run(nowTimeStr, logId);

    const member = db.prepare('SELECT * FROM members WHERE id_member = ?').get(log.member_id);

    res.json({
      success: true,
      message: `Member ${member.nama} berhasil check-out dari ${log.fasilitas}.`,
      durasi: durationStr,
      jam_keluar: nowTimeStr
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// History Check-in Logs List
app.get('/api/checkin/logs', (req, res) => {
  try {
    const { tanggal, fasilitas, status, search, limit = 100 } = req.query;

    let query = `
      SELECT cl.*, m.nama, m.foto, m.no_hp, p.nama_paket
      FROM checkin_logs cl
      JOIN members m ON cl.member_id = m.id_member
      LEFT JOIN memberships ms ON ms.member_id = m.id_member
      LEFT JOIN packages p ON ms.paket_id = p.id_paket
      WHERE 1=1
    `;
    const params = [];

    if (tanggal) {
      query += ' AND cl.tanggal = ?';
      params.push(tanggal);
    }
    if (fasilitas && fasilitas !== 'Semua') {
      query += ' AND cl.fasilitas = ?';
      params.push(fasilitas);
    }
    if (status && status !== 'Semua') {
      query += ' AND cl.hasil_validasi = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      query += ' AND (m.nama LIKE ? OR m.id_member LIKE ? OR m.no_hp LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY cl.id_log DESC LIMIT ?';
    params.push(Number(limit));

    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// History Transaksi
app.get('/api/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, m.id_member, m.nama, m.no_hp, p.nama_paket
      FROM transactions t
      JOIN memberships ms ON t.membership_id = ms.id_membership
      JOIN members m ON ms.member_id = m.id_member
      JOIN packages p ON ms.paket_id = p.id_paket
      ORDER BY t.id_transaksi DESC
      LIMIT 100
    `).all();

    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate QR Code data URL endpoint
app.get('/api/qrcode/:code', async (req, res) => {
  try {
    const dataUrl = await QRCode.toDataURL(req.params.code, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.json({ success: true, qr: dataUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Root ping
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'FORMA Gym & Pool Management System', timestamp: new Date() });
});

// Wildcard fallback for single page application
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('FORMA API Server is running. Client build not found.');
  }
});

app.listen(PORT, () => {
  console.log(`FORMA Gym & Pool API Server running on http://localhost:${PORT}`);
});
