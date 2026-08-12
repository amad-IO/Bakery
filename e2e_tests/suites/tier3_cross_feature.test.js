/**
 * Tier 3: Cross-Feature Combinations E2E Test Suite
 * Tests multi-step integration workflows across public, cashier, and admin boundaries.
 */

async function runTier3Tests(client, ctx) {
  ctx.currentSuite = 'Tier 3: Cross-Feature Combinations';

  // --- WORKFLOW 1: Pre-order -> Mock Payment -> Stock Decrement -> Cashier Scan -> Admin Stats & Logs ---
  try {
    // 1. Initial product stock check
    const prodBefore = await client.get('/products/roti-keju-spesial');
    const initialStock = prodBefore.data.data.stock_qty;

    // 2. Customer creates pre-order
    const preorderRes = await client.post('/orders', {
      customer_name: 'Workflow Customer 1',
      customer_phone: '081255554444',
      items: [{ product_id: prodBefore.data.data.id, qty: 2 }],
    });
    ctx.assert(preorderRes.status === 200 || preorderRes.status === 201, 'Preorder creation status');
    const orderId = preorderRes.data.data.id;
    const orderCode = preorderRes.data.data.order_code;
    ctx.assertEqual(preorderRes.data.data.status, 'pending_payment', 'Initial status pending_payment');

    // 3. Customer executes mock payment
    const payRes = await client.post(`/orders/${orderId}/pay_mock`, {});
    ctx.assertEqual(payRes.status, 200, 'Mock payment status 200');
    ctx.assertEqual(payRes.data.data.status, 'paid', 'Status transitioned to paid');

    // 4. Verify stock decremented automatically by 2
    const prodAfter = await client.get('/products/roti-keju-spesial');
    ctx.assertEqual(prodAfter.data.data.stock_qty, initialStock - 2, 'Stock decremented after paid pre-order');

    // 5. Cashier logs in and scans order code
    const cashierLogin = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    client.setToken(cashierLogin.data.data.token);

    const scanRes = await client.get(`/pos/orders/scan/${orderCode}`);
    ctx.assertEqual(scanRes.status, 200, 'Cashier barcode scan status 200');
    ctx.assertEqual(scanRes.data.data.order_code, orderCode, 'Scanned order code matches');
    ctx.assertEqual(scanRes.data.data.status, 'paid', 'Order status verified as paid');

    // 6. Cashier hands over items and updates order to completed
    const updateRes = await client.patch(`/pos/orders/${orderId}/status`, {
      status: 'completed',
    });
    ctx.assertEqual(updateRes.status, 200, 'Update status completed 200');
    ctx.assertEqual(updateRes.data.data.status, 'completed', 'Order status completed');
    client.clearToken();

    // 7. Admin checks stats and logs
    const adminLogin = await client.post('/auth/login', {
      email: 'owner@kaya.id',
      password: 'rahasia123',
    });
    client.setToken(adminLogin.data.data.token);

    const statsRes = await client.get('/admin/dashboard/stats');
    ctx.assertEqual(statsRes.status, 200, 'Admin stats GET 200');
    ctx.assert(statsRes.data.data.revenue_today > 0, 'Admin stats revenue updated');

    const logsRes = await client.get('/admin/logs');
    ctx.assertEqual(logsRes.status, 200, 'Admin logs GET 200');
    ctx.assert(logsRes.data.data.length > 0, 'Activity logs present');
    client.clearToken();

    ctx.recordPass('3.1 workflow_preorder_pay_scan_complete_admin_audit');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('3.1 workflow_preorder_pay_scan_complete_admin_audit', err);
  }

  // --- WORKFLOW 2: Cashier Product Creation -> Stock Restock -> POS Walk-in Sale -> Stock Audit ---
  try {
    // 1. Cashier logs in
    const cashierLogin = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    const cashierToken = cashierLogin.data.data.token;
    client.setToken(cashierToken);

    // 2. Cashier adds a new product (defaults stock = 0)
    const newProdRes = await client.post('/pos/products', {
      name: 'Roti Sosis Super',
      category_id: 'cat-roti-001',
      price: 20000,
      description: 'Roti isi sosis sapi jumbo',
      sku: `RSS-${Date.now()}`,
    });
    ctx.assertEqual(newProdRes.data.data.stock_qty, 0, 'New product initial stock 0');
    const newProdId = newProdRes.data.data.id;

    // 3. Cashier restocks 50 units
    const restockRes = await client.patch(`/pos/products/${newProdId}/stock`, {
      qty: 50,
      note: 'Stok awal sosis super',
    });
    ctx.assertEqual(restockRes.data.data.product.stock_qty, 50, 'Restocked quantity is 50');

    // 4. Cashier sells 3 units via POS walk-in order
    const posOrderRes = await client.post('/pos/orders', {
      customer_name: 'Bapak Ahmad',
      items: [{ product_id: newProdId, qty: 3 }],
    });
    const posOrderId = posOrderRes.data.data.id;

    // 5. Cashier receives cash payment
    const paymentRes = await client.post(`/pos/orders/${posOrderId}/payments`, {
      method: 'cash',
      amount: 60000,
    });
    ctx.assertEqual(paymentRes.data.data.status, 'success', 'Payment status success');

    // 6. Verify inventory automatically decremented from 50 to 47
    const checkProd = await client.get('/products');
    const soldItem = checkProd.data.data.find(p => p.id === newProdId);
    ctx.assertEqual(soldItem.stock_qty, 47, 'Remaining stock is 47 after POS sale');
    client.clearToken();

    ctx.recordPass('3.2 workflow_cashier_product_restock_pos_sale_inventory_deduction');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('3.2 workflow_cashier_product_restock_pos_sale_inventory_deduction', err);
  }

  // --- WORKFLOW 3: Admin User Lifecycle & Access Control ---
  try {
    // 1. Admin logs in
    const adminLogin = await client.post('/auth/login', {
      email: 'owner@kaya.id',
      password: 'rahasia123',
    });
    client.setToken(adminLogin.data.data.token);

    // 2. Admin creates new cashier account
    const newEmail = `kasir-test-${Date.now()}@kaya.id`;
    const createUserRes = await client.post('/admin/users', {
      name: 'Kasir Temporer',
      email: newEmail,
      phone: '089900001111',
      password: 'tempkasirpass',
      role: 'kasir',
    });
    const newUserId = createUserRes.data.data.id;
    client.clearToken();

    // 3. New cashier logs in successfully
    const tempLoginRes = await client.post('/auth/login', {
      email: newEmail,
      password: 'tempkasirpass',
    });
    ctx.assertEqual(tempLoginRes.status, 200, 'New cashier login successful');
    const tempToken = tempLoginRes.data.data.token;

    // 4. Cashier tries to access admin settings -> 403 FORBIDDEN
    client.setToken(tempToken);
    const forbiddenRes = await client.get('/admin/settings');
    ctx.assertEqual(forbiddenRes.status, 403, 'Cashier access to admin settings forbidden (403)');
    client.clearToken();

    // 5. Admin deactivates cashier account
    client.setToken(adminLogin.data.data.token);
    const deactivateRes = await client.patch(`/admin/users/${newUserId}`, {
      is_active: false,
    });
    ctx.assertEqual(deactivateRes.data.data.is_active, false, 'Cashier deactivated');
    client.clearToken();

    // 6. Deactivated cashier login attempt -> rejected (403/401)
    const failedLoginRes = await client.post('/auth/login', {
      email: newEmail,
      password: 'tempkasirpass',
    });
    ctx.assert(failedLoginRes.status === 403 || failedLoginRes.status === 401, 'Deactivated user login rejected');

    ctx.recordPass('3.3 workflow_admin_user_lifecycle_and_access_control');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('3.3 workflow_admin_user_lifecycle_and_access_control', err);
  }
}

module.exports = { runTier3Tests };
