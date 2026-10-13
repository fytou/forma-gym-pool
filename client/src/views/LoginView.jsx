import React, { useState } from 'react';
import { Lock, User, Shield, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { loginUser, setAuthToken, setStoredUser } from '../utils/api';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Silakan isi username dan password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginUser(username.trim(), password);
      if (res.success && res.token && res.user) {
        setAuthToken(res.token);
        setStoredUser(res.user);
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err) {
      setError('Terjadi kendala koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090b] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#c5a059] selection:text-black">
      {/* Background Glow & Watermark Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#967434]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-300">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#121318] border border-[#c5a059]/40 shadow-xl shadow-[#c5a059]/10 mb-4">
            <img 
              src="/logo.png" 
              alt="FORMA Logo" 
              className="w-16 h-16 object-contain rounded-xl p-1 bg-black"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">FORMA</h1>
          <p className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mt-1">
            GYM • CAFE • POOL MANAGEMENT SYSTEM
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Portal Akses Masuk Internal & Front Desk
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#121318] border border-slate-800/90 rounded-2xl p-7 shadow-2xl relative backdrop-blur-xl">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-[#c5a059]" />
              <h2 className="font-bold text-sm tracking-wide text-white">Autentikasi Staf</h2>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#c5a059]/15 text-[#dfc185] border border-[#c5a059]/30">
              Akses Terlindungi
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username / Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0b0e] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0a0b0e] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm tracking-wide text-slate-950 bg-[#c5a059] hover:bg-[#b89047] active:scale-[0.99] transition shadow-lg shadow-[#c5a059]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Sistem Keamanan Single-Tenant FORMA • Kuat, Fokus, Segar Setiap Hari
        </p>
      </div>
    </div>
  );
}
