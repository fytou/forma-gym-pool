const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');
const { db, computeMemberStatus, hashPassword } = require('./db');

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
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

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
// 0. AUTHENTICATION & USER MANAGEMENT
// ==========================================
// Simple secure token session store (in-memory map)
const sessions = new Map();

// Helper to authenticate user by token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid atau sudah kedaluwarsa.' });
  }

  const sessionUser = sessions.get(token);
  req.user = sessionUser;
  next();
}

// Optional auth helper (for public read or conditional)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak memiliki izin role ini.' });
    }
    next();
  };
}

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    const user = db.prepare('SELECT id_user, username, password_hash, nama_lengkap, role FROM users WHERE LOWER(username) = ?').get(trimmedUsername);
    if (!user || user.password_hash !== passwordHash) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    // Create session token
    const token = require('crypto').randomBytes(32).toString('hex');
    const userData = {
      id_user: user.id_user,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role
    };

    sessions.set(token, userData);

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: userData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me (Verify session)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: 'Belum login.' });
  }

  res.json({
    success: true,
    user: sessions.get(token)
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logout berhasil.' });
});

// GET /api/users (Superadmin only: list users)
app.get('/api/users', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const users = db.prepare('SELECT id_user, username, nama_lengkap, role, created_at FROM users ORDER BY id_user ASC').all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users (Superadmin only: add user)
app.post('/api/users', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const { username, password, nama_lengkap, role } = req.body;
    if (!username || !password || !nama_lengkap || !role) {
      return res.status(400).json({ success: false, message: 'Semua field akun wajib diisi.' });
    }

    if (!['superadmin', 'kasir'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role harus superadmin atau kasir.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id_user FROM users WHERE LOWER(username) = ?').get(trimmedUsername);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
    }

    const insert = db.prepare('INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES (?, ?, ?, ?)');
    insert.run(trimmedUsername, hashPassword(password), nama_lengkap.trim(), role);

    res.json({ success: true, message: 'Akun kasir / admin berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id (Superadmin only: delete user)
app.delete('/api/users/:id', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    // Do not allow deleting own account or the main superadmin
    if (req.user.id_user === userId) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun Anda sendiri saat sedang login.' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id_user = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    db.prepare('DELETE FROM users WHERE id_user = ?').run(userId);
    res.json({ success: true, message: `Akun ${targetUser.username} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


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
        (m.nik && m.nik.toLowerCase().includes(q)) ||
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

// Auto-generate ID Member (Consistent MEM-000101, MEM-000102, ... standard format)
function generateNextMemberId() {
  const members = db.prepare('SELECT id_member FROM members').all();
  let maxSeq = 100;

  for (const m of members) {
    if (!m.id_member) continue;
    // Match any numeric suffix from MEM-000109 or FM-2026-00113 or 000109
    const match = m.id_member.match(/(\d{3,6})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `MEM-${String(nextSeq).padStart(6, '0')}`;
}

// Register Member Baru (< 2 Menit workflow)
app.post('/api/members', upload.single('foto_file'), async (req, res) => {
  try {
    const {
      nama,
      no_hp,
      nik,
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
      INSERT INTO members (id_member, nama, no_hp, nik, foto, qr_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId, nama.trim(), no_hp.trim(), nik ? nik.trim() : null, fotoUrl, qrCode);

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

    let rawCode = code.trim();
    // In case scanner scanned a full URL (e.g. https://.../FM-2026-00112)
    if (rawCode.includes('http://') || rawCode.includes('https://')) {
      const parts = rawCode.split('/');
      rawCode = parts[parts.length - 1];
    }
    // Clean any whitespace, non-printable characters or Carriage Return (\r, \n)
    let cleanCode = rawCode.replace(/[\r\n\t]/g, '').trim();

    // Comprehensive Normalization for hardware barcode/QR scanner formats:
    // e.g. iWare sends "MEM/000109" -> "MEM-000109"
    // e.g. scanner sends "000109" -> "MEM-000109"
    // e.g. scanner sends "00113" -> "FM-2026-00113" or "MEM-000113"
    // e.g. scanner sends "FM/2026/00112" -> "FM-2026-00112"
    let normalizedVariants = [cleanCode, cleanCode.toUpperCase()];
    
    // 1. Slash or underscore in MEM prefix
    if (/^MEM[\/_]/i.test(cleanCode)) {
      normalizedVariants.push(cleanCode.replace(/^MEM[\/_]/i, 'MEM-').toUpperCase());
    }
    // 2. Slash or underscore in FM prefix
    if (/^FM[\/_]/i.test(cleanCode)) {
      normalizedVariants.push(cleanCode.replace(/[\/_]/g, '-').toUpperCase());
    }
    // 3. Raw 5-6 digits (e.g. 000109 or 00113)
    if (/^\d{5,6}$/.test(cleanCode)) {
      normalizedVariants.push(`MEM-${cleanCode}`);
      normalizedVariants.push(`MEM-000${cleanCode.slice(-3)}`);
      normalizedVariants.push(`FM-2026-${cleanCode}`);
      normalizedVariants.push(`FM-2026-00${cleanCode.slice(-3)}`);
    }
    // 4. If code is MEM-000113, also allow matching FM-2026-00113 and vice versa
    const numPart = cleanCode.match(/(\d{3,6})$/);
    if (numPart) {
      const padNum = numPart[1].padStart(5, '0');
      normalizedVariants.push(`MEM-${numPart[1].padStart(6, '0')}`);
      normalizedVariants.push(`FM-2026-${padNum}`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    // Find member by qr_code OR id_member (case-insensitive) OR phone across all normalized variants
    let memberRow = null;
    for (const variant of normalizedVariants) {
      const uVar = variant.toUpperCase();
      memberRow = db.prepare(`
        SELECT id_member FROM members 
        WHERE UPPER(qr_code) = ? OR UPPER(id_member) = ? OR no_hp = ? OR qr_code = ? OR id_member = ?
      `).get(uVar, uVar, variant, variant, variant);
      if (memberRow) break;
    }

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

// History Transaksi dengan Filter Periode & Pencarian Member
app.get('/api/transactions', (req, res) => {
  try {
    const { search = '', bulan = '', tahun = '', jenis = '', limit = 10, page = 1 } = req.query;

    let query = `
      SELECT t.*, m.id_member, m.nama, m.no_hp, p.nama_paket
      FROM transactions t
      JOIN memberships ms ON t.membership_id = ms.id_membership
      JOIN members m ON ms.member_id = m.id_member
      JOIN packages p ON ms.paket_id = p.id_paket
      WHERE 1=1
    `;
    const params = [];

    // Filter nama, id_member, no_hp, atau nomor transaksi
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (m.nama LIKE ? OR m.id_member LIKE ? OR m.no_hp LIKE ? OR ('TRX-' || printf('%05d', t.id_transaksi)) LIKE ?)`;
      params.push(s, s, s, s);
    }

    // Filter Bulan & Tahun (Format t.tanggal_bayar: 'YYYY-MM-DD HH:MM:SS')
    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      query += ` AND t.tanggal_bayar LIKE ?`;
      params.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      query += ` AND t.tanggal_bayar LIKE ?`;
      params.push(y);
    }

    // Filter Jenis (daftar / perpanjang)
    if (jenis && jenis !== 'Semua') {
      query += ` AND t.jenis = ?`;
      params.push(jenis);
    }

    // Get total sum for the filtered criteria
    let sumQuery = `
      SELECT SUM(t.jumlah_bayar) as total_filtered, COUNT(t.id_transaksi) as total_count
      FROM transactions t
      JOIN memberships ms ON t.membership_id = ms.id_membership
      JOIN members m ON ms.member_id = m.id_member
      WHERE 1=1
    `;
    const sumParams = [];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      sumQuery += ` AND (m.nama LIKE ? OR m.id_member LIKE ? OR m.no_hp LIKE ? OR ('TRX-' || printf('%05d', t.id_transaksi)) LIKE ?)`;
      sumParams.push(s, s, s, s);
    }
    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      sumQuery += ` AND t.tanggal_bayar LIKE ?`;
      sumParams.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      sumQuery += ` AND t.tanggal_bayar LIKE ?`;
      sumParams.push(y);
    }
    if (jenis && jenis !== 'Semua') {
      sumQuery += ` AND t.jenis = ?`;
      sumParams.push(jenis);
    }

    const stat = db.prepare(sumQuery).get(...sumParams);

    query += ' ORDER BY t.id_transaksi DESC LIMIT ? OFFSET ?';
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    params.push(numLimit, numOffset);

    const transactions = db.prepare(query).all(...params);

    res.json({ 
      success: true, 
      data: transactions,
      total_nominal: stat?.total_filtered || 0,
      total_count: stat?.total_count || 0,
      page: Number(page) || 1,
      limit: numLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// UNIFIED FINANCE TRANSACTIONS (Semua, Member Gym, POS Kasir, Trainer PT)
// ==========================================
app.get('/api/finance/unified-transactions', (req, res) => {
  try {
    const { kategori = 'Semua', search = '', bulan = '', tahun = '', page = 1, limit = 10 } = req.query;

    let unionQuery = `
      SELECT 
        ('MEMBER-' || t.id_transaksi) as unique_id,
        'Member Gym' as kategori,
        ('TRX-' || printf('%05d', t.id_transaksi)) as no_referensi,
        m.nama as pihak_terkait,
        m.id_member as kode_id,
        ('Paket ' || p.nama_paket || ' (' || CASE WHEN t.jenis = 'daftar' THEN 'Daftar Baru' ELSE 'Perpanjangan' END || ')') as deskripsi,
        t.jumlah_bayar as nominal,
        t.metode_bayar,
        t.tanggal_bayar as waktu
      FROM transactions t
      JOIN memberships ms ON t.membership_id = ms.id_membership
      JOIN members m ON ms.member_id = m.id_member
      JOIN packages p ON ms.paket_id = p.id_paket

      UNION ALL

      SELECT 
        ('POS-' || pt.id_transaksi_pos) as unique_id,
        'POS Kasir' as kategori,
        pt.nomor_struk as no_referensi,
        pt.nama_pembeli as pihak_terkait,
        COALESCE(pt.member_id, '-') as kode_id,
        (
          SELECT COALESCE(GROUP_CONCAT(pti.nama_produk || ' x' || pti.qty, ', '), 'Belanja Kasir')
          FROM pos_transaction_items pti
          WHERE pti.id_transaksi_pos = pt.id_transaksi_pos
        ) as deskripsi,
        pt.total_bayar as nominal,
        pt.metode_bayar,
        pt.created_at as waktu
      FROM pos_transactions pt

      UNION ALL

      SELECT 
        ('PT-' || tm.id_pt_member) as unique_id,
        'Trainer (PT)' as kategori,
        ('PT-' || printf('%04d', tm.id_pt_member)) as no_referensi,
        m.nama as pihak_terkait,
        tm.member_id as kode_id,
        (tm.nama_paket_pt || ' • Pelatih: ' || t.nama_trainer || ' (' || tm.total_sesi || ' Sesi)') as deskripsi,
        tm.biaya as nominal,
        'Tunai' as metode_bayar,
        (tm.tanggal_daftar || ' 00:00:00') as waktu
      FROM trainer_members tm
      JOIN members m ON tm.member_id = m.id_member
      JOIN trainers t ON tm.id_trainer = t.id_trainer
    `;

    let outerQuery = `SELECT * FROM (${unionQuery}) u WHERE 1=1`;
    const params = [];

    if (kategori && kategori !== 'Semua') {
      if (kategori === 'Member Gym') outerQuery += ` AND u.kategori = 'Member Gym'`;
      else if (kategori === 'POS Kasir') outerQuery += ` AND u.kategori = 'POS Kasir'`;
      else if (kategori === 'Trainer (PT)') outerQuery += ` AND u.kategori = 'Trainer (PT)'`;
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      outerQuery += ` AND (u.no_referensi LIKE ? OR u.pihak_terkait LIKE ? OR u.kode_id LIKE ? OR u.deskripsi LIKE ? OR u.metode_bayar LIKE ?)`;
      params.push(s, s, s, s, s);
    }

    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      outerQuery += ` AND u.waktu LIKE ?`;
      params.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      outerQuery += ` AND u.waktu LIKE ?`;
      params.push(y);
    }

    // Summary calculation
    let countQuery = `SELECT COUNT(*) as total_count, COALESCE(SUM(nominal), 0) as total_nominal FROM (${outerQuery})`;
    const stat = db.prepare(countQuery).get(...params);

    // Sorting & Pagination
    outerQuery += ` ORDER BY u.waktu DESC LIMIT ? OFFSET ?`;
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    const queryParams = [...params, numLimit, numOffset];

    const rows = db.prepare(outerQuery).all(...queryParams);

    res.json({
      success: true,
      data: rows,
      total_count: stat?.total_count || 0,
      total_nominal: stat?.total_nominal || 0,
      page: Number(page) || 1,
      limit: numLimit
    });
  } catch (err) {
    console.error('Unified transactions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8. POS (POINT OF SALE) KASIR ENDPOINTS
// ==========================================

// Get All POS Products
app.get('/api/pos/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM pos_products WHERE is_active = 1 ORDER BY kategori ASC, nama_produk ASC').all();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create POS Product
app.post('/api/pos/products', authenticateToken, (req, res) => {
  try {
    const { nama_produk, kategori, harga_jual, harga_modal, stok, barcode, satuan } = req.body;
    if (!nama_produk || harga_jual === undefined) {
      return res.status(400).json({ success: false, message: 'Nama produk dan harga jual wajib diisi' });
    }
    const insert = db.prepare(`
      INSERT INTO pos_products (nama_produk, kategori, harga_jual, harga_modal, stok, barcode, satuan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      nama_produk.trim(),
      kategori || 'Minuman',
      Number(harga_jual),
      Number(harga_modal || 0),
      Number(stok || 0),
      barcode ? barcode.trim() : null,
      satuan || 'Pcs'
    );
    res.json({ success: true, message: 'Produk berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update POS Product
app.put('/api/pos/products/:id', authenticateToken, (req, res) => {
  try {
    const { nama_produk, kategori, harga_jual, harga_modal, stok, barcode, satuan } = req.body;
    db.prepare(`
      UPDATE pos_products 
      SET nama_produk = ?, kategori = ?, harga_jual = ?, harga_modal = ?, stok = ?, barcode = ?, satuan = ?
      WHERE id_produk = ?
    `).run(
      nama_produk.trim(),
      kategori || 'Minuman',
      Number(harga_jual),
      Number(harga_modal || 0),
      Number(stok || 0),
      barcode ? barcode.trim() : null,
      satuan || 'Pcs',
      req.params.id
    );
    res.json({ success: true, message: 'Produk berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete (Deactivate) POS Product
app.delete('/api/pos/products/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE pos_products SET is_active = 0 WHERE id_produk = ?').run(req.params.id);
    res.json({ success: true, message: 'Produk berhasil dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create POS Transaction (Checkout Kasir)
app.post('/api/pos/checkout', authenticateToken, (req, res) => {
  try {
    const { items, member_id, nama_pembeli, metode_bayar, catatan } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Keranjang belanja masih kosong' });
    }

    const nomorStruk = `STRUK-${Date.now().toString().slice(-8)}`;
    let totalBayar = 0;

    // Validate stock and calculate total
    for (const item of items) {
      const prod = db.prepare('SELECT * FROM pos_products WHERE id_produk = ?').get(item.id_produk);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Produk ID ${item.id_produk} tidak ditemukan` });
      }
      if (prod.stok < item.qty) {
        return res.status(400).json({ success: false, message: `Stok untuk ${prod.nama_produk} tidak mencukupi (sisa ${prod.stok})` });
      }
      totalBayar += Number(item.harga_satuan) * Number(item.qty);
    }

    const kasirNama = req.user ? (req.user.nama_lengkap || req.user.username) : 'Staff Kasir';

    // Insert transaction
    db.prepare(`
      INSERT INTO pos_transactions (nomor_struk, member_id, nama_pembeli, total_bayar, metode_bayar, catatan, kasir_nama)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nomorStruk,
      member_id || null,
      nama_pembeli || 'Umum / Non-Member',
      totalBayar,
      metode_bayar || 'Tunai',
      catatan || '',
      kasirNama
    );

    const posTrx = db.prepare('SELECT id_transaksi_pos FROM pos_transactions WHERE nomor_struk = ?').get(nomorStruk);

    // Insert items & deduct stock
    const insertItem = db.prepare(`
      INSERT INTO pos_transaction_items (id_transaksi_pos, id_produk, nama_produk, qty, harga_satuan, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateStok = db.prepare('UPDATE pos_products SET stok = stok - ? WHERE id_produk = ?');

    for (const item of items) {
      const subtotal = Number(item.harga_satuan) * Number(item.qty);
      insertItem.run(posTrx.id_transaksi_pos, item.id_produk, item.nama_produk, item.qty, item.harga_satuan, subtotal);
      updateStok.run(item.qty, item.id_produk);
    }

    res.json({
      success: true,
      message: 'Transaksi kasir berhasil disimpan!',
      nomor_struk: nomorStruk,
      total_bayar: totalBayar
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get POS Sales History with filters, pagination, and items detail
app.get('/api/pos/history', authenticateToken, (req, res) => {
  try {
    const { search = '', bulan = '', tahun = '', limit = 10, page = 1 } = req.query;

    let query = `
      SELECT pt.*, pt.created_at as tanggal_waktu
      FROM pos_transactions pt
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (pt.nomor_struk LIKE ? OR pt.nama_pembeli LIKE ? OR pt.kasir_nama LIKE ? OR pt.member_id LIKE ?)`;
      params.push(s, s, s, s);
    }

    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      query += ` AND pt.created_at LIKE ?`;
      params.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      query += ` AND pt.created_at LIKE ?`;
      params.push(y);
    }

    let sumQuery = `
      SELECT SUM(pt.total_bayar) as total_nominal, COUNT(pt.id_transaksi_pos) as total_count
      FROM pos_transactions pt
      WHERE 1=1
    `;
    const sumParams = [];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      sumQuery += ` AND (pt.nomor_struk LIKE ? OR pt.nama_pembeli LIKE ? OR pt.kasir_nama LIKE ? OR pt.member_id LIKE ?)`;
      sumParams.push(s, s, s, s);
    }
    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      sumQuery += ` AND pt.created_at LIKE ?`;
      sumParams.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      sumQuery += ` AND pt.created_at LIKE ?`;
      sumParams.push(y);
    }

    const stat = db.prepare(sumQuery).get(...sumParams);

    query += ' ORDER BY pt.id_transaksi_pos DESC LIMIT ? OFFSET ?';
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    params.push(numLimit, numOffset);

    const history = db.prepare(query).all(...params);

    const getItems = db.prepare('SELECT * FROM pos_transaction_items WHERE id_transaksi_pos = ?');
    const enrichedHistory = history.map(h => ({
      ...h,
      items: getItems.all(h.id_transaksi_pos)
    }));

    res.json({
      success: true,
      data: enrichedHistory,
      total_nominal: stat?.total_nominal || 0,
      total_count: stat?.total_count || 0,
      page: Number(page) || 1,
      limit: numLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete / Void POS Transaction (Rollback stock and delete transaction & items)
app.delete('/api/pos/transactions/:id', authenticateToken, (req, res) => {
  try {
    const trxId = req.params.id;
    const trx = db.prepare('SELECT * FROM pos_transactions WHERE id_transaksi_pos = ? OR nomor_struk = ?').get(trxId, trxId);
    if (!trx) {
      return res.status(404).json({ success: false, message: 'Transaksi struk kasir tidak ditemukan' });
    }

    // Restore stock for each item
    const items = db.prepare('SELECT * FROM pos_transaction_items WHERE id_transaksi_pos = ?').all(trx.id_transaksi_pos);
    const restoreStock = db.prepare('UPDATE pos_products SET stok = stok + ? WHERE id_produk = ?');
    for (const item of items) {
      if (item.id_produk) {
        restoreStock.run(item.qty, item.id_produk);
      }
    }

    // Delete items and transaction
    db.prepare('DELETE FROM pos_transaction_items WHERE id_transaksi_pos = ?').run(trx.id_transaksi_pos);
    db.prepare('DELETE FROM pos_transactions WHERE id_transaksi_pos = ?').run(trx.id_transaksi_pos);

    res.json({
      success: true,
      message: `Struk ${trx.nomor_struk} berhasil dibatalkan dan dihapus. Stok barang telah dikembalikan.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==========================================
// 9. TRAINER & PT ENDPOINTS
// ==========================================

// Get all trainers
app.get('/api/trainers', (req, res) => {
  try {
    const trainers = db.prepare('SELECT * FROM trainers ORDER BY id_trainer ASC').all();
    res.json({ success: true, data: trainers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add new trainer
app.post('/api/trainers', authenticateToken, (req, res) => {
  try {
    const { nama_trainer, no_hp, spesialisasi, foto } = req.body;
    if (!nama_trainer) return res.status(400).json({ success: false, message: 'Nama trainer wajib diisi' });

    db.prepare(`
      INSERT INTO trainers (nama_trainer, no_hp, spesialisasi, foto)
      VALUES (?, ?, ?, ?)
    `).run(nama_trainer.trim(), no_hp || '', spesialisasi || 'Fitness & Strength', foto || '');

    res.json({ success: true, message: 'Trainer berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update trainer
app.put('/api/trainers/:id', authenticateToken, (req, res) => {
  try {
    const { nama_trainer, no_hp, spesialisasi, foto } = req.body;
    if (!nama_trainer) return res.status(400).json({ success: false, message: 'Nama trainer wajib diisi' });

    db.prepare(`
      UPDATE trainers
      SET nama_trainer = ?, no_hp = ?, spesialisasi = ?, foto = ?
      WHERE id_trainer = ?
    `).run(nama_trainer.trim(), no_hp || '', spesialisasi || 'Fitness & Strength', foto || '', req.params.id);

    res.json({ success: true, message: 'Data trainer berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete trainer
app.delete('/api/trainers/:id', authenticateToken, (req, res) => {
  try {
    // Check if trainer is used in trainer_members that are active
    const activePT = db.prepare('SELECT COUNT(*) as count FROM trainer_members WHERE id_trainer = ? AND status = ?').get(req.params.id, 'Aktif');
    if (activePT && activePT.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Tidak dapat menghapus trainer ini karena masih membina ${activePT.count} member PT aktif. Selesaikan atau ubah trainer member terlebih dahulu.` 
      });
    }

    db.prepare('DELETE FROM trainers WHERE id_trainer = ?').run(req.params.id);
    res.json({ success: true, message: 'Trainer berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all PT members with filters and pagination
app.get('/api/trainers/members', (req, res) => {
  try {
    const { search = '', bulan = '', tahun = '', limit = 10, page = 1 } = req.query;

    let query = `
      SELECT tm.*, m.nama as nama_member, m.no_hp as member_no_hp, m.foto as member_foto, t.nama_trainer
      FROM trainer_members tm
      JOIN members m ON tm.member_id = m.id_member
      JOIN trainers t ON tm.id_trainer = t.id_trainer
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (m.nama LIKE ? OR m.id_member LIKE ? OR t.nama_trainer LIKE ? OR tm.nama_paket_pt LIKE ?)`;
      params.push(s, s, s, s);
    }

    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      query += ` AND tm.tanggal_daftar LIKE ?`;
      params.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      query += ` AND tm.tanggal_daftar LIKE ?`;
      params.push(y);
    }

    let sumQuery = `
      SELECT SUM(tm.biaya) as total_nominal, COUNT(tm.id_pt_member) as total_count
      FROM trainer_members tm
      JOIN members m ON tm.member_id = m.id_member
      JOIN trainers t ON tm.id_trainer = t.id_trainer
      WHERE 1=1
    `;
    const sumParams = [];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      sumQuery += ` AND (m.nama LIKE ? OR m.id_member LIKE ? OR t.nama_trainer LIKE ? OR tm.nama_paket_pt LIKE ?)`;
      sumParams.push(s, s, s, s);
    }
    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      sumQuery += ` AND tm.tanggal_daftar LIKE ?`;
      sumParams.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      sumQuery += ` AND tm.tanggal_daftar LIKE ?`;
      sumParams.push(y);
    }

    const stat = db.prepare(sumQuery).get(...sumParams);

    query += ' ORDER BY tm.id_pt_member DESC LIMIT ? OFFSET ?';
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    params.push(numLimit, numOffset);

    const list = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: list,
      total_nominal: stat?.total_nominal || 0,
      total_count: stat?.total_count || 0,
      page: Number(page) || 1,
      limit: numLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register member to trainer
app.post('/api/trainers/members', authenticateToken, (req, res) => {
  try {
    const { member_id, id_trainer, nama_paket_pt, total_sesi, biaya, catatan } = req.body;
    if (!member_id || !id_trainer || !total_sesi) {
      return res.status(400).json({ success: false, message: 'Member, trainer, dan total sesi wajib diisi' });
    }

    const cleanInput = member_id.trim();

    // Check if input matches ID, Nama, or Phone
    const memberRow = db.prepare(`
      SELECT id_member, nama FROM members
      WHERE UPPER(id_member) = ? OR UPPER(nama) = ? OR nama LIKE ? OR no_hp = ?
      LIMIT 1
    `).get(cleanInput.toUpperCase(), cleanInput.toUpperCase(), `%${cleanInput}%`, cleanInput);

    if (!memberRow) {
      return res.status(404).json({
        success: false,
        message: `Member '${cleanInput}' tidak ditemukan. Pastikan memilih member yang sudah terdaftar.`
      });
    }

    const targetMemberId = memberRow.id_member;

    db.prepare(`
      INSERT INTO trainer_members (member_id, id_trainer, nama_paket_pt, total_sesi, sesi_tersisa, biaya, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetMemberId,
      Number(id_trainer),
      nama_paket_pt || `${total_sesi} Sesi Personal Trainer`,
      Number(total_sesi),
      Number(total_sesi),
      Number(biaya || 0),
      catatan || ''
    );

    res.json({ success: true, message: `Pendaftaran paket Personal Trainer untuk ${memberRow.nama} (${targetMemberId}) berhasil!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Check-in / Potong Sesi PT
app.post('/api/trainers/checkin-session', authenticateToken, (req, res) => {
  try {
    const { id_pt_member, topik_latihan, catatan_trainer } = req.body;
    const ptMember = db.prepare('SELECT * FROM trainer_members WHERE id_pt_member = ?').get(id_pt_member);
    if (!ptMember) {
      return res.status(404).json({ success: false, message: 'Data PT Member tidak ditemukan' });
    }
    if (ptMember.sesi_tersisa <= 0) {
      return res.status(400).json({ success: false, message: 'Sesi latihan sudah habis!' });
    }

    const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const todayStr = new Date().toISOString().split('T')[0];

    // Log session
    db.prepare(`
      INSERT INTO trainer_sessions (id_pt_member, member_id, id_trainer, tanggal, jam_sesi, topik_latihan, catatan_trainer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id_pt_member,
      ptMember.member_id,
      ptMember.id_trainer,
      todayStr,
      nowTimeStr,
      topik_latihan || 'Latihan Rutin',
      catatan_trainer || ''
    );

    // Deduct 1 session
    const newRemaining = ptMember.sesi_tersisa - 1;
    db.prepare(`
      UPDATE trainer_members
      SET sesi_tersisa = ?, status = ?
      WHERE id_pt_member = ?
    `).run(newRemaining, newRemaining === 0 ? 'Selesai' : 'Aktif', id_pt_member);

    res.json({
      success: true,
      message: `Sesi PT berhasil di-checkin! Sisa sesi: ${newRemaining}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Perpanjang / Tambah Sesi PT Member
app.post('/api/trainers/members/:id/renew', authenticateToken, (req, res) => {
  try {
    const { tambah_sesi = 10, biaya = 0, nama_paket_pt, catatan } = req.body;
    const ptMember = db.prepare('SELECT * FROM trainer_members WHERE id_pt_member = ?').get(req.params.id);
    if (!ptMember) {
      return res.status(404).json({ success: false, message: 'Data Member PT tidak ditemukan' });
    }

    const addSessions = Number(tambah_sesi) || 10;
    const newTotal = Number(ptMember.total_sesi) + addSessions;
    const currentRemaining = Math.max(0, Number(ptMember.sesi_tersisa));
    const newRemaining = currentRemaining + addSessions;
    const newBiaya = Number(ptMember.biaya || 0) + (Number(biaya) || 0);
    const updatedPaket = nama_paket_pt || ptMember.nama_paket_pt;

    db.prepare(`
      UPDATE trainer_members
      SET total_sesi = ?, sesi_tersisa = ?, status = 'Aktif', biaya = ?, nama_paket_pt = ?, catatan = ?
      WHERE id_pt_member = ?
    `).run(newTotal, newRemaining, newBiaya, updatedPaket, catatan || ptMember.catatan, req.params.id);

    res.json({
      success: true,
      message: `Berhasil menambah ${addSessions} sesi! Sisa kuota sekarang ${newRemaining} sesi.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hapus Member PT
app.delete('/api/trainers/members/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM trainer_members WHERE id_pt_member = ?').run(req.params.id);
    res.json({ success: true, message: 'Member PT berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Sessions History with Pagination (1-10 per page) and Search
app.get('/api/trainers/sessions', (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    let query = `
      SELECT ts.*, m.nama as nama_member, m.id_member, t.nama_trainer
      FROM trainer_sessions ts
      JOIN members m ON ts.member_id = m.id_member
      JOIN trainers t ON ts.id_trainer = t.id_trainer
      WHERE 1=1
    `;
    const params = [];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (m.nama LIKE ? OR m.id_member LIKE ? OR t.nama_trainer LIKE ? OR ts.topik_latihan LIKE ?)`;
      params.push(s, s, s, s);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(...params);
    const total = countRow ? countRow.total : 0;

    query += ' ORDER BY ts.id_sesi DESC LIMIT ? OFFSET ?';
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    params.push(numLimit, numOffset);

    const sessions = db.prepare(query).all(...params);
    res.json({
      success: true,
      data: sessions,
      total,
      page: Number(page) || 1,
      limit: numLimit,
      total_pages: Math.ceil(total / numLimit) || 1
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==========================================
// 10. FASILITAS LOKER ENDPOINTS
// ==========================================

// Get All Lockers
app.get('/api/lockers', (req, res) => {
  try {
    const lockers = db.prepare('SELECT * FROM lockers ORDER BY nomor_loker ASC').all();
    res.json({ success: true, data: lockers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Pinjam Loker
app.post('/api/lockers/borrow', authenticateToken, (req, res) => {
  try {
    const { id_loker, member_id, nama_peminjam, keterangan } = req.body;
    const locker = db.prepare('SELECT * FROM lockers WHERE id_loker = ?').get(id_loker);
    if (!locker) return res.status(404).json({ success: false, message: 'Loker tidak ditemukan' });
    if (locker.status !== 'Tersedia') return res.status(400).json({ success: false, message: 'Loker sedang tidak tersedia' });

    const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

    db.prepare(`
      UPDATE lockers
      SET status = 'Digunakan', member_id = ?, nama_peminjam = ?, jam_pinjam = ?, keterangan = ?
      WHERE id_loker = ?
    `).run(member_id || null, nama_peminjam || 'Member', nowTimeStr, keterangan || '', id_loker);

    res.json({ success: true, message: `Loker ${locker.nomor_loker} berhasil dipinjamkan` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kembalikan Kunci Loker
app.post('/api/lockers/return', authenticateToken, (req, res) => {
  try {
    const { id_loker } = req.body;
    db.prepare(`
      UPDATE lockers
      SET status = 'Tersedia', member_id = null, nama_peminjam = null, jam_pinjam = null, keterangan = null
      WHERE id_loker = ?
    `).run(id_loker);

    res.json({ success: true, message: 'Kunci loker telah dikembalikan & loker kembali tersedia' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Set Loker Rusak / Maintenance
app.post('/api/lockers/maintenance', authenticateToken, (req, res) => {
  try {
    const { id_loker, status, keterangan } = req.body;
    db.prepare(`
      UPDATE lockers
      SET status = ?, member_id = null, nama_peminjam = null, jam_pinjam = null, keterangan = ?
      WHERE id_loker = ?
    `).run(status || 'Rusak', keterangan || 'Dalam Perbaikan', id_loker);

    res.json({ success: true, message: 'Status loker berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==========================================
// 11. LAPORAN KEUANGAN & ARUS KAS LENGKAP
// ==========================================

// Get Financial Summary (Membership + POS + PT - Expenses)
app.get('/api/finance/summary', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const totalMemberIncome = db.prepare('SELECT COALESCE(SUM(jumlah_bayar), 0) as total FROM transactions').get().total;
    const totalPosIncome = db.prepare('SELECT COALESCE(SUM(total_bayar), 0) as total FROM pos_transactions').get().total;
    const totalPTIncome = db.prepare('SELECT COALESCE(SUM(biaya), 0) as total FROM trainer_members').get().total;
    const totalExpenses = db.prepare('SELECT COALESCE(SUM(nominal), 0) as total FROM expenses').get().total;

    const netProfit = (totalMemberIncome + totalPosIncome + totalPTIncome) - totalExpenses;

    const recentExpenses = db.prepare('SELECT * FROM expenses ORDER BY id_pengeluaran DESC LIMIT 20').all();

    res.json({
      success: true,
      data: {
        total_member_income: totalMemberIncome,
        total_pos_income: totalPosIncome,
        total_pt_income: totalPTIncome,
        total_expenses: totalExpenses,
        total_gross_income: totalMemberIncome + totalPosIncome + totalPTIncome,
        net_profit: netProfit,
        expenses: recentExpenses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Expenses with search, period filters, and pagination
app.get('/api/finance/expenses', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const { search = '', bulan = '', tahun = '', kategori = '', limit = 10, page = 1 } = req.query;

    let query = `
      SELECT *
      FROM expenses
      WHERE 1=1
    `;
    const params = [];

    if (kategori && kategori !== 'Semua') {
      query += ` AND kategori = ?`;
      params.push(kategori);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (deskripsi LIKE ? OR kategori LIKE ? OR pic LIKE ? OR metode_bayar LIKE ?)`;
      params.push(s, s, s, s);
    }

    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      query += ` AND tanggal LIKE ?`;
      params.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      query += ` AND tanggal LIKE ?`;
      params.push(y);
    }

    // Sum query
    let sumQuery = `
      SELECT COUNT(*) as total_count, COALESCE(SUM(nominal), 0) as total_nominal
      FROM expenses
      WHERE 1=1
    `;
    const sumParams = [];
    if (kategori && kategori !== 'Semua') {
      sumQuery += ` AND kategori = ?`;
      sumParams.push(kategori);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      sumQuery += ` AND (deskripsi LIKE ? OR kategori LIKE ? OR pic LIKE ? OR metode_bayar LIKE ?)`;
      sumParams.push(s, s, s, s);
    }
    if (bulan && tahun) {
      const ym = `${tahun}-${String(bulan).padStart(2, '0')}%`;
      sumQuery += ` AND tanggal LIKE ?`;
      sumParams.push(ym);
    } else if (tahun) {
      const y = `${tahun}%`;
      sumQuery += ` AND tanggal LIKE ?`;
      sumParams.push(y);
    }

    const stat = db.prepare(sumQuery).get(...sumParams);

    query += ` ORDER BY id_pengeluaran DESC LIMIT ? OFFSET ?`;
    const numLimit = Number(limit) || 10;
    const numOffset = ((Number(page) || 1) - 1) * numLimit;
    params.push(numLimit, numOffset);

    const rows = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: rows,
      total_count: stat?.total_count || 0,
      total_nominal: stat?.total_nominal || 0,
      page: Number(page) || 1,
      limit: numLimit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add Expense
app.post('/api/finance/expenses', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const { kategori, deskripsi, nominal, metode_bayar } = req.body;
    if (!kategori || !deskripsi || !nominal) {
      return res.status(400).json({ success: false, message: 'Kategori, deskripsi, dan nominal wajib diisi' });
    }
    const pic = req.user ? (req.user.nama_lengkap || req.user.username) : 'Admin';
    db.prepare(`
      INSERT INTO expenses (kategori, deskripsi, nominal, metode_bayar, pic)
      VALUES (?, ?, ?, ?, ?)
    `).run(kategori, deskripsi.trim(), Number(nominal), metode_bayar || 'Tunai', pic);

    res.json({ success: true, message: 'Pengeluaran berhasil dicatat' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Expense
app.put('/api/finance/expenses/:id', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    const { kategori, deskripsi, nominal, metode_bayar } = req.body;
    if (!kategori || !deskripsi || !nominal) {
      return res.status(400).json({ success: false, message: 'Kategori, deskripsi, dan nominal wajib diisi' });
    }
    const pic = req.user ? (req.user.nama_lengkap || req.user.username) : 'Admin';
    db.prepare(`
      UPDATE expenses
      SET kategori = ?, deskripsi = ?, nominal = ?, metode_bayar = ?, pic = ?
      WHERE id_pengeluaran = ?
    `).run(kategori, deskripsi.trim(), Number(nominal), metode_bayar || 'Tunai', pic, req.params.id);

    res.json({ success: true, message: 'Catatan pengeluaran berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Expense
app.delete('/api/finance/expenses/:id', authenticateToken, requireRole(['superadmin']), (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id_pengeluaran = ?').run(req.params.id);
    res.json({ success: true, message: 'Catatan pengeluaran berhasil dihapus' });
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
