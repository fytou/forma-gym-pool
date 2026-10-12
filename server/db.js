const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'forma.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// 1. Members
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id_member TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    no_hp TEXT NOT NULL,
    nik TEXT,
    foto TEXT,
    qr_code TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Migration: Ensure nik column exists in members table
try {
  db.exec('ALTER TABLE members ADD COLUMN nik TEXT;');
} catch (e) {
  // column already exists
}

// Populate sample NIK for existing members if empty
try {
  const nullNikMembers = db.prepare("SELECT id_member FROM members WHERE nik IS NULL OR nik = ''").all();
  if (nullNikMembers && nullNikMembers.length > 0) {
    const updateNik = db.prepare('UPDATE members SET nik = ? WHERE id_member = ?');
    nullNikMembers.forEach((m, idx) => {
      updateNik.run(`32770255058700${String(15 + idx).padStart(2, '0')}`, m.id_member);
    });
  }
} catch (e) {
  console.error('Error migrating NIK:', e);
}

// 2. Packages (Paket)
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id_paket INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_paket TEXT NOT NULL,
    harga REAL NOT NULL,
    durasi INTEGER NOT NULL,
    durasi_label TEXT NOT NULL,
    fasilitas TEXT NOT NULL CHECK(fasilitas IN ('Gym', 'Pool', 'Gym+Pool')),
    deskripsi TEXT,
    is_active INTEGER DEFAULT 1
  );
`);

// 3. Memberships
db.exec(`
  CREATE TABLE IF NOT EXISTS memberships (
    id_membership INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    paket_id INTEGER NOT NULL,
    tanggal_mulai TEXT NOT NULL,
    tanggal_berakhir TEXT NOT NULL,
    status_pembayaran TEXT DEFAULT 'Lunas',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE CASCADE,
    FOREIGN KEY (paket_id) REFERENCES packages(id_paket)
  );
`);

// 4. Check-in Log
db.exec(`
  CREATE TABLE IF NOT EXISTS checkin_logs (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    fasilitas TEXT NOT NULL CHECK(fasilitas IN ('Gym', 'Pool')),
    tanggal TEXT NOT NULL,
    jam_masuk TEXT NOT NULL,
    jam_keluar TEXT,
    hasil_validasi TEXT NOT NULL,
    catatan TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE CASCADE
  );
`);

// 5. Transaksi
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
    membership_id INTEGER NOT NULL,
    jumlah_bayar REAL NOT NULL,
    metode_bayar TEXT NOT NULL DEFAULT 'Tunai',
    tanggal_bayar TEXT DEFAULT (datetime('now', 'localtime')),
    jenis TEXT NOT NULL CHECK(jenis IN ('daftar', 'perpanjang')),
    FOREIGN KEY (membership_id) REFERENCES memberships(id_membership) ON DELETE CASCADE
  );
`);

// Function to calculate helper member status
function computeMemberStatus(tanggalBerakhir) {
  if (!tanggalBerakhir) return 'Expired';
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date(tanggalBerakhir);
  const curDate = new Date(today);
  const diffTime = endDate.getTime() - curDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Expiring Soon';
  return 'Active';
}

