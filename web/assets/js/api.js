const API_BASE = 'http://localhost:8080/api/v1';

// ── Cart State ────────────────────────────────────────────────
let cart = [];

function getCart() { return cart; }

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  updateCartUI();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
  else updateCartUI();
}

function clearCart() {
  cart = [];
  updateCartUI();
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// ── API Functions ─────────────────────────────────────────────

async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?available=true`);
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

async function createOrder(customerName, customerPhone, items) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name: customerName, customer_phone: customerPhone, items })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Gagal membuat pesanan');
  return json.data;
}

async function mockPayOrder(orderId) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/pay_mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Pembayaran gagal');
  return json.data;
}

async function getOrderStatus(orderCode) {
  const res = await fetch(`${API_BASE}/orders/${orderCode}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Pesanan tidak ditemukan');
  return json.data;
}

// ── Format Currency ───────────────────────────────────────────
function formatRp(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

// ── Render Products ───────────────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 opacity-60">
      <p class="text-xl">Memuat produk...</p>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const isHabis = p.stock_qty <= 0;
    const imgStyle = p.image_url
      ? `background-image: url('${p.image_url}'); background-size: cover; background-position: center;`
      : 'background: linear-gradient(135deg, #3a2415 0%, #6b3a1f 100%);';

    return `
    <div class="product-card glass-card overflow-hidden ${isHabis ? 'opacity-60' : ''}" data-id="${p.id}">
      <div class="relative h-48 overflow-hidden" style="${imgStyle}">
        <div class="product-img absolute inset-0" style="${imgStyle}"></div>
        ${isHabis ? `
          <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span class="tag-badge" style="background:rgba(224,101,79,0.2); border-color: rgba(224,101,79,0.5); color: #e0654f;">Stok Habis</span>
          </div>` : ''}
        ${p.category ? `<div class="absolute top-3 left-3"><span class="tag-badge text-xs">${p.category.name}</span></div>` : ''}
      </div>
      <div class="p-4">
        <h3 class="font-heading font-semibold text-white mb-1">${p.name}</h3>
        <p class="text-sm opacity-60 mb-3 line-clamp-2">${p.description || 'Roti segar berkualitas tinggi'}</p>
        <div class="flex items-center justify-between">
          <span class="text-primary font-heading font-bold text-lg">${formatRp(p.price)}</span>
          ${!isHabis ? `
          <button onclick="addToCart({id:'${p.id}', name:'${p.name}', price:${p.price}, image_url:'${p.image_url || ''}'});showCartFeedback(this)"
            class="btn-primary text-sm py-2 px-4">
            + Tambah
          </button>` : `<span class="text-sm opacity-40">Tidak tersedia</span>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Cart UI ───────────────────────────────────────────────────
function updateCartUI() {
  const items = getCart();
  const total = cartTotal();

  // Badge
  const badge = document.getElementById('cart-badge');
  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  if (badge) {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  // Cart items list
  const cartList = document.getElementById('cart-items');
  if (cartList) {
    if (items.length === 0) {
      cartList.innerHTML = `<div class="text-center py-12 opacity-50"><p>Keranjang masih kosong</p></div>`;
    } else {
      cartList.innerHTML = items.map(i => `
        <div class="flex items-center gap-3 py-3 border-b border-white/10">
          <div class="flex-1">
            <p class="font-semibold text-sm">${i.name}</p>
            <p class="text-primary text-sm">${formatRp(i.price)}</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="updateQty('${i.id}',-1)" class="w-7 h-7 rounded-full border border-white/20 hover:bg-white/10 text-sm flex items-center justify-center transition-colors">−</button>
            <span class="w-6 text-center font-bold">${i.qty}</span>
            <button onclick="updateQty('${i.id}',1)" class="w-7 h-7 rounded-full border border-white/20 hover:bg-white/10 text-sm flex items-center justify-center transition-colors">+</button>
          </div>
        </div>`).join('');
    }
  }

  // Total
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatRp(total);

  // Order summary in payment modal
  const summaryEl = document.getElementById('order-summary');
  if (summaryEl) {
    summaryEl.innerHTML = items.map(i => `
      <div class="flex justify-between text-sm py-1">
        <span class="opacity-80">${i.name} ×${i.qty}</span>
        <span class="font-semibold">${formatRp(i.price * i.qty)}</span>
      </div>`).join('');
  }
  const payTotal = document.getElementById('pay-total');
  if (payTotal) payTotal.textContent = formatRp(total);
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) payBtn.textContent = `Bayar Sekarang ${formatRp(total)}`;
}

function showCartFeedback(btn) {
  const orig = btn.textContent;
  btn.textContent = '✓ Ditambahkan';
  btn.style.background = '#7fbf6a';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '';
  }, 1200);
}

