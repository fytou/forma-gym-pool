import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Package, 
  History, 
  Receipt,
  LogOut,
  Shield,
  CreditCard,
  ShoppingCart,
  Dumbbell,
  KeyRound
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allNavItems = [
    { id: 'checkin', label: 'Check-in & Akses', icon: Scan, badge: 'Front Desk', roles: ['superadmin', 'kasir'] },
    { id: 'pos', label: 'POS Kasir', icon: ShoppingCart, roles: ['superadmin', 'kasir'] },
    { id: 'trainer', label: 'Trainer (PT)', icon: Dumbbell, roles: ['superadmin', 'kasir'] },
    { id: 'loker', label: 'Fasilitas Loker', icon: KeyRound, roles: ['superadmin', 'kasir'] },
    { id: 'members', label: 'Data Member', icon: Users, roles: ['superadmin', 'kasir'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'kasir'] },
    { id: 'register', label: 'Daftar Member', icon: UserPlus, roles: ['superadmin', 'kasir'] },
    { id: 'packages', label: 'Paket', icon: Package, roles: ['superadmin'] },
    { id: 'logs', label: 'Riwayat Log', icon: History, roles: ['superadmin', 'kasir'] },
    { id: 'transactions', label: 'Keuangan', icon: Receipt, roles: ['superadmin'] },
    { id: 'users', label: 'Kelola Kasir', icon: Shield, roles: ['superadmin'] },
  ];

  // Filter items based on user role
  const userRole = currentUser?.role || 'kasir';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const timeString = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-slate-800 w-full">
      {/* Top Bar: Brand Logo & User Profile / Logout */}
      <div className="w-full px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-slate-950/70 py-2.5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Brand Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab('checkin')}
          >
            <img 
              src="/logo.png" 
              alt="FORMA Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl border border-[#c5a059]/40 bg-black p-0.5 shadow-md shadow-[#c5a059]/20 group-hover:scale-105 transition" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm sm:text-base tracking-wider text-white">FORMA</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#c5a059]/20 text-[#dfc185] border border-[#c5a059]/30 tracking-widest uppercase">
                  GYM • CAFE • POOL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Sistem Manajemen & Kontrol Akses</p>
            </div>
          </div>

          {/* Right: Clock + User Profile + Logout Button */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Real-time Clock */}
            <div className="text-right hidden md:block border-r border-slate-800 pr-3">
              <div className="text-xs font-bold text-slate-200 font-mono leading-tight">
                {timeString} WIB
              </div>
              <div className="text-[10px] text-slate-400">
                {dateString}
              </div>
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                userRole === 'superadmin' ? 'bg-[#c5a059] text-slate-950' : 'bg-slate-700 text-[#dfc185]'
              }`}>
                {userRole === 'superadmin' ? <Shield className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser?.nama_lengkap || currentUser?.username || 'Pengguna'}
                </div>
                <div className="text-[9px] uppercase font-mono font-bold text-[#c5a059] leading-none mt-0.5">
                  {userRole === 'superadmin' ? 'Superadmin' : 'Kasir'}
                </div>
              </div>
            </div>

            {/* Standout Logout Button */}
            <button
              onClick={onLogout}
              title="Keluar dari Sistem"
              className="px-3 py-1.5 rounded-xl text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/80 border border-rose-800/60 hover:border-rose-700 transition flex items-center space-x-1.5 text-xs font-bold shadow-sm active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Full-Width Navigation Menu (Scrollable if overflow) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2 bg-slate-900/95 overflow-x-auto scrollbar-none">
        <nav className="flex items-center space-x-1.5 max-w-7xl mx-auto min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#c5a059] text-slate-950 shadow-md shadow-[#c5a059]/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-[#c5a059]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
