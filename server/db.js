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
// 6. Users & Roles (Superadmin & Kasir/Admin)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id_user INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('superadmin', 'kasir')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 7. POS Products & Inventory (F&B / Merchandise)
db.exec(`
  CREATE TABLE IF NOT EXISTS pos_products (
    id_produk INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_produk TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Minuman',
    harga_jual REAL NOT NULL,
    harga_modal REAL NOT NULL DEFAULT 0,
    stok INTEGER NOT NULL DEFAULT 0,
    barcode TEXT,
    satuan TEXT DEFAULT 'Pcs',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 8. POS Transactions
db.exec(`
  CREATE TABLE IF NOT EXISTS pos_transactions (
    id_transaksi_pos INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_struk TEXT NOT NULL UNIQUE,
    member_id TEXT,
    nama_pembeli TEXT DEFAULT 'Umum / Non-Member',
    total_bayar REAL NOT NULL,
    metode_bayar TEXT NOT NULL DEFAULT 'Tunai',
    catatan TEXT,
    kasir_nama TEXT DEFAULT 'Staff Kasir',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE SET NULL
  );
`);

// 9. POS Transaction Items
db.exec(`
  CREATE TABLE IF NOT EXISTS pos_transaction_items (
    id_item INTEGER PRIMARY KEY AUTOINCREMENT,
    id_transaksi_pos INTEGER NOT NULL,
    id_produk INTEGER NOT NULL,
    nama_produk TEXT NOT NULL,
    qty INTEGER NOT NULL,
    harga_satuan REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (id_transaksi_pos) REFERENCES pos_transactions(id_transaksi_pos) ON DELETE CASCADE,
    FOREIGN KEY (id_produk) REFERENCES pos_products(id_produk)
  );
`);

// 10. Master Trainers (Personal Trainers)
db.exec(`
  CREATE TABLE IF NOT EXISTS trainers (
    id_trainer INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_trainer TEXT NOT NULL,
    no_hp TEXT,
    spesialisasi TEXT DEFAULT 'Fitness & Strength',
    status TEXT DEFAULT 'Aktif',
    foto TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// 11. Member Trainer Packages (Paket PT yang diambil member)
db.exec(`
  CREATE TABLE IF NOT EXISTS trainer_members (
    id_pt_member INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    id_trainer INTEGER NOT NULL,
    nama_paket_pt TEXT NOT NULL,
    total_sesi INTEGER NOT NULL,
    sesi_tersisa INTEGER NOT NULL,
    biaya REAL NOT NULL DEFAULT 0,
    tanggal_daftar TEXT DEFAULT (date('now', 'localtime')),
    status TEXT DEFAULT 'Aktif',
    catatan TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE CASCADE,
    FOREIGN KEY (id_trainer) REFERENCES trainers(id_trainer) ON DELETE CASCADE
  );
`);

// 12. Log Sesi Trainer (Setiap kali member latihan & potong sesi)
db.exec(`
  CREATE TABLE IF NOT EXISTS trainer_sessions (
    id_sesi INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pt_member INTEGER NOT NULL,
    member_id TEXT NOT NULL,
    id_trainer INTEGER NOT NULL,
    tanggal TEXT DEFAULT (date('now', 'localtime')),
    jam_sesi TEXT NOT NULL,
    topik_latihan TEXT,
    catatan_trainer TEXT,
    FOREIGN KEY (id_pt_member) REFERENCES trainer_members(id_pt_member) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE CASCADE,
    FOREIGN KEY (id_trainer) REFERENCES trainers(id_trainer) ON DELETE CASCADE
  );
`);

// 13. Fasilitas Loker
db.exec(`
  CREATE TABLE IF NOT EXISTS lockers (
    id_loker INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_loker TEXT NOT NULL UNIQUE,
    area TEXT DEFAULT 'Loker Pria',
    status TEXT DEFAULT 'Tersedia' CHECK(status IN ('Tersedia', 'Digunakan', 'Rusak')),
    member_id TEXT,
    nama_peminjam TEXT,
    jam_pinjam TEXT,
    keterangan TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id_member) ON DELETE SET NULL
  );
`);

// 14. Pengeluaran & Biaya Operasional (Keuangan)
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id_pengeluaran INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    nominal REAL NOT NULL,
    tanggal TEXT DEFAULT (date('now', 'localtime')),
    metode_bayar TEXT DEFAULT 'Tunai',
    pic TEXT DEFAULT 'Admin',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Seed default users if table is empty
const crypto = require('crypto');
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const existingUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (!existingUserCount || existingUserCount.count === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, nama_lengkap, role)
    VALUES (?, ?, ?, ?)
  `);
  // Superadmin account: username superadmin, pass forma123
  insertUser.run('superadmin', hashPassword('forma123'), 'Super Administrator', 'superadmin');
  // Kasir / Admin Front Desk account: username kasir, pass kasir123
  insertUser.run('kasir', hashPassword('kasir123'), 'Staff Front Desk / Kasir', 'kasir');
  console.log('Default users seeded: superadmin and kasir');
}

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

  // 1. Ensure Hanifa Febriani exists (from Image 3 card)
  const hanifa = db.prepare("SELECT id_member FROM members WHERE id_member = 'FM-2026-00112'").get();
  if (!hanifa) {
    console.log('Registering Hanifa Febriani (FM-2026-00112) for scanner demo...');
    db.prepare(`
      INSERT OR REPLACE INTO members (id_member, nama, no_hp, nik, foto, qr_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'FM-2026-00112',
      'Hanifa Febriani',
      '082188990011',
      '1403095502030142',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      'FM-2026-00112'
    );

    // Active Monthly Pool Membership (Matching Image 3: Berlaku sampai 13 November 2026)
    db.prepare(`
      INSERT INTO memberships (member_id, paket_id, tanggal_mulai, tanggal_berakhir, status_pembayaran)
      VALUES (?, 2, '2026-10-13', '2026-11-13', 'Lunas')
    `).run('FM-2026-00112');
  }

  // 2. Seed POS Products if empty
  const posCount = db.prepare('SELECT COUNT(*) as count FROM pos_products').get().count;
  if (posCount === 0) {
    console.log('Seeding initial POS items (Minuman, Roti, Handuk, etc.)...');
    const insertProd = db.prepare(`
      INSERT INTO pos_products (nama_produk, kategori, harga_jual, harga_modal, stok, barcode, satuan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertProd.run('Le Minerale 600ml', 'Minuman', 5000, 3000, 48, '899123450001', 'Botol');
    insertProd.run('Pocari Sweat 500ml', 'Minuman', 9000, 6500, 30, '899123450002', 'Botol');
    insertProd.run('Hydro Coco 330ml', 'Minuman', 8000, 5500, 24, '899123450003', 'Kotak');
    insertProd.run('Roti Sari Roti Cokelat', 'Makanan', 7000, 5000, 20, '899123450004', 'Bungkus');
    insertProd.run('Fitbar Chocolate', 'Makanan', 6500, 4500, 35, '899123450005', 'Bungkus');
    insertProd.run('Handuk Olahraga FORMA', 'Merchandise', 35000, 20000, 15, '899123450006', 'Pcs');
    insertProd.run('Whey Protein Sachet 30g', 'Suplemen', 25000, 18000, 40, '899123450007', 'Sachet');
    insertProd.run('Shaker Bottle 700ml', 'Merchandise', 45000, 28000, 12, '899123450008', 'Pcs');
  }

  // 3. Seed Trainers if empty
  const trainerCount = db.prepare('SELECT COUNT(*) as count FROM trainers').get().count;
  if (trainerCount === 0) {
    console.log('Seeding Master Trainers...');
    const insertTrainer = db.prepare(`
      INSERT INTO trainers (nama_trainer, no_hp, spesialisasi, status, foto)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertTrainer.run('Coach Randy Kurniawan', '08123456701', 'Bodybuilding & Hypertrophy', 'Aktif', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200');
    insertTrainer.run('Coach Sarah Bella', '08123456702', 'Fat Loss & HIIT Conditioning', 'Aktif', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200');
    insertTrainer.run('Coach Dimas Wahyu', '08123456703', 'Renang & Stamina Atlet', 'Aktif', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200');

    // Assign sample PT member
    const insertPTMember = db.prepare(`
      INSERT INTO trainer_members (member_id, id_trainer, nama_paket_pt, total_sesi, sesi_tersisa, biaya, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertPTMember.run('MEM-000101', 1, '10 Sesi PT Personal Strength', 10, 8, 1200000, 'Aktif');
    insertPTMember.run('MEM-000103', 2, '5 Sesi PT Fat Loss Intensive', 5, 4, 700000, 'Aktif');
  }

  // 4. Seed Lockers if empty
  const lockerCount = db.prepare('SELECT COUNT(*) as count FROM lockers').get().count;
  if (lockerCount === 0) {
    console.log('Seeding Lockers...');
    const insertLocker = db.prepare(`
      INSERT INTO lockers (nomor_loker, area, status, member_id, nama_peminjam, jam_pinjam)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (let i = 1; i <= 10; i++) {
      const no = `A-${String(i).padStart(2, '0')}`;
      if (i === 1) {
        insertLocker.run(no, 'Loker Pria', 'Digunakan', 'MEM-000106', 'Rizky Pratama', '13:30');
      } else if (i === 2) {
        insertLocker.run(no, 'Loker Pria', 'Digunakan', 'MEM-000105', 'Dewi Lestari', '14:15');
      } else {
        insertLocker.run(no, 'Loker Pria', 'Tersedia', null, null, null);
      }
    }
    for (let i = 1; i <= 10; i++) {
      const no = `B-${String(i).padStart(2, '0')}`;
      insertLocker.run(no, 'Loker Wanita', 'Tersedia', null, null, null);
    }
  }

  // 5. Seed sample expense if empty
  const expCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;
  if (expCount === 0) {
    db.prepare(`
      INSERT INTO expenses (kategori, deskripsi, nominal, pic)
      VALUES ('Operasional', 'Restock Le Minerale 2 Dus & Roti', 180000, 'Staff Kasir')
    `).run();
  }
}

seedDatabase();

module.exports = {
  db,
  computeMemberStatus,
  hashPassword
};
