import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, Trash2, Search, CheckCircle, 
  CreditCard, Banknote, QrCode, AlertCircle, PackageCheck, History, X,
  Pencil
} from 'lucide-react';
import { getPosProducts, addPosProduct, updatePosProduct, deletePosProduct, checkoutPos, getPosHistory } from '../utils/api';

export default function PosKasirView() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [cashAmount, setCashAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  // Manage Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nama_produk: '',
    kategori: 'Minuman',
    harga_jual: '',
    harga_modal: '',
    stok: '',
    barcode: '',
    satuan: 'Pcs'
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await getPosProducts();
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await getPosHistory();
      if (res.success) setHistory(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ['Semua', 'Minuman', 'Makanan', 'Merchandise', 'Suplemen'];

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
    const matchSearch = p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.barcode && p.barcode.includes(searchQuery));
    return matchCat && matchSearch;
  });

  const filteredHistory = history.filter(h => {
    const s = historySearch.toLowerCase();
    return (
      h.nomor_struk?.toLowerCase().includes(s) ||
      h.nama_pembeli?.toLowerCase().includes(s) ||
      h.kasir_nama?.toLowerCase().includes(s) ||
      h.metode_bayar?.toLowerCase().includes(s) ||
      (h.items && h.items.some(it => it.nama_produk.toLowerCase().includes(s)))
    );
  });

  const addToCart = (product) => {
    if (product.stok <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id_produk === product.id_produk);
      if (existing) {
        if (existing.qty >= product.stok) return prev;
        return prev.map(item => 
          item.id_produk === product.id_produk 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      return [...prev, {
        id_produk: product.id_produk,
        nama_produk: product.nama_produk,
        harga_satuan: product.harga_jual,
        stok: product.stok,
        qty: 1
      }];
    });
  };

  const updateCartQty = (id_produk, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id_produk === id_produk) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stok) return item;
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id_produk) => {
    setCart(prev => prev.filter(item => item.id_produk !== id_produk));
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((acc, item) => acc + (item.harga_satuan * item.qty), 0);
  const changeAmount = Number(cashAmount) >= totalAmount ? Number(cashAmount) - totalAmount : 0;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!cart.length) return;
    setLoading(true);

    try {
      const res = await checkoutPos({
        items: cart,
        member_id: memberId.trim() || null,
        nama_pembeli: buyerName.trim() || 'Umum / Non-Member',
        metode_bayar: paymentMethod,
        catatan: notes
      });

      if (res.success) {
        setCheckoutSuccess({
          nomor_struk: res.nomor_struk,
          total: totalAmount,
          metode: paymentMethod,
          kembalian: changeAmount
        });
        clearCart();
        loadProducts();
      } else {
        alert(res.message || 'Gagal memproses transaksi');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingProduct) {
        res = await updatePosProduct(editingProduct.id_produk, formData);
      } else {
        res = await addPosProduct(formData);
      }
      if (res.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        setFormData({ nama_produk: '', kategori: 'Minuman', harga_jual: '', harga_modal: '', stok: '', barcode: '', satuan: 'Pcs' });
        loadProducts();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal menyimpan produk');
    }
  };

  const handleEditProduct = (e, product) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setFormData({
      nama_produk: product.nama_produk || '',
      kategori: product.kategori || 'Minuman',
      harga_jual: product.harga_jual !== undefined ? product.harga_jual : '',
      harga_modal: product.harga_modal !== undefined ? product.harga_modal : '',
      stok: product.stok !== undefined ? product.stok : '',
      barcode: product.barcode || '',
      satuan: product.satuan || 'Pcs'
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id, nama) => {
    const confirmMsg = nama 
      ? `Yakin ingin menghapus "${nama}" dari katalog kasir?` 
      : 'Yakin ingin menghapus produk ini dari katalog kasir?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await deletePosProduct(id);
      if (res.success) {
        loadProducts();
      } else {
        alert(res.message || 'Gagal menghapus produk');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menghapus produk');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-[#c5a059]" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">POS Kasir & Merchandise</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Penjualan minuman, roti, handuk, suplemen & pencatatan stok kasir gym
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              loadHistory();
              setShowHistory(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <History className="w-4 h-4 text-[#c5a059]" />
            <span>Riwayat Struk</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({ nama_produk: '', kategori: 'Minuman', harga_jual: '', harga_modal: '', stok: '', barcode: '', satuan: 'Pcs' });
              setShowProductModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#c5a059] hover:bg-[#b89047] text-slate-950 text-xs font-black rounded-xl shadow-md shadow-[#c5a059]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left Products Grid, Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Products Panel (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk / scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-[#dfc185] shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stok <= 0;
              return (
                <div
                  key={p.id_produk}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`bg-white rounded-2xl p-3.5 border transition-all flex flex-col justify-between relative group shadow-sm hover:shadow-md ${
                    isOutOfStock 
                      ? 'opacity-70 border-slate-200 cursor-not-allowed' 
                      : 'border-slate-200 hover:border-[#c5a059] cursor-pointer'
                  }`}
                >
                  <div>
                    {/* Header Row: Category Badge & Action Buttons */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {p.kategori}
                      </span>
                      
                      {/* Action buttons: Edit & Hapus */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => handleEditProduct(e, p)}
                          title="Edit Produk"
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(p.id_produk, p.nama_produk);
                          }}
                          title="Hapus Produk"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight">
                      {p.nama_produk}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        p.stok <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Stok: {p.stok} {p.satuan || ''}
                      </span>
                      {p.barcode && (
                        <span className="text-[10px] text-slate-400 font-mono" title={`Barcode: ${p.barcode}`}>
                          {p.barcode.slice(-6)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                        Rp {p.harga_jual.toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) addToCart(p);
                        }}
                        className={`p-1.5 rounded-lg transition active:scale-90 ${
                          isOutOfStock 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-[#c5a059]/15 hover:bg-[#c5a059] text-slate-900'
                        }`}
                        title="Tambah ke Keranjang"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <PackageCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm">Tidak ada produk ditemukan</p>
              <p className="text-xs">Coba ubah kata kunci atau tambah produk baru</p>
            </div>
          )}
        </div>

        {/* Cart & Checkout Panel (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between sticky top-20">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-[#c5a059]" />
                <h2 className="font-black text-slate-900 text-sm uppercase tracking-wider">Keranjang Kasir</h2>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-xs font-semibold">Keranjang masih kosong</p>
                  <p className="text-[11px] text-slate-400">Klik item di kiri untuk menambahkan</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id_produk} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-slate-900 line-clamp-1">{item.nama_produk}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Rp {item.harga_satuan.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => updateCartQty(item.id_produk, -1)}
                        className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3 text-slate-600" />
                      </button>
                      <span className="font-bold font-mono px-2 text-xs text-slate-900">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.id_produk, 1)}
                        className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3 text-slate-600" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id_produk)}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Total & Checkout Button */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Item:</span>
              <span className="font-bold text-slate-800">{cart.reduce((a, b) => a + b.qty, 0)} item</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-700">Subtotal Belanja:</span>
              <span className="font-black font-mono text-lg text-slate-950">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              onClick={() => {
                if (cart.length > 0) setShowCheckoutModal(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-3 bg-[#c5a059] hover:bg-[#b89047] disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#c5a059]/25 transition active:scale-95 flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Bayar & Proses Struk</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHECKOUT KASIR */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base uppercase">Konfirmasi Pembayaran Kasir</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pembeli (Opsional)</label>
                <input
                  type="text"
                  placeholder="Umum / Nama Pembeli"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ID Member (Jika Member Gym)</label>
                <input
                  type="text"
                  placeholder="FM-2026-00112 / Kosongkan jika non-member"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Tunai', 'QRIS', 'Transfer Bank'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        paymentMethod === m 
                          ? 'bg-[#c5a059] border-[#c5a059] text-slate-950 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Tunai' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Uang Diterima (Rp)</label>
                  <input
                    type="number"
                    placeholder="Nominal uang tunai"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#c5a059]"
                  />
                  {Number(cashAmount) >= totalAmount && (
                    <div className="mt-1 text-emerald-700 font-bold">
                      Kembalian: Rp {changeAmount.toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-600">
                <div className="flex justify-between font-bold text-slate-800 text-sm">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-slate-950">Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black shadow transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Selesaikan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STRUK BERHASIL MODAL */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-slate-200 shadow-2xl">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-black text-slate-900 text-base">TRANSAKSI BERHASIL!</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">No. Struk: {checkoutSuccess.nomor_struk}</p>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl text-left text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-500">
                <span>Total Bayar:</span>
                <span className="font-mono font-bold text-slate-900">Rp {checkoutSuccess.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Metode:</span>
                <span className="font-bold text-slate-900">{checkoutSuccess.metode}</span>
              </div>
              {checkoutSuccess.metode === 'Tunai' && (
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1">
                  <span>Kembalian:</span>
                  <span className="font-mono">Rp {checkoutSuccess.kembalian.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setCheckoutSuccess(null);
                setShowCheckoutModal(false);
              }}
              className="w-full py-2.5 bg-slate-900 text-[#dfc185] font-black text-xs uppercase tracking-wider rounded-xl transition"
            >
              Tutup & Transaksi Baru
            </button>
          </div>
        </div>
      )}

      {/* TAMBAH / EDIT PRODUK MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">
                {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Le Minerale 600ml"
                  value={formData.nama_produk}
                  onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Minuman">Minuman</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Suplemen">Suplemen</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.harga_jual}
                    onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={formData.harga_modal}
                    onChange={(e) => setFormData({ ...formData, harga_modal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {editingProduct ? 'Jumlah Stok' : 'Jumlah Stok Awal'}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stok}
                    onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Barcode (Opsional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = editingProduct;
                      setShowProductModal(false);
                      handleDeleteProduct(p.id_produk, p.nama_produk);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center space-x-1 transition text-xs"
                    title="Hapus produk ini dari katalog"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#c5a059] hover:bg-[#b89047] text-slate-950 font-black shadow transition"
                >
                  {editingProduct ? 'Perbarui Produk' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RIWAYAT TRANSAKSI MODAL (DETAIL STRUK & CETAK ULANG) */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase">Riwayat & Arsip Struk Kasir</h3>
                <p className="text-xs text-slate-500">Daftar struk transaksi penjualan, rincian item belanja & pencatatan kasir</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter History */}
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No. Struk, Nama Pembeli, atau Kasir..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap">
                Total: {filteredHistory.length} Struk
              </div>
            </div>

            {/* List History */}
            <div className="overflow-y-auto flex-1 space-y-3 text-xs pr-1">
              {filteredHistory.map((h) => (
                <div key={h.id_transaksi_pos} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-[#c5a059] transition">
                  <div className="flex items-start justify-between border-b border-slate-200/60 pb-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{h.nomor_struk}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c5a059]/15 text-[#967434] border border-[#c5a059]/30">
                          {h.metode_bayar}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Pembeli: <strong className="text-slate-800">{h.nama_pembeli}</strong>
                        {h.member_id && <span className="font-mono ml-1 text-[#c5a059]">({h.member_id})</span>}
                        <span className="mx-2">•</span>
                        Kasir: <strong>{h.kasir_nama}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-base text-slate-950">
                        Rp {h.total_bayar.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{h.created_at}</div>
                    </div>
                  </div>

                  {/* Itemized Purchased List */}
                  {h.items && h.items.length > 0 && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1 mt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rincian Item Belanja:</div>
                      {h.items.map((it) => (
                        <div key={it.id_item} className="flex justify-between items-center text-xs">
                          <span className="text-slate-700">
                            {it.nama_produk} <strong className="text-slate-900 font-mono">x{it.qty}</strong>
                          </span>
                          <span className="font-mono text-slate-600">
                            Rp {it.subtotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredHistory.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Belum ada struk penjualan POS kasir.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