// ── Cart Drawer ───────────────────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
}
function closeCart() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
}

// ── Payment Modal ─────────────────────────────────────────────
function openPaymentModal() {
  if (cart.length === 0) return;
  closeCart();
  updateCartUI();
  document.getElementById('payment-modal-wrap')?.classList.add('open');
  document.getElementById('modal-backdrop')?.classList.add('open');
}
function closePaymentModal() {
  document.getElementById('payment-modal-wrap')?.classList.remove('open');
  document.getElementById('modal-backdrop')?.classList.remove('open');
}

// ── Process Payment ───────────────────────────────────────────
async function processPayment() {
  const customerName = document.getElementById('customer-name')?.value?.trim() || 'Guest';
  const customerPhone = document.getElementById('customer-phone')?.value?.trim() || '';

  if (cart.length === 0) return;

  const btn = document.getElementById('pay-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Memproses...';
  }

  try {
    const items = cart.map(i => ({ product_id: i.id, qty: i.qty }));
    const order = await createOrder(customerName, customerPhone, items);
    const paid = await mockPayOrder(order.id);

    closePaymentModal();
    showBarcodeModal(paid);
    clearCart();
  } catch (err) {
    alert('Pembayaran gagal: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; }
    updateCartUI();
  }
}

// ── Barcode Modal ─────────────────────────────────────────────
function showBarcodeModal(order) {
  document.getElementById('barcode-order-code').textContent = order.order_code;
  document.getElementById('barcode-total').textContent = formatRp(order.total);

  // Generate barcode
  const svg = document.getElementById('order-barcode');
  if (svg && window.JsBarcode) {
    JsBarcode(svg, order.order_code, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: false,
      background: '#ffffff',
      lineColor: '#241610',
      margin: 10
    });
  }

  // Set download link
  const downloadBtn = document.getElementById('download-barcode');
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadBarcode(order.order_code);
  }

  document.getElementById('barcode-modal-wrap')?.classList.add('open');
  document.getElementById('modal-backdrop')?.classList.add('open');
}

function closeBarcodeModal() {
  document.getElementById('barcode-modal-wrap')?.classList.remove('open');
  document.getElementById('modal-backdrop')?.classList.remove('open');
}

function downloadBarcode(orderCode) {
  const svg = document.getElementById('order-barcode');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width = svg.width?.baseVal?.value || 300;
  canvas.height = svg.height?.baseVal?.value || 100;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.download = `kaya-pesanan-${orderCode}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

// ── Order Status Check (Hero) ─────────────────────────────────
async function checkHeroOrderStatus() {
  const input = document.getElementById('hero-order-code');
  const code = input?.value?.trim();
  if (!code) return;
  window.location.href = `order-status.html?code=${encodeURIComponent(code)}`;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateCartUI();

  // Load products
  const products = await fetchProducts();
  renderProducts(products);

  // Update hero stats from products
  const availCount = products.filter(p => p.stock_qty > 0).length;
  const stockEl = document.getElementById('hero-stock-count');
  if (stockEl) stockEl.textContent = availCount + ' item';

  const topsorted = [...products].sort((a, b) => b.sold_qty - a.sold_qty);
  const topEl = document.getElementById('hero-top-product');
  if (topEl && topsorted[0]) topEl.textContent = topsorted[0].name;

  // Cart drawer events
  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', openPaymentModal);

  // Payment modal events
  document.getElementById('close-payment')?.addEventListener('click', closePaymentModal);
  document.getElementById('pay-btn')?.addEventListener('click', processPayment);

  // Barcode modal events
  document.getElementById('close-barcode')?.addEventListener('click', closeBarcodeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closePaymentModal();
      closeBarcodeModal();
    }
  });

  // Hero order code check
  document.getElementById('hero-check-btn')?.addEventListener('click', checkHeroOrderStatus);
  document.getElementById('hero-order-code')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkHeroOrderStatus();
  });

  // Nav scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    if (nav) {
      if (window.scrollY > 50) {
        nav.style.background = 'rgba(36,22,16,0.95)';
      } else {
        nav.style.background = 'rgba(36,22,16,0.7)';
      }
    }
  });
});
