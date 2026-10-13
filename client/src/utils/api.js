// API utility helper for FORMA Gym & Pool

const API_BASE = '/api';

export function formatRupiah(number) {
  if (number === undefined || number === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

export function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getStatusBadge(status) {
  switch (status) {
    case 'Active':
      return {
        label: 'Aktif',
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        dot: 'bg-[#c5a059]'
      };
    case 'Expiring Soon':
      return {
        label: 'Akan Habis',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500'
      };
    case 'Expired':
    default:
      return {
        label: 'Kedaluwarsa',
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500'
      };
  }
}

// Fetch dashboard data
export async function getDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  return res.json();
}

// Fetch members
export async function getMembers(search = '', status = 'Semua') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/members?${params.toString()}`);
  return res.json();
}

// Fetch member detail
export async function getMember(id) {
  const res = await fetch(`${API_BASE}/members/${id}`);
  return res.json();
}

// Register new member
export async function registerMember(formData) {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

// Renew member
export async function renewMember(id, data) {
  const res = await fetch(`${API_BASE}/members/${id}/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// Delete member
export async function deleteMember(id) {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

// Packages
export async function getPackages() {
  const res = await fetch(`${API_BASE}/packages`);
  return res.json();
}

export async function createPackage(data) {
  const res = await fetch(`${API_BASE}/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updatePackage(id, data) {
  const res = await fetch(`${API_BASE}/packages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deletePackage(id) {
  const res = await fetch(`${API_BASE}/packages/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

// Check-in scan
export async function scanCheckin(code, fasilitas, mode = 'auto') {
  const res = await fetch(`${API_BASE}/checkin/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, fasilitas, mode })
  });
  return res.json();
}

// Checkout by log id
export async function manualCheckout(logId) {
  const res = await fetch(`${API_BASE}/checkin/checkout/${logId}`, {
    method: 'POST'
  });
  return res.json();
}

// Logs
export async function getCheckinLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/checkin/logs?${query}`);
  return res.json();
}

// Transactions
export async function getTransactions() {
  const res = await fetch(`${API_BASE}/transactions`);
  return res.json();
}

// Generate QR Data URL
export async function getQrCode(code) {
  const res = await fetch(`${API_BASE}/qrcode/${encodeURIComponent(code)}`);
  return res.json();
}

// ==========================================
// AUTHENTICATION & USER HELPERS
// ==========================================
export function getAuthToken() {
  return localStorage.getItem('forma_auth_token');
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('forma_auth_token', token);
  else localStorage.removeItem('forma_auth_token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('forma_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('forma_user', JSON.stringify(user));
  else localStorage.removeItem('forma_user');
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function getMe() {
  const token = getAuthToken();
  if (!token) return { success: false, message: 'No token' };
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  } catch {
    return { success: false, message: 'Network error' };
  }
}

export async function logoutUser() {
  const token = getAuthToken();
  try {
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch {}
  setAuthToken(null);
  setStoredUser(null);
}

export async function getUsers() {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function addUser(userData) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(userData)
  });
  return res.json();
}

