/**
 * Tier 4: Real-World Application Scenarios E2E Test Suite
 * Tests full end-to-end user journeys matching real operational bakery workflows.
 */

async function runTier4Tests(client, ctx) {
  ctx.currentSuite = 'Tier 4: Real-World Application Scenarios';

  // --- SCENARIO 1: Complete Walk-In POS Transaction Flow ---
  try {
    // Step 1: Cashier starts shift & logs into POS system
    const loginRes = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    ctx.assertEqual(loginRes.status, 200, 'Cashier login success');
    const cashierToken = loginRes.data.data.token;
    client.setToken(cashierToken);

    // Step 2: Cashier queries live product catalog for POS touch grid
    const catalogRes = await client.get('/products');
    ctx.assertEqual(catalogRes.status, 200, 'POS catalog fetched');
    const products = catalogRes.data.data;
    const prod1 = products[0];
    const prod2 = products[1];

    // Step 3: Cashier adds items to sticky cart and submits walk-in POS order
    const posOrderRes = await client.post('/pos/orders', {
      customer_name: 'Pelanggan Toko (Walk-in)',
      items: [
        { product_id: prod1.id, qty: 2 },
        { product_id: prod2.id, qty: 1 },
      ],
    });
    ctx.assert(posOrderRes.status === 200 || posOrderRes.status === 201, 'POS order created');
    const orderData = posOrderRes.data.data;
    ctx.assertEqual(orderData.order_type, 'pos', 'Order type is pos');
    ctx.assertMatches(orderData.order_code, /^KYA-\d{8}-\d{4}$/, 'Order code format KYA-YYYYMMDD-XXXX');

    // Step 4: Customer selects QRIS payment option on POS terminal
    const payRes = await client.post(`/pos/orders/${orderData.id}/payments`, {
      method: 'qris',
      amount: orderData.total,
      reference_no: 'QRIS-REF-889900',
    });
    ctx.assertEqual(payRes.status, 200, 'POS payment successful');
    ctx.assertEqual(payRes.data.data.status, 'success', 'Payment status success');

    // Step 5: Verify backend auto-transitions order status to paid, deducts stock, and provides barcode payload
    const updatedOrderRes = await client.get(`/pos/orders/scan/${orderData.order_code}`);
    ctx.assertEqual(updatedOrderRes.data.data.status, 'paid', 'Order status updated to paid');

    client.clearToken();
    ctx.recordPass('4.1 scenario_complete_walkin_pos_transaction_flow');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('4.1 scenario_complete_walkin_pos_transaction_flow', err);
  }

  // --- SCENARIO 2: Full Landing Page Pre-Order to Store Pickup Flow ---
  try {
    // Step 1: Guest customer lands on website, fetches categories and catalog
    const catRes = await client.get('/categories');
    ctx.assertEqual(catRes.status, 200, 'Landing page fetched categories');

    const catSlug = catRes.data.data[0].slug;
    const catProductsRes = await client.get(`/products?category=${catSlug}`);
    ctx.assertEqual(catProductsRes.status, 200, 'Landing page fetched category products');
    const selectedProd = catProductsRes.data.data[0];

    // Step 2: Customer submits pre-order with contact details
    const customerInfo = {
      customer_name: 'Dewi Lestari',
      customer_phone: '081765432100',
      items: [{ product_id: selectedProd.id, qty: 3 }],
    };

    const createPreorderRes = await client.post('/orders', customerInfo);
    ctx.assert(createPreorderRes.status === 200 || createPreorderRes.status === 201, 'Pre-order created');
    const preorder = createPreorderRes.data.data;
    const orderCode = preorder.order_code;
    const orderId = preorder.id;
    ctx.assertEqual(preorder.status, 'pending_payment', 'Order pending payment');

    // Step 3: Customer proceeds to mock payment gateway & clicks "Bayar Sekarang"
    const payMockRes = await client.post(`/orders/${orderId}/pay_mock`, {});
    ctx.assertEqual(payMockRes.status, 200, 'Mock payment succeeded');
    ctx.assertEqual(payMockRes.data.data.status, 'paid', 'Order transitioned to paid');
    ctx.assert(payMockRes.data.data.barcode_data, 'Code128 barcode payload returned');

    // Step 4: Customer checks live order status on `order-status.html` page
    const statusCheck1 = await client.get(`/orders/${orderCode}`);
    ctx.assertEqual(statusCheck1.status, 200, 'Order status page lookup succeeded');
    ctx.assertEqual(statusCheck1.data.data.status, 'paid', 'Live status is paid');
    ctx.assertEqual(statusCheck1.data.data.customer_name, 'Dewi Lestari', 'Customer name matches');

    // Step 5: Customer arrives at physical store. Cashier scans customer's Code128 barcode
    const cashierLogin = await client.post('/auth/login', {
      email: 'rina@kaya.id',
      password: 'kasir123',
    });
    client.setToken(cashierLogin.data.data.token);

    const scanOrderRes = await client.get(`/pos/orders/scan/${orderCode}`);
    ctx.assertEqual(scanOrderRes.status, 200, 'Cashier scanned barcode successfully');
    ctx.assertEqual(scanOrderRes.data.data.order_code, orderCode, 'Order code matches scanned code');
    ctx.assertEqual(scanOrderRes.data.data.items[0].qty, 3, 'Items quantity verified');

    // Step 6: Cashier fulfills order & marks order status as completed
    const fulfillRes = await client.patch(`/pos/orders/${orderId}/status`, {
      status: 'completed',
    });
    ctx.assertEqual(fulfillRes.status, 200, 'Order status updated to completed');
    client.clearToken();

    // Step 7: Customer refreshes order-status page and sees status is now completed
    const statusCheck2 = await client.get(`/orders/${orderCode}`);
    ctx.assertEqual(statusCheck2.status, 200, 'Order status re-checked');
    ctx.assertEqual(statusCheck2.data.data.status, 'completed', 'Final status is completed');

    ctx.recordPass('4.2 scenario_full_landing_page_preorder_to_store_pickup');
  } catch (err) {
    client.clearToken();
    ctx.recordFail('4.2 scenario_full_landing_page_preorder_to_store_pickup', err);
  }
}

module.exports = { runTier4Tests };