// Seed initial realistic Indonesian gym data if empty
function seedDatabase() {
  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get().count;
  if (packageCount === 0) {
    console.log('Seeding initial packages...');
    const insertPackage = db.prepare(`
      INSERT INTO packages (nama_paket, harga, durasi, durasi_label, fasilitas, deskripsi)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertPackage.run('Monthly Gym', 250000, 30, '1 Bulan (30 Hari)', 'Gym', 'Akses penuh seluruh alat fitness & area gym');
    insertPackage.run('Monthly Pool', 200000, 30, '1 Bulan (30 Hari)', 'Pool', 'Akses kolam renang semi-olympic setiap hari');
    insertPackage.run('Monthly Gym + Pool', 350000, 30, '1 Bulan (30 Hari)', 'Gym+Pool', 'Paket combo lengkap: bebas akses Gym & Kolam Renang');
    insertPackage.run('3 Months Gym', 650000, 90, '3 Bulan (90 Hari)', 'Gym', 'Paket hemat gym 3 bulan hemat Rp 100.000');
    insertPackage.run('3 Months Gym + Pool', 900000, 90, '3 Bulan (90 Hari)', 'Gym+Pool', 'Paket hemat combo 3 bulan akses tanpa batas');
    insertPackage.run('Annual All Access', 3200000, 365, '1 Tahun (365 Hari)', 'Gym+Pool', 'Member VIP tahunan Gym & Pool all access');
  }

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
  if (memberCount === 0) {
    console.log('Seeding initial realistic Indonesian members & memberships...');
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    // Seed members with realistic Indonesian profiles
    const seedMembers = [
      {
        id: 'MEM-000101',
        nama: 'Roid Fitrah',
        no_hp: '081234567890',
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        paket_id: 3, // Monthly Gym + Pool
        days_offset: 20 // Active, expires in 20 days
      },
      {
        id: 'MEM-000102',
        nama: 'Andi Wijaya',
        no_hp: '082198765432',
        foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        paket_id: 2, // Monthly Pool
        days_offset: 14 // Active, expires in 14 days
      },
      {
        id: 'MEM-000103',
        nama: 'Siti Rahma',
        no_hp: '085711223344',
        foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        paket_id: 1, // Monthly Gym
        days_offset: 3 // Expiring Soon (3 days)
      },
      {
        id: 'MEM-000104',
        nama: 'Budi Santoso',
        no_hp: '081377889900',
        foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        paket_id: 4, // 3 Months Gym
        days_offset: -10 // Expired 10 days ago
      },
      {
        id: 'MEM-000105',
        nama: 'Dewi Lestari',
        no_hp: '081822334455',
        foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        paket_id: 5, // 3 Months Gym + Pool
        days_offset: 45 // Active
      },
      {
        id: 'MEM-000106',
        nama: 'Rizky Pratama',
        no_hp: '085233445566',
        foto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
        paket_id: 1, // Monthly Gym
        days_offset: 18 // Active
      },
      {
        id: 'MEM-000107',
        nama: 'Fajar Hidayat',
        no_hp: '087812345678',
        foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
        paket_id: 2, // Monthly Pool
        days_offset: 12 // Active
      },
      {
        id: 'MEM-000108',
        nama: 'Maya Anggraini',
        no_hp: '081901234567',
        foto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80',
        paket_id: 3, // Monthly Gym + Pool
        days_offset: 5 // Expiring Soon (5 days)
      }
    ];

    const insertMember = db.prepare(`
      INSERT INTO members (id_member, nama, no_hp, nik, foto, qr_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMembership = db.prepare(`
      INSERT INTO memberships (member_id, paket_id, tanggal_mulai, tanggal_berakhir, status_pembayaran)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (membership_id, jumlah_bayar, metode_bayar, tanggal_bayar, jenis)
      VALUES (?, ?, ?, datetime('now', 'localtime'), ?)
    `);

    for (let i = 0; i < seedMembers.length; i++) {
      const m = seedMembers[i];
      const nikSample = `32770255058700${String(10 + i).padStart(2, '0')}`;
      insertMember.run(m.id, m.nama, m.no_hp, nikSample, m.foto, m.id);

      const pkg = db.prepare('SELECT * FROM packages WHERE id_paket = ?').get(m.paket_id);
      const start = new Date(today);
      start.setDate(today.getDate() - (pkg.durasi - m.days_offset));
      const end = new Date(today);
      end.setDate(today.getDate() + m.days_offset);

      const startDateStr = formatDate(start);
      const endDateStr = formatDate(end);

      insertMembership.run(m.id, m.paket_id, startDateStr, endDateStr, 'Lunas');
      const membership = db.prepare('SELECT id_membership FROM memberships WHERE member_id = ? ORDER BY id_membership DESC LIMIT 1').get(m.id);

      insertTransaction.run(membership.id_membership, pkg.harga, 'Transfer Bank', 'daftar');
    }

    // Seed realistic check-in logs for today & earlier
    const todayStr = formatDate(today);
    const insertLog = db.prepare(`
      INSERT INTO checkin_logs (member_id, fasilitas, tanggal, jam_masuk, jam_keluar, hasil_validasi, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Past logs
    insertLog.run('MEM-000101', 'Gym', todayStr, '08:15', '09:30', 'ACCESS GRANTED', 'Selesai latihan beban pagi');
    insertLog.run('MEM-000102', 'Pool', todayStr, '09:00', '10:15', 'ACCESS GRANTED', 'Selesai berenang 500m');
    insertLog.run('MEM-000103', 'Gym', todayStr, '10:30', '11:45', 'ACCESS GRANTED', 'Cardio dan treadmill');
    
    // Currently checked in members (occupancy test! jam_keluar IS NULL)
    insertLog.run('MEM-000106', 'Gym', todayStr, '13:30', null, 'ACCESS GRANTED', 'Sedang di area Gym (Treadmill)');
    insertLog.run('MEM-000107', 'Pool', todayStr, '14:00', null, 'ACCESS GRANTED', 'Sedang di kolam renang');
    insertLog.run('MEM-000105', 'Gym', todayStr, '14:15', null, 'ACCESS GRANTED', 'Sedang latihan beban');

    // Sample denied access log (member expired)
    insertLog.run('MEM-000104', 'Gym', todayStr, '11:00', null, 'MEMBERSHIP EXPIRED', 'Masa aktif habis sejak 10 hari lalu');

    console.log('Database seeded successfully!');
  }
}

seedDatabase();

module.exports = {
  db,
  computeMemberStatus
};
