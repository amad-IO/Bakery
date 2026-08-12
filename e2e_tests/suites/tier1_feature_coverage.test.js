/**
 * Tier 1: Feature Coverage E2E Test Suite
 * Covers >=5 tests for each of 6 feature areas:
 * 1. API Endpoints (Auth, Catalog)
 * 2. Pre-Orders (Guest Flow)
 * 3. POS (Cashier Operations)
 * 4. Admin Operations
 * 5. Landing Page Data & Contract
 * 6. Order Status Lookup
 */

async function runTier1Tests(client, ctx) {
  ctx.currentSuite = 'Tier 1: Feature Coverage';

  // State to pass across tests within Tier 1
  let adminToken = null;
  let cashierToken = null;
  let createdPreorderCode = null;
  let createdPreorderId = null;
  let createdPosProductId = null;
  let createdCashierUserId = null;

  // --- AREA 1: API ENDPOINTS (AUTH & CATALOG CORE) ---

  // 1. Admin login
  try {
    const res = await client.post('/auth/login', {
      email: 'owner@kaya.id',
      password: 'rahasia123',
    });
    ctx.assertEqual(res.status, 200, 'Admin login status code');
    ctx.assertEqual(res.data.success, true, 'Admin login success flag');
    ctx.assert(res.data.data.token, 'Admin login returns token');
    ctx.assertEqual(res.data.data.user.role, 'admin', 'Admin login user role');
    adminToken = res.data.data.token;
    ctx.recordPass('1.1 test_admin_login_success');
  } catch (err) {
    ctx.recordFail('1.1 test_admin_login_success', err);
  }

  // 2. Cashier login
  try {
    const res = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    ctx.assertEqual(res.status, 200, 'Cashier login status code');
    ctx.assertEqual(res.data.success, true, 'Cashier login success flag');
    ctx.assert(res.data.data.token, 'Cashier login returns token');
    ctx.assertEqual(res.data.data.user.role, 'kasir', 'Cashier login user role');
    cashierToken = res.data.data.token;
    ctx.recordPass('1.2 test_cashier_login_success');
  } catch (err) {
    ctx.recordFail('1.2 test_cashier_login_success', err);
  }

  // 3. GET /auth/me
  try {
    client.setToken(adminToken);
    const res = await client.get('/auth/me');
    ctx.assertEqual(res.status, 200, 'GET /auth/me status code');
    ctx.assertEqual(res.data.data.email, 'owner@kaya.id', 'GET /auth/me email');
    client.clearToken();
    ctx.recordPass('1.3 test_auth_me_endpoint');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.3 test_auth_me_endpoint', err);
  }

  // 4. GET /categories
  try {
    const res = await client.get('/categories');
    ctx.assertEqual(res.status, 200, 'GET /categories status code');
    ctx.assert(Array.isArray(res.data.data), 'Categories data is array');
    ctx.assert(res.data.data.length >= 1, 'Categories array not empty');
    ctx.recordPass('1.4 test_get_categories');
  } catch (err) {
    ctx.recordFail('1.4 test_get_categories', err);
  }

  // 5. GET /products
  try {
    const res = await client.get('/products');
    ctx.assertEqual(res.status, 200, 'GET /products status code');
    ctx.assert(Array.isArray(res.data.data), 'Products data is array');
    ctx.assert(res.data.data.length >= 1, 'Products array not empty');
    ctx.recordPass('1.5 test_get_products');
  } catch (err) {
    ctx.recordFail('1.5 test_get_products', err);
  }

  // 6. GET /products/:slug
  try {
    const res = await client.get('/products/roti-coklat-premium');
    ctx.assertEqual(res.status, 200, 'GET /products/:slug status code');
    ctx.assertEqual(res.data.data.slug, 'roti-coklat-premium', 'Product detail slug');
    ctx.assert(typeof res.data.data.price === 'number', 'Product price is number');
    ctx.recordPass('1.6 test_get_product_detail');
  } catch (err) {
    ctx.recordFail('1.6 test_get_product_detail', err);
  }

  // --- AREA 2: PRE-ORDERS (GUEST FLOW) ---

  // 7. POST /orders (Public Pre-order)
  try {
    const res = await client.post('/orders', {
      customer_name: 'Budi Santoso',
      customer_phone: '081299998888',
      items: [
        { product_id: 'prod-001', qty: 2 },
        { product_id: 'prod-002', qty: 1 },
      ],
    });
    ctx.assert(res.status === 200 || res.status === 201, 'POST /orders status 200/201');
    ctx.assert(res.data.data.order_code, 'Preorder returns order_code');
    ctx.assertMatches(res.data.data.order_code, /^KYA-\d{8}-\d{4}$/, 'Order code format KYA-YYYYMMDD-XXXX');
    ctx.assertEqual(res.data.data.status, 'pending_payment', 'Initial status pending_payment');
    createdPreorderCode = res.data.data.order_code;
    createdPreorderId = res.data.data.id;
    ctx.recordPass('1.7 test_create_preorder');
  } catch (err) {
    ctx.recordFail('1.7 test_create_preorder', err);
  }

  // 8. Pre-order total price snapshot calculation check
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assertEqual(res.status, 200, 'GET /orders/:code status');
    // prod-001 (15000 * 2 = 30000) + prod-002 (18000 * 1 = 18000) = 48000
    ctx.assertEqual(res.data.data.total, 48000, 'Server calculated master total snapshot');
    ctx.recordPass('1.8 test_preorder_price_snapshot');
  } catch (err) {
    ctx.recordFail('1.8 test_preorder_price_snapshot', err);
  }

  // 9. POST /orders/:id/pay_mock
  try {
    const res = await client.post(`/orders/${createdPreorderId}/pay_mock`, {});
    ctx.assertEqual(res.status, 200, 'pay_mock status 200');
    ctx.assertEqual(res.data.data.status, 'paid', 'Status transitioned to paid');
    ctx.recordPass('1.9 test_mock_payment');
  } catch (err) {
    ctx.recordFail('1.9 test_mock_payment', err);
  }

  // 10. pay_mock barcode payload verification
  try {
    const res = await client.post(`/orders/${createdPreorderId}/pay_mock`, {});
    ctx.assertEqual(res.status, 200, 'pay_mock status');
    ctx.assert(res.data.data.barcode_data, 'Barcode data present');
    ctx.assertEqual(res.data.data.order_code, createdPreorderCode, 'Order code matches barcode');
    ctx.recordPass('1.10 test_mock_payment_barcode_data');
  } catch (err) {
    ctx.recordFail('1.10 test_mock_payment_barcode_data', err);
  }

  // 11. Preorder stock decrement verification
  try {
    const prodRes = await client.get('/products/roti-coklat-premium');
    ctx.assertEqual(prodRes.status, 200, 'GET product status');
    // Started with stock 50, ordered 2 -> remaining 48
    ctx.assertEqual(prodRes.data.data.stock_qty, 48, 'Stock decremented after paid order');
    ctx.recordPass('1.11 test_preorder_stock_decrement');
  } catch (err) {
    ctx.recordFail('1.11 test_preorder_stock_decrement', err);
  }

  // --- AREA 3: POS (CASHIER OPERATIONS) ---

  let posOrderId = null;

  // 12. POST /pos/orders (Walk-in order)
  try {
    client.setToken(cashierToken);
    const res = await client.post('/pos/orders', {
      customer_name: 'Walk-in Guest',
      items: [{ product_id: 'prod-001', qty: 1 }],
    });
    ctx.assert(res.status === 200 || res.status === 201, 'POS order created status');
    ctx.assertEqual(res.data.data.order_type, 'pos', 'Order type is pos');
    ctx.assert(res.data.data.cashier_id, 'Cashier ID populated from token');
    posOrderId = res.data.data.id;
    client.clearToken();
    ctx.recordPass('1.12 test_pos_create_walkin_order');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.12 test_pos_create_walkin_order', err);
  }

  // 13. GET /pos/orders/scan/:order_code
  try {
    client.setToken(cashierToken);
    const res = await client.get(`/pos/orders/scan/${createdPreorderCode}`);
    ctx.assertEqual(res.status, 200, 'POS scan order status code');
    ctx.assertEqual(res.data.data.order_code, createdPreorderCode, 'Scanned code matches');
    client.clearToken();
    ctx.recordPass('1.13 test_pos_scan_order');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.13 test_pos_scan_order', err);
  }

  // 14. PATCH /pos/orders/:id/status
  try {
    client.setToken(cashierToken);
    const res = await client.patch(`/pos/orders/${createdPreorderId}/status`, {
      status: 'completed',
    });
    ctx.assertEqual(res.status, 200, 'Update order status 200');
    ctx.assertEqual(res.data.data.status, 'completed', 'Status updated to completed');
    client.clearToken();
    ctx.recordPass('1.14 test_pos_update_order_status');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.14 test_pos_update_order_status', err);
  }

  // 15. POST /pos/orders/:id/payments
  try {
    client.setToken(cashierToken);
    const res = await client.post(`/pos/orders/${posOrderId}/payments`, {
      method: 'qris',
      amount: 15000,
      reference_no: 'QRIS-TEST-001',
    });
    ctx.assertEqual(res.status, 200, 'Record payment status 200');
    ctx.assertEqual(res.data.data.method, 'qris', 'Payment method qris');
    client.clearToken();
    ctx.recordPass('1.15 test_pos_record_payment');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.15 test_pos_record_payment', err);
  }

  // 16. POST /pos/products (Cashier add new product)
  try {
    client.setToken(cashierToken);
    const res = await client.post('/pos/products', {
      name: 'Roti Pisang Coklat',
      category_id: 'cat-roti-001',
      price: 16000,
      description: 'Roti manis isi pisang & coklat',
      sku: `RPC-${Date.now()}`,
    });
    ctx.assert(res.status === 200 || res.status === 201, 'Cashier add product status');
    ctx.assertEqual(res.data.data.stock_qty, 0, 'New product default stock 0');
    createdPosProductId = res.data.data.id;
    client.clearToken();
    ctx.recordPass('1.16 test_pos_add_product');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.16 test_pos_add_product', err);
  }

  // 17. PATCH /pos/products/:id/stock (Quick restock)
  try {
    client.setToken(cashierToken);
    const res = await client.patch(`/pos/products/${createdPosProductId}/stock`, {
      qty: 30,
      note: 'Restock Pagi',
    });
    ctx.assertEqual(res.status, 200, 'Stock restock status 200');
    ctx.assertEqual(res.data.data.product.stock_qty, 30, 'Product stock updated to 30');
    ctx.assertEqual(res.data.data.stock_movement.type, 'in', 'Movement type in');
    client.clearToken();
    ctx.recordPass('1.17 test_pos_quick_restock');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.17 test_pos_quick_restock', err);
  }

  // --- AREA 4: ADMIN OPERATIONS ---

  // 18. GET /admin/dashboard/stats
  try {
    client.setToken(adminToken);
    const res = await client.get('/admin/dashboard/stats');
    ctx.assertEqual(res.status, 200, 'Admin stats status 200');
    ctx.assert(typeof res.data.data.revenue_today === 'number', 'Revenue today is number');
    ctx.assert(typeof res.data.data.orders_today === 'number', 'Orders today is number');
    client.clearToken();
    ctx.recordPass('1.18 test_admin_dashboard_stats');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.18 test_admin_dashboard_stats', err);
  }

  // 19. GET /admin/logs
  try {
    client.setToken(adminToken);
    const res = await client.get('/admin/logs');
    ctx.assertEqual(res.status, 200, 'Admin logs status 200');
    ctx.assert(Array.isArray(res.data.data), 'Activity logs data is array');
    client.clearToken();
    ctx.recordPass('1.19 test_admin_activity_logs');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.19 test_admin_activity_logs', err);
  }

  // 20. GET /admin/settings
  try {
    client.setToken(adminToken);
    const res = await client.get('/admin/settings');
    ctx.assertEqual(res.status, 200, 'Admin settings GET status');
    ctx.assert(res.data.data.store_name, 'Store name present');
    client.clearToken();
    ctx.recordPass('1.20 test_admin_get_settings');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.20 test_admin_get_settings', err);
  }

  // 21. PATCH /admin/settings
  try {
    client.setToken(adminToken);
    const res = await client.patch('/admin/settings', {
      store_open_time: '06:30',
    });
    ctx.assertEqual(res.status, 200, 'Admin settings PATCH status');
    ctx.assertEqual(res.data.data.store_open_time, '06:30', 'Store open time updated');
    client.clearToken();
    ctx.recordPass('1.21 test_admin_update_settings');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.21 test_admin_update_settings', err);
  }

  // 22. GET /admin/users?role=kasir
  try {
    client.setToken(adminToken);
    const res = await client.get('/admin/users?role=kasir');
    ctx.assertEqual(res.status, 200, 'Admin list cashiers status');
    ctx.assert(Array.isArray(res.data.data), 'Cashiers data is array');
    client.clearToken();
    ctx.recordPass('1.22 test_admin_list_cashiers');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.22 test_admin_list_cashiers', err);
  }

  // 23. POST /admin/users
  try {
    client.setToken(adminToken);
    const res = await client.post('/admin/users', {
      name: 'Sari Kasir Baru',
      email: `sari-${Date.now()}@kaya.id`,
      phone: '081377776666',
      password: 'kasirpassword123',
      role: 'kasir',
    });
    ctx.assert(res.status === 200 || res.status === 201, 'Create cashier user status');
    ctx.assertEqual(res.data.data.role, 'kasir', 'New user role kasir');
    createdCashierUserId = res.data.data.id;
    client.clearToken();
    ctx.recordPass('1.23 test_admin_create_cashier');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.23 test_admin_create_cashier', err);
  }

  // 24. PATCH /admin/users/:id (Toggle is_active)
  try {
    client.setToken(adminToken);
    const res = await client.patch(`/admin/users/${createdCashierUserId}`, {
      is_active: false,
    });
    ctx.assertEqual(res.status, 200, 'Toggle user status 200');
    ctx.assertEqual(res.data.data.is_active, false, 'User is_active updated to false');
    client.clearToken();
    ctx.recordPass('1.24 test_admin_toggle_cashier_active');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.24 test_admin_toggle_cashier_active', err);
  }

  // 25. PATCH /admin/products/:id (Admin edit product)
  try {
    client.setToken(adminToken);
    const res = await client.patch(`/admin/products/${createdPosProductId}`, {
      price: 17500,
    });
    ctx.assertEqual(res.status, 200, 'Admin product price edit status');
    ctx.assertEqual(res.data.data.price, 17500, 'Price updated by admin');
    client.clearToken();
    ctx.recordPass('1.25 test_admin_edit_product');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('1.25 test_admin_edit_product', err);
  }

  // --- AREA 5: LANDING PAGE DATA & CONTRACT ---

  // 26. Catalog live fetch contract
  try {
    const res = await client.get('/products');
    ctx.assertEqual(res.status, 200, 'GET /products status');
    const firstItem = res.data.data[0];
    ctx.assert(typeof firstItem.stock_qty === 'number', 'stock_qty integer present');
    ctx.assert(typeof firstItem.is_available === 'boolean', 'is_available boolean present');
    ctx.recordPass('1.26 test_landing_catalog_live_fetch');
  } catch (err) {
    ctx.recordFail('1.26 test_landing_catalog_live_fetch', err);
  }

  // 27. Catalog zero stock visual indicator flag
  try {
    const res = await client.get('/products');
    const zeroStockItem = res.data.data.find(p => p.stock_qty === 0);
    ctx.assert(zeroStockItem !== undefined, 'Zero stock item exists in catalog');
    ctx.assertEqual(zeroStockItem.is_available, true, 'is_available is true despite stock=0');
    ctx.recordPass('1.27 test_landing_catalog_zero_stock_flag');
  } catch (err) {
    ctx.recordFail('1.27 test_landing_catalog_zero_stock_flag', err);
  }

  // 28. Category filter on landing page catalog
  try {
    const res = await client.get('/products?category=roti-manis');
    ctx.assertEqual(res.status, 200, 'Filtered products status');
    ctx.assert(res.data.data.length >= 1, 'Category filtered array not empty');
    ctx.recordPass('1.28 test_landing_category_filter');
  } catch (err) {
    ctx.recordFail('1.28 test_landing_category_filter', err);
  }

  // 29. Search filter on landing page catalog
  try {
    const res = await client.get('/products?search=coklat');
    ctx.assertEqual(res.status, 200, 'Search products status');
    ctx.assert(res.data.data.length >= 1, 'Search results array not empty');
    ctx.recordPass('1.29 test_landing_search_filter');
  } catch (err) {
    ctx.recordFail('1.29 test_landing_search_filter', err);
  }

  // 30. Code128 format check for jsbarcode
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    const code = res.data.data.order_code;
    ctx.assertMatches(code, /^KYA-[0-9]{8}-[0-9]{4}$/, 'Code128 valid ASCII format');
    ctx.recordPass('1.30 test_barcode_code128_format');
  } catch (err) {
    ctx.recordFail('1.30 test_barcode_code128_format', err);
  }

  // --- AREA 6: ORDER STATUS LOOKUP ---

  // 31. Public order status lookup
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assertEqual(res.status, 200, 'Public order status GET 200');
    ctx.assertEqual(res.data.data.order_code, createdPreorderCode, 'Order code matches');
    ctx.recordPass('1.31 test_order_status_lookup_public');
  } catch (err) {
    ctx.recordFail('1.31 test_order_status_lookup_public', err);
  }

  // 32. Order status no sensitive fields
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assertEqual(res.data.data.password, undefined, 'No password leak');
    ctx.assertEqual(res.data.data.password_hash, undefined, 'No password_hash leak');
    ctx.recordPass('1.32 test_order_status_no_sensitive_data');
  } catch (err) {
    ctx.recordFail('1.32 test_order_status_no_sensitive_data', err);
  }

  // 33. Order status lifecycle paid
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assert(res.data.data.status === 'paid' || res.data.data.status === 'completed', 'Order status is paid or completed');
    ctx.recordPass('1.33 test_order_status_lifecycle_paid');
  } catch (err) {
    ctx.recordFail('1.33 test_order_status_lifecycle_paid', err);
  }

  // 34. Order status lifecycle completed
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assertEqual(res.data.data.status, 'completed', 'Order status is completed after cashier action');
    ctx.recordPass('1.34 test_order_status_lifecycle_completed');
  } catch (err) {
    ctx.recordFail('1.34 test_order_status_lifecycle_completed', err);
  }

  // 35. Order status items array verification
  try {
    const res = await client.get(`/orders/${createdPreorderCode}`);
    ctx.assert(Array.isArray(res.data.data.items), 'Order items array present');
    ctx.assert(res.data.data.items.length >= 1, 'Order items count >= 1');
    ctx.recordPass('1.35 test_order_status_items_array');
  } catch (err) {
    ctx.recordFail('1.35 test_order_status_items_array', err);
  }
}

module.exports = { runTier1Tests };
