import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CheckInView from './views/CheckInView';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import RegisterView from './views/RegisterView';
import PackagesView from './views/PackagesView';
import LogsView from './views/LogsView';
import TransactionsView from './views/TransactionsView';
import UsersView from './views/UsersView';
import LoginView from './views/LoginView';
import PosKasirView from './views/PosKasirView';
import TrainerView from './views/TrainerView';
import LokerView from './views/LokerView';
import { getStoredUser, setStoredUser, getAuthToken, setAuthToken, getMe, logoutUser } from './utils/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Default to 'checkin' because Front Desk / Kasir is the primary daily user!
  const [activeTab, setActiveTab] = useState('checkin');
  const [memberFilter, setMemberFilter] = useState('Semua');

  // Check auth session on startup
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setCurrentUser(null);
        setCheckingAuth(false);
        return;
      }

      try {
        const res = await getMe();
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setStoredUser(res.user);
        } else {
          // Token invalid/expired
          setCurrentUser(null);
          setAuthToken(null);
          setStoredUser(null);
        }
      } catch {
        // Fallback to stored user if offline/local
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveTab('checkin');
  };

  const handleNavigateToMembersWithFilter = (filter) => {
    setMemberFilter(filter);
    setActiveTab('members');
  };

  // Loading spinner during initial session check
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#08090b] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-3 border-[#c5a059] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Memeriksa Keamanan Sistem FORMA...</p>
      </div>
    );
  }

  // If not logged in, render LoginView to protect the entire application
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveTab('checkin');
        }} 
      />
    );
  }

  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100 flex flex-col font-sans selection:bg-[#c5a059] selection:text-slate-950">
      {/* Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'checkin' && (
          <CheckInView
            onNavigateToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'pos' && (
          <PosKasirView />
        )}

        {activeTab === 'trainer' && (
          <TrainerView />
        )}

        {activeTab === 'loker' && (
          <LokerView />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToCheckin={() => setActiveTab('checkin')}
            onNavigateToMembers={handleNavigateToMembersWithFilter}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            initialFilter={memberFilter}
            onNavigateToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'register' && (
          <RegisterView
            onSuccess={() => setActiveTab('members')}
          />
        )}

        {activeTab === 'packages' && (
          isSuperadmin ? (
            <PackagesView />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-600 font-bold">Halaman Manajemen Paket hanya dapat diakses oleh Superadmin.</p>
            </div>
          )
        )}

        {activeTab === 'logs' && (
          <LogsView />
        )}

        {activeTab === 'transactions' && (
          isSuperadmin ? (
            <TransactionsView />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-600 font-bold">Laporan Keuangan & Transaksi hanya dapat diakses oleh Superadmin.</p>
            </div>
          )
        )}

        {activeTab === 'users' && (
          isSuperadmin ? (
            <UsersView />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-600 font-bold">Halaman Manajemen Kasir hanya dapat diakses oleh Superadmin.</p>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-[#c5a059]">FORMA</span>
            <span>•</span>
            <span>Gym, Cafe & Pool Management System</span>
            <span className="hidden md:inline">(Kuat, Fokus, Segar Setiap Hari)</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600 font-mono">
              Login sebagai: <strong className="text-slate-900">{currentUser.nama_lengkap}</strong> ({currentUser.role})
            </span>
            <span>•</span>
            <span className="text-[#b89047] font-semibold">Single-Tenant Terlindungi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

