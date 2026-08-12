/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Tests edge cases, validation, RBAC security bounds, invalid inputs, and error handling.
 */

async function runTier2Tests(client, ctx) {
  ctx.currentSuite = 'Tier 2: Boundary & Corner Cases';

  // 1. Empty input pre-order
  try {
    const res = await client.post('/orders', {
      customer_name: '',
      items: [],
    });
    ctx.assertEqual(res.status, 400, 'Empty pre-order rejected with 400');
    ctx.assertEqual(res.data.success, false, 'Success flag false');
    ctx.assertEqual(res.data.error.code, 'VALIDATION_ERROR', 'Error code VALIDATION_ERROR');
    ctx.recordPass('2.1 test_empty_input_preorder');
  } catch (err) {
    ctx.recordFail('2.1 test_empty_input_preorder', err);
  }

  // 2. Invalid order code lookup
  try {
    const res = await client.get('/orders/KYA-99999999-9999');
    ctx.assertEqual(res.status, 404, 'Non-existent order code returns 404');
    ctx.assertEqual(res.data.success, false, 'Success flag false');
    ctx.assertEqual(res.data.error.code, 'NOT_FOUND', 'Error code NOT_FOUND');
    ctx.recordPass('2.2 test_invalid_order_code_lookup');
  } catch (err) {
    ctx.recordFail('2.2 test_invalid_order_code_lookup', err);
  }

  // 3. Unauthenticated access to protected endpoint
  try {
    client.clearToken();
    const res = await client.get('/admin/dashboard/stats');
    ctx.assertEqual(res.status, 401, 'Unauthenticated call returns 401');
    ctx.assertEqual(res.data.success, false, 'Success flag false');
    ctx.assertEqual(res.data.error.code, 'UNAUTHORIZED', 'Error code UNAUTHORIZED');
    ctx.recordPass('2.3 test_unauthenticated_protected_endpoint');
  } catch (err) {
    ctx.recordFail('2.3 test_unauthenticated_protected_endpoint', err);
  }

  // 4. Cashier forbidden on admin endpoint (403)
  try {
    const loginRes = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    client.setToken(loginRes.data.data.token);

    const res = await client.get('/admin/dashboard/stats');
    ctx.assertEqual(res.status, 403, 'Cashier accessing admin stats returns 403');
    ctx.assertEqual(res.data.success, false, 'Success flag false');
    ctx.assertEqual(res.data.error.code, 'FORBIDDEN', 'Error code FORBIDDEN');
    client.clearToken();
    ctx.recordPass('2.4 test_cashier_forbidden_admin_endpoint');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('2.4 test_cashier_forbidden_admin_endpoint', err);
  }

  // 5. Inactive cashier login rejection
  try {
    const res = await client.post('/auth/login', {
      email: 'doni@kaya.id', // Inactive cashier
      password: 'kasir123',
    });
    ctx.assert(res.status === 403 || res.status === 401, 'Inactive user login rejected 403/401');
    ctx.assertEqual(res.data.success, false, 'Success flag false');
    ctx.recordPass('2.5 test_inactive_cashier_login_rejection');
  } catch (err) {
    ctx.recordFail('2.5 test_inactive_cashier_login_rejection', err);
  }

  // 6. Client price payload manipulation rejection
  try {
    const res = await client.post('/orders', {
      customer_name: 'Hacker Joe',
      customer_phone: '0811111111',
      items: [
        { product_id: 'prod-001', qty: 2, price: 1 }, // Try sending price: 1 IDR
      ],
    });
    ctx.assert(res.status === 200 || res.status === 201, 'Preorder created');
    // Backend master price is 15000 -> total for 2 items must be 30000, NOT 2 IDR!
    ctx.assertEqual(res.data.data.total, 30000, 'Server recalculates total from master DB price');
    ctx.recordPass('2.6 test_invalid_price_payload_rejection');
  } catch (err) {
    ctx.recordFail('2.6 test_invalid_price_payload_rejection', err);
  }

  // 7. Negative / zero qty restock rejection
  try {
    const loginRes = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    client.setToken(loginRes.data.data.token);

    const res = await client.patch('/pos/products/prod-001/stock', {
      qty: -10,
    });
    ctx.assertEqual(res.status, 400, 'Negative stock update rejected 400');
    ctx.assertEqual(res.data.error.code, 'VALIDATION_ERROR', 'Error code VALIDATION_ERROR');
    client.clearToken();
    ctx.recordPass('2.7 test_negative_qty_restock_rejection');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('2.7 test_negative_qty_restock_rejection', err);
  }

  // 8. Non-existent product preorder rejection
  try {
    const res = await client.post('/orders', {
      customer_name: 'Unknown Item Buyer',
      items: [{ product_id: 'prod-non-existent-uuid', qty: 1 }],
    });
    ctx.assertEqual(res.status, 400, 'Non-existent product rejected with 400');
    ctx.assertEqual(res.data.error.code, 'VALIDATION_ERROR', 'Error code VALIDATION_ERROR');
    ctx.recordPass('2.8 test_nonexistent_product_preorder_rejection');
  } catch (err) {
    ctx.recordFail('2.8 test_nonexistent_product_preorder_rejection', err);
  }

  // 9. Duplicate user email rejection (409 CONFLICT)
  try {
    const adminLogin = await client.post('/auth/login', {
      email: 'owner@kaya.id',
      password: 'rahasia123',
    });
    client.setToken(adminLogin.data.data.token);

    const res = await client.post('/admin/users', {
      name: 'Duplicate Owner',
      email: 'owner@kaya.id', // Already exists
      password: 'password123',
      role: 'kasir',
    });
    ctx.assertEqual(res.status, 409, 'Duplicate email returns 409 CONFLICT');
    ctx.assertEqual(res.data.error.code, 'CONFLICT', 'Error code CONFLICT');
    client.clearToken();
    ctx.recordPass('2.9 test_duplicate_user_email_rejection');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('2.9 test_duplicate_user_email_rejection', err);
  }

  // 10. Cashier forbidden to create user
  try {
    const cashierLogin = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    client.setToken(cashierLogin.data.data.token);

    const res = await client.post('/admin/users', {
      name: 'Sneaky User',
      email: 'sneaky@kaya.id',
      password: 'password123',
      role: 'kasir',
    });
    ctx.assertEqual(res.status, 403, 'Cashier creating user returns 403 FORBIDDEN');
    ctx.assertEqual(res.data.error.code, 'FORBIDDEN', 'Error code FORBIDDEN');
    client.clearToken();
    ctx.recordPass('2.10 test_cashier_cannot_create_user');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('2.10 test_cashier_cannot_create_user', err);
  }
}

module.exports = { runTier2Tests };
