# FORMA Gym & Pool — Sistem Manajemen Membership & Akses Fasilitas

Sistem manajemen membership modern untuk bisnis gym dan kolam renang, bagian dari platform **FORMA (Smart System for Business)**. Sistem ini menggantikan pencatatan member manual dengan pendaftaran digital, penjualan paket, validasi akses lewat QR/barcode, dan pelacakan masa berlaku keanggotaan real-time.

---

## 🚀 Fitur Utama Sistem

### 1. Check-in & Check-out Front Desk (Pusat Kendali Kasir)
- **Alur 1 Layar Cepat**: Dirancang khusus untuk petugas front desk agar antrean member dapat diproses dalam hitungan detik.
- **Validasi Akses Real-time**:
  - `ACCESS GRANTED` (Hijau besar & suara chime sukses): Member aktif dan paket sesuai fasilitas.
  - `MEMBERSHIP EXPIRED` (Merah besar & suara buzz): Keanggotaan kedaluwarsa dengan tombol 1-klik untuk langsung perpanjang.
  - `AKSES DITOLAK` (Oranye/Kuning): Paket hanya berlaku untuk fasilitas lain (misal paket Gym mencoba masuk Pool).
- **Check-out & Okupansi Otomatis**: Mendeteksi jika member sedang berada di dalam fasilitas, mencatat `jam_keluar` pada log yang sama, dan menghitung durasi kunjungan.
- **Dukungan 2 Perangkat Pemindai**:
  - **Scanner Barcode/QR USB**: Langsung deteksi kartu saat ditembak scanner (keyboard emulation auto-focus).
  - **Kamera Webcam**: Pindai QR code langsung menggunakan kamera laptop/PC.

### 2. Pendaftaran Member Baru (< 2 Menit)
- Formulir 1 layar tanpa scroll berlebih.
- Auto-generate ID Member berurutan (`MEM-000101`, `MEM-000102`, dst).
- Pilihan foto fleksibel: **Snapshot langsung via Webcam**, upload foto file, atau preset avatar realistis.
- Otomatis menghitung tanggal berakhir membership berdasarkan durasi paket.
- Catat pembayaran (Tunai, Transfer Bank, QRIS Manual) & langsung terbitkan kartu QR member.

### 3. Kartu Fisik Member Siap Cetak (CR-80 Standard)
- Tampilan kartu member standar ID Card (85.6mm × 53.98mm) dengan QR Code tajam, foto member, nama, ID, dan masa berlaku.
- Tombol **Cetak Kartu Member** langsung memanggil dialog print browser dengan layout cetak presisi.

### 4. Perpanjangan Membership (Renewal)
- 1 modal cepat dari daftar member atau layar check-in.
- Otomatis melanjutkan dari sisa masa aktif atau mulai hari ini jika sudah expired.
- Mencatat transaksi baru dengan jenis `perpanjang`.

### 5. Dashboard Laporan (PERSIS 6 Metrik PRD)
1. **Total Member** (Total terdaftar)
2. **Member Aktif** (Masa berlaku > 7 hari)
3. **Member Akan Expired** (Masa berlaku ≤ 7 hari)
4. **Member Expired** (Masa berlaku habis)
5. **Total Check-in** (Akumulasi akses sukses & hari ini)
6. **Pendapatan Membership** (Format Rupiah IDR real-time)
- Ditambah ringkasan **Okupansi Real-time** (Jumlah orang di Gym vs Pool saat ini beserta nama dan waktu masuk).

### 6. Manajemen Paket & Log Riwayat
- CRUD Paket Keanggotaan (Nama, Harga Rp, Durasi hari, Fasilitas: Gym / Pool / Gym+Pool).
- Log riwayat check-in lengkap dengan filter tanggal, fasilitas, dan status validasi.
- Riwayat transaksi pendaftaran dan perpanjangan.

---

## 🗄️ Skema Data (5 Entitas Sesuai ERD PRD)

1. **Member** (`members`): `id_member` (PK), `nama`, `no_hp`, `foto`, `qr_code`, `created_at`.  
   *(Status Active / Expiring Soon / Expired dihitung secara dinamis dari membership aktif).*
2. **Paket** (`packages`): `id_paket` (PK), `nama_paket`, `harga`, `durasi`, `durasi_label`, `fasilitas`, `deskripsi`.
3. **Membership** (`memberships`): `id_membership` (PK), `member_id` (FK), `paket_id` (FK), `tanggal_mulai`, `tanggal_berakhir`, `status_pembayaran`.
4. **Check-in Log** (`checkin_logs`): `id_log` (PK), `member_id` (FK), `fasilitas`, `tanggal`, `jam_masuk`, `jam_keluar`, `hasil_validasi`, `catatan`.
5. **Transaksi** (`transactions`): `id_transaksi` (PK), `membership_id` (FK), `jumlah_bayar`, `metode_bayar`, `tanggal_bayar`, `jenis` ('daftar' / 'perpanjang').

Database menggunakan modul **built-in `node:sqlite`** dari Node.js — zero external native dependency, cepat, dan otomatis tersimpan di `server/forma.db`.

---

## 🛠️ Cara Menjalankan Sistem

### 1. Menjalankan Server Aplikasi (Production / Standalone)
Di folder `forma-gym-pool`:
```bash
npm start
```
Aplikasi akan aktif dan dapat diakses di browser pada:  
👉 **`http://localhost:5000`**

### 2. Menjalankan Mode Development
Jika ingin melakukan pengubahan kode dengan Hot Reload:
- **Terminal 1 (Backend API)**:
  ```bash
  cd server
  npm run dev
  ```
- **Terminal 2 (Frontend Vite)**:
  ```bash
  cd client
  npm run dev
  ```
Frontend dev server berjalan di `http://localhost:5173` (otomatis mem-proxy API ke port 5000).

---

## 💡 Konfirmasi & Catatan Teknis

1. **Perangkat Scan QR**:
   - Sistem sudah mendukung **keduanya sekaligus**:
     1. **Scanner Fisik USB / Barcode Gun**: Bekerja plug-and-play tanpa driver tambahan. Saat kasir menembak kartu member, scanner otomatis mengisi input dan menekan Enter.
     2. **Kamera Webcam**: Kasir dapat mengklik "Aktifkan Webcam" di layar untuk memindai kartu fisik langsung di depan laptop/PC kasir.
2. **Pintu Masuk Gym & Pool**:
   - Disediakan toggle pintu instan di layar Check-in:
     - Tekan **F1** untuk Pintu GYM
     - Tekan **F2** untuk Pintu POOL
   - Sistem secara ketat memeriksa hak akses paket (misal member dengan paket "Monthly Pool" yang mencoba scan di pintu "Gym" akan otomatis ditolak dengan pesan jelas *FACILITY ACCESS DENIED*).
