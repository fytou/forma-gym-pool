import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Printer, 
  RefreshCw, 
  Trash2, 
  Eye, 
  UserPlus,
  Dumbbell,
  Waves,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getMembers, deleteMember, getStatusBadge, formatDateIndo, formatRupiah, getQrCode } from '../utils/api';
import MemberCardModal from '../components/MemberCardModal';
import RenewModal from '../components/RenewModal';

export default function MembersView({ initialFilter = 'Semua', onNavigateToRegister }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [facilityFilter, setFacilityFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 25, 50, 'Semua'
  const [loading, setLoading] = useState(true);

  // Modals
  const [cardMember, setCardMember] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [renewMemberData, setRenewMemberData] = useState(null);
  const [detailMember, setDetailMember] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getMembers(search, statusFilter);
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, facilityFilter, pageSize]);

  // Filter members by facility
  const filteredMembers = members.filter(m => {
    if (facilityFilter !== 'Semua') {
      const fac = (m.membership?.paket_fasilitas || '').toLowerCase();
      if (facilityFilter === 'Gym' && !fac.includes('gym')) return false;
      if (facilityFilter === 'Pool' && (!fac.includes('pool') && !fac.includes('renang') && !fac.includes('kolam'))) return false;
      if (facilityFilter === 'Gym+Pool' && (!fac.includes('gym') || (!fac.includes('pool') && !fac.includes('renang')))) return false;
    }
    return true;
  });

  const totalFiltered = filteredMembers.length;
  const isAll = pageSize === 'Semua';
  const limit = isAll ? totalFiltered : Number(pageSize);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalFiltered / limit));
  const startIndex = isAll ? 0 : (currentPage - 1) * limit;
  const paginatedMembers = isAll ? filteredMembers : filteredMembers.slice(startIndex, startIndex + limit);

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus member ${nama} (${id})? Seluruh riwayat check-in akan terhapus.`)) {
      return;
    }
    try {
      const res = await deleteMember(id);
      if (res.success) {
        fetchMembers();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenCard = async (member) => {
    try {
      const res = await getQrCode(member.qr_code);
      if (res.success) {
        setQrImage(res.qr);
      }
      setCardMember(member);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Manajemen Data Member
            </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh member, status aktif, cetak kartu fisik, dan perpanjangan paket
          </p>
        </div>

        <button
          onClick={onNavigateToRegister}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black rounded-xl text-xs shadow-md shadow-[#c5a059]/20 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Member Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, No HP, atau ID member..."
              className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['Semua', 'Active', 'Expiring Soon', 'Expired'].map((st) => {
              const isSelected = statusFilter === st;
              let label = 'Semua Status';
              if (st === 'Active') label = 'Aktif';
              if (st === 'Expiring Soon') label = 'Akan Habis';
              if (st === 'Expired') label = 'Expired';

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-[#dfc185] shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Second Row: Facility Filter & Per Page Limit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Facility Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Fasilitas:</span>
            {[
              { id: 'Semua', label: 'Semua' },
              { id: 'Gym', label: '🏋️ Gym' },
              { id: 'Pool', label: '🏊 Kolam Renang' },
              { id: 'Gym+Pool', label: '🔥 Gym + Pool' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFacilityFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  facilityFilter === f.id
                    ? 'bg-[#c5a059] text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Page size limit */}
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <span className="text-slate-400 text-xs font-medium">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'Semua' ? 'Semua' : Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#c5a059]"
            >
              <option value={10}>10 per hal</option>
              <option value={25}>25 per hal</option>
              <option value={50}>50 per hal</option>
              <option value="Semua">Semua ({members.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#c5a059]" />
            <span className="text-xs">Memuat data member...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada member ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">ID Member</th>
                  <th className="py-3 px-4">No. HP</th>
                  <th className="py-3 px-4">Paket Aktif</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMembers.map((m) => {
                  const badge = getStatusBadge(m.status);
                  const isExpiring = m.status === 'Expiring Soon';
                  return (
                    <tr key={m.id_member} className="hover:bg-slate-50/80 transition">
                      {/* Name & Photo */}
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <img
                          src={m.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={m.nama}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{m.nama}</span>
                          {m.currently_inside && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#c5a059]/20 text-[#967434] border border-[#c5a059]/40">
                              Sedang di {m.currently_inside}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID & NIK */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-slate-800 block">{m.id_member}</span>
                        {m.nik && (
                          <span className="text-[10px] text-slate-400 block tracking-tight">NIK: {m.nik}</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {m.no_hp}
                      </td>

                      {/* Package */}
                      <td className="py-3 px-4">
                        {m.membership ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{m.membership.nama_paket}</span>
                            <span className="text-[10px] text-slate-500">
                              Akses: {m.membership.paket_fasilitas}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada paket</span>
                        )}
                      </td>

                      {/* Expiration date */}
                      <td className="py-3 px-4">
                        {m.membership ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {formatDateIndo(m.membership.tanggal_berakhir)}
                            </span>
                            <span className={`text-[10px] font-medium ${
                              m.status === 'Active' ? 'text-[#b89047] font-semibold' :
                              m.status === 'Expiring Soon' ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {m.sisa_hari > 0 ? `${m.sisa_hari} hari lagi` : 'Telah berakhir'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Print Card */}
                          <button
                            onClick={() => handleOpenCard(m)}
                            title="Cetak Kartu Member"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#967434] hover:bg-amber-50 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Renew */}
                          <button
                            onClick={() => setRenewMemberData(m)}
                            title="Perpanjang Membership"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(m.id_member, m.nama)}
                            title="Hapus Member"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalFiltered > 0 && (
              <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Menampilkan <strong className="text-slate-800 font-bold">{isAll ? 1 : startIndex + 1}</strong> - <strong className="text-slate-800 font-bold">{Math.min(startIndex + limit, totalFiltered)}</strong> dari <strong className="text-slate-800 font-bold">{totalFiltered}</strong> member
                  {members.length !== totalFiltered && (
                    <span className="text-slate-400 ml-1">(difilter dari {members.length} total)</span>
                  )}
                </div>

                {!isAll && totalPages > 1 && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(p)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  currentPage === p
                                    ? 'bg-slate-900 text-[#dfc185] shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Member Card Modal */}
      {cardMember && (
        <MemberCardModal
          member={cardMember}
          qrImage={qrImage}
          onClose={() => setCardMember(null)}
        />
      )}

      {/* Renewal Modal */}
      {renewMemberData && (
        <RenewModal
          member={renewMemberData}
          onClose={() => setRenewMemberData(null)}
          onSuccess={() => fetchMembers()}
        />
      )}
    </div>
  );
}
