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
  CreditCard
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allNavItems = [
    { id: 'checkin', label: 'Check-in & Akses', icon: Scan, badge: 'Front Desk', roles: ['superadmin', 'kasir'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'kasir'] },
    { id: 'members', label: 'Data Member', icon: Users, roles: ['superadmin', 'kasir'] },
    { id: 'register', label: 'Daftar Member', icon: UserPlus, roles: ['superadmin', 'kasir'] },
    { id: 'packages', label: 'Paket', icon: Package, roles: ['superadmin'] },
    { id: 'logs', label: 'Riwayat Log', icon: History, roles: ['superadmin', 'kasir'] },
    { id: 'transactions', label: 'Transaksi', icon: Receipt, roles: ['superadmin'] },
    { id: 'users', label: 'Kelola Kasir', icon: Shield, roles: ['superadmin'] },
  ];

  // Filter items based on user role
  const userRole = currentUser?.role || 'kasir';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const timeString = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0" onClick={() => setActiveTab('checkin')}>
            <img 
              src="/logo.png" 
              alt="FORMA Logo" 
              className="w-9 h-9 object-contain rounded-xl border border-[#c5a059]/40 bg-black p-0.5 shadow-md shadow-[#c5a059]/15" 
            />
            <div className="hidden sm:block">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-wider text-white">FORMA</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#c5a059]/20 text-[#dfc185] border border-[#c5a059]/40">
                  GYM • CAFE • POOL
                </span>
              </div>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">Smart System for Business</p>
            </div>
          </div>

          {/* Nav links (Desktop & Laptop) */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#c5a059] text-slate-950 font-bold shadow-md shadow-[#c5a059]/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User profile, Role badge, Time & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
            {/* Clock */}
            <div className="text-right hidden xl:block pr-1">
              <div className="text-xs font-bold text-slate-100 tracking-wider font-mono leading-tight">
                {timeString} WIB
              </div>
              <div className="text-[9px] text-slate-400">
                {dateString}
              </div>
            </div>

            {/* Current User Badge */}
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                userRole === 'superadmin' ? 'bg-[#c5a059] text-slate-950' : 'bg-slate-700 text-[#dfc185]'
              }`}>
                {userRole === 'superadmin' ? <Shield className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-white max-w-[110px] truncate leading-tight">
                  {currentUser?.nama_lengkap || currentUser?.username || 'Pengguna'}
                </div>
                <div className="text-[9px] uppercase font-mono font-bold text-[#c5a059]">
                  {userRole === 'superadmin' ? 'Superadmin' : 'Kasir'}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900 transition flex items-center space-x-1 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet nav bar */}
      <div className="lg:hidden flex overflow-x-auto px-3 py-2 space-x-1.5 bg-slate-950 border-t border-slate-800 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isActive ? 'bg-[#c5a059] text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
