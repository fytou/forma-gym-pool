import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CheckInView from './views/CheckInView';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import RegisterView from './views/RegisterView';
import PackagesView from './views/PackagesView';
import LogsView from './views/LogsView';
import TransactionsView from './views/TransactionsView';

export default function App() {
  // Default to 'checkin' because Front Desk / Kasir is the primary daily user!
  const [activeTab, setActiveTab] = useState('checkin');
  const [memberFilter, setMemberFilter] = useState('Semua');

  const handleNavigateToMembersWithFilter = (filter) => {
    setMemberFilter(filter);
    setActiveTab('members');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'checkin' && (
          <CheckInView
            onNavigateToRegister={() => setActiveTab('register')}
          />
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
          <PackagesView />
        )}

        {activeTab === 'logs' && (
          <LogsView />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800">FORMA</span>
            <span>•</span>
            <span>Gym & Pool Management System</span>
            <span className="hidden md:inline">(Smart System for Business)</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Versi 1.0 (Production Ready)</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Single-Tenant Local Host</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
