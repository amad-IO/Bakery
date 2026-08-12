/**
 * In-Memory Mock Server for KAYA Bakery API
 * Follows API.md, ERD.md, ROLES.md, and PROJECT.md specs.
 * Used by E2E test runner when live backend server is offline or in mock mode.
 */

const http = require('http');
const { URL } = require('url');

class MockBackendServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = null;
    this.resetData();
  }

  resetData() {
    this.users = [
      {
        id: 'usr-admin-001',
        name: 'Budi (Owner)',
        email: 'owner@kaya.id',
        password_hash: 'rahasia123', // simulated
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-kasir-001',
        name: 'Rina (Kasir)',
        email: 'rina@kaya.id',
        password_hash: 'kasir123',
        role: 'kasir',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-kasir-002',
        name: 'Doni (Inactive Kasir)',
        email: 'doni@kaya.id',
        password_hash: 'kasir123',
        role: 'kasir',
        is_active: false,
        created_at: new Date().toISOString(),
      },
    ];

    this.tokens = {
      'mock-jwt-admin-token-12345': this.users[0],
      'mock-jwt-kasir-token-67890': this.users[1],
    };

    this.categories = [
      { id: 'cat-roti-001', name: 'Roti Manis', slug: 'roti-manis', display_order: 1 },
      { id: 'cat-roti-002', name: 'Roti Tawar', slug: 'roti-tawar', display_order: 2 },
      { id: 'cat-pastry-001', name: 'Pastry & Croissant', slug: 'pastry', display_order: 3 },
    ];

    this.products = [
      {
        id: 'prod-001',
        category_id: 'cat-roti-001',
        created_by_id: 'usr-admin-001',
        name: 'Roti Coklat Premium',
        slug: 'roti-coklat-premium',
        description: 'Roti manis isi coklat meleleh',
        sku: 'RC-001',
        price: 15000,
        stock_qty: 50,
        is_available: true,
        image_url: 'https://example.com/roti-coklat.jpg',
      },
      {
        id: 'prod-002',
        category_id: 'cat-roti-001',
        created_by_id: 'usr-admin-001',
        name: 'Roti Keju Spesial',
        slug: 'roti-keju-spesial',
        description: 'Roti manis dengan keju melimpah',
        sku: 'RK-001',
        price: 18000,
        stock_qty: 25,
        is_available: true,
        image_url: 'https://example.com/roti-keju.jpg',
      },
      {
        id: 'prod-003',
        category_id: 'cat-roti-002',
        created_by_id: 'usr-admin-001',
        name: 'Roti Tawar Gandum',
        slug: 'roti-tawar-gandum',
        description: 'Roti tawar gandum sehat',
        sku: 'RT-001',
        price: 22000,
        stock_qty: 0, // Zero stock item for edge cases & visual badge
        is_available: true,
        image_url: 'https://example.com/roti-tawar.jpg',
      },
    ];

    this.orders = [];
    this.orderItems = [];
    this.payments = [];
    this.stockMovements = [];
    this.activityLogs = [];
    this.storeSettings = {
      store_name: 'KAYA Bakery',
      store_open_time: '07:00',
      store_close_time: '20:00',
      store_address: 'Jl. Merdeka No. 45, Jakarta',
      whatsapp_number: '081234567890',
    };

    this.orderCounter = 1;
  }

  generateOrderCode() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const seq = String(this.orderCounter++).padStart(4, '0');
    return `KYA-${yyyy}${mm}${dd}-${seq}`;
  }

  logActivity(userId, action, entityType, entityId, metadata = {}) {
    this.activityLogs.push({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    });
  }

  authenticate(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    return this.tokens[token] || null;
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  sendJson(res, statusCode, body) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    });
    res.end(JSON.stringify(body));
  }

  sendError(res, statusCode, code, message) {
    this.sendJson(res, statusCode, {
      success: false,
      error: { code, message },
    });
  }

  handleRequest(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
    let pathname = parsedUrl.pathname;
    
    // Normalize path to strip trailing slash
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', () => {
      let body = null;
      if (bodyRaw) {
        try {
          body = JSON.parse(bodyRaw);
        } catch (e) {
          return this.sendError(res, 400, 'INVALID_JSON', 'Invalid JSON body');
        }
      }

      this.routeRequest(req, res, pathname, parsedUrl.searchParams, body);
    });
  }

  routeRequest(req, res, pathname, params, body) {
    const method = req.method.toUpperCase();

    // Health check
    if (pathname === '/health' || pathname === '/api/v1/health') {
      return this.sendJson(res, 200, { success: true, message: 'Mock API ready' });
    }

    // 1. AUTH
    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      const { email, password } = body || {};
      const user = this.users.find(u => u.email === email);
      if (!user) {
        return this.sendError(res, 401, 'UNAUTHORIZED', 'Invalid email or password');
      }
      if (!user.is_active) {
        return this.sendError(res, 403, 'FORBIDDEN', 'Account is deactivated');
      }
      // Simple mock check
      if (password !== 'rahasia123' && password !== 'kasir123') {
        return this.sendError(res, 401, 'UNAUTHORIZED', 'Invalid email or password');
      }
      const token = user.role === 'admin' ? 'mock-jwt-admin-token-12345' : 'mock-jwt-kasir-token-67890';
      return this.sendJson(res, 200, {
        success: true,
        data: {
          token,
          user: { id: user.id, name: user.name, role: user.role, email: user.email },
        },
      });
    }

    if (method === 'GET' && pathname === '/api/v1/auth/me') {
      const currentUser = this.authenticate(req);
      if (!currentUser) return this.sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized token');
      return this.sendJson(res, 200, {
        success: true,
        data: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
      });
    }

    // 2. PUBLIC PRODUCTS & CATEGORIES
    if (method === 'GET' && pathname === '/api/v1/categories') {
      return this.sendJson(res, 200, { success: true, data: this.categories });
    }

    if (method === 'GET' && pathname === '/api/v1/products') {
      let filtered = [...this.products];
      const categorySlug = params.get('category');
      const search = params.get('search');
      const availableOnly = params.get('available');

      if (categorySlug) {
        const cat = this.categories.find(c => c.slug === categorySlug);
        if (cat) filtered = filtered.filter(p => p.category_id === cat.id);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
      }
      if (availableOnly === 'true') {
        filtered = filtered.filter(p => p.is_available);
      }

      return this.sendJson(res, 200, { success: true, data: filtered });
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/products/')) {
      const slug = pathname.replace('/api/v1/products/', '');
      const product = this.products.find(p => p.slug === slug || p.id === slug);
      if (!product) return this.sendError(res, 404, 'NOT_FOUND', 'Product not found');
      return this.sendJson(res, 200, { success: true, data: product });
    }

    // 3. PUBLIC PRE-ORDERS
    if (method === 'POST' && pathname === '/api/v1/orders') {
      const { customer_name, customer_phone, items } = body || {};
      if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
        return this.sendError(res, 400, 'VALIDATION_ERROR', 'customer_name and items are required');
      }

      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const prod = this.products.find(p => p.id === item.product_id);
        if (!prod) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', `Product ${item.product_id} not found`);
        }
        if (item.qty <= 0) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'Item quantity must be > 0');
        }
        const itemSubtotal = prod.price * item.qty;
        subtotal += itemSubtotal;
        orderItems.push({
          id: `item-${Date.now()}-${Math.random()}`,
          product_id: prod.id,
          product_name_snapshot: prod.name,
          price_snapshot: prod.price,
          qty: item.qty,
          subtotal: itemSubtotal,
        });
      }

      const orderCode = this.generateOrderCode();
      const order = {
        id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        order_code: orderCode,
        customer_name,
        customer_phone: customer_phone || '',
        order_type: 'preorder',
        status: 'pending_payment',
        subtotal,
        discount: 0,
        total: subtotal,
        cashier_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.orders.push(order);
      for (const oi of orderItems) {
        oi.order_id = order.id;
        this.orderItems.push(oi);
      }

      return this.sendJson(res, 201, {
        success: true,
        data: {
          id: order.id,
          order_code: order.order_code,
          status: order.status,
          subtotal: order.subtotal,
          total: order.total,
          items: orderItems,
        },
      });
    }

    if (method === 'POST' && pathname.includes('/pay_mock')) {
      // POST /orders/:id/pay_mock
      const parts = pathname.split('/');
      const orderId = parts[parts.indexOf('orders') + 1];
      const order = this.orders.find(o => o.id === orderId || o.order_code === orderId);

      if (!order) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Order not found');
      }

      if (order.status === 'paid' || order.status === 'completed') {
        return this.sendJson(res, 200, {
          success: true,
          data: {
            order_code: order.order_code,
            barcode_data: order.order_code,
            status: order.status,
            total_amount: order.total,
          },
        });
      }

      // Transition to paid & stock decrement
      order.status = 'paid';
      order.updated_at = new Date().toISOString();

      const items = this.orderItems.filter(i => i.order_id === order.id);
      for (const item of items) {
        const prod = this.products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock_qty = Math.max(0, prod.stock_qty - item.qty);
          this.stockMovements.push({
            id: `sm-${Date.now()}-${Math.random()}`,
            product_id: prod.id,
            type: 'out',
            qty: item.qty,
            note: `Order payment ${order.order_code}`,
            created_by_id: 'system',
            created_at: new Date().toISOString(),
          });
        }
      }

      // Payment row
      this.payments.push({
        id: `pay-${Date.now()}`,
        order_id: order.id,
        method: 'mock_payment',
        amount: order.total,
        status: 'success',
        reference_no: `PAY-${order.order_code}`,
        paid_at: new Date().toISOString(),
      });

      return this.sendJson(res, 200, {
        success: true,
        data: {
          order_code: order.order_code,
          barcode_data: order.order_code,
          status: 'paid',
          total_amount: order.total,
          items: items,
        },
      });
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/orders/')) {
      const codeOrId = pathname.replace('/api/v1/orders/', '');
      const order = this.orders.find(o => o.order_code === codeOrId || o.id === codeOrId);
      if (!order) return this.sendError(res, 404, 'NOT_FOUND', 'Order not found');

      const items = this.orderItems.filter(i => i.order_id === order.id);
      return this.sendJson(res, 200, {
        success: true,
        data: {
          order_code: order.order_code,
          customer_name: order.customer_name,
          order_type: order.order_type,
          status: order.status,
          total: order.total,
          items,
          created_at: order.created_at,
        },
      });
    }

    // 4. POS (CASHIER & ADMIN)
    if (pathname.startsWith('/api/v1/pos/')) {
      const currentUser = this.authenticate(req);
      if (!currentUser) return this.sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
      if (currentUser.role !== 'kasir' && currentUser.role !== 'admin') {
        return this.sendError(res, 403, 'FORBIDDEN', 'Forbidden');
      }

      if (method === 'POST' && pathname === '/api/v1/pos/orders') {
        const { customer_name, items } = body || {};
        if (!items || !Array.isArray(items) || items.length === 0) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'Items array required');
        }

        let subtotal = 0;
        const orderItems = [];
        for (const item of items) {
          const prod = this.products.find(p => p.id === item.product_id);
          if (!prod) return this.sendError(res, 400, 'VALIDATION_ERROR', `Product ${item.product_id} not found`);
          const itemSubtotal = prod.price * item.qty;
          subtotal += itemSubtotal;
          orderItems.push({
            id: `item-${Date.now()}-${Math.random()}`,
            product_id: prod.id,
            product_name_snapshot: prod.name,
            price_snapshot: prod.price,
            qty: item.qty,
            subtotal: itemSubtotal,
          });
        }

        const orderCode = this.generateOrderCode();
        const order = {
          id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          order_code: orderCode,
          customer_name: customer_name || 'Walk-in Customer',
          customer_phone: '',
          order_type: 'pos',
          status: 'pending',
          subtotal,
          discount: 0,
          total: subtotal,
          cashier_id: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        this.orders.push(order);
        for (const oi of orderItems) {
          oi.order_id = order.id;
          this.orderItems.push(oi);
        }

        this.logActivity(currentUser.id, 'create_pos_order', 'orders', order.id, { order_code: orderCode });

        return this.sendJson(res, 201, {
          success: true,
          data: { ...order, items: orderItems },
        });
      }

      if (method === 'GET' && pathname.startsWith('/api/v1/pos/orders/scan/')) {
        const code = pathname.replace('/api/v1/pos/orders/scan/', '');
        const order = this.orders.find(o => o.order_code === code);
        if (!order) return this.sendError(res, 404, 'NOT_FOUND', 'Order code not found');

        const items = this.orderItems.filter(i => i.order_id === order.id);
        return this.sendJson(res, 200, {
          success: true,
          data: { ...order, items },
        });
      }

      if (method === 'PATCH' && pathname.includes('/pos/orders/') && pathname.endsWith('/status')) {
        const parts = pathname.split('/');
        const orderId = parts[parts.indexOf('orders') + 1];
        const order = this.orders.find(o => o.id === orderId || o.order_code === orderId);
        if (!order) return this.sendError(res, 404, 'NOT_FOUND', 'Order not found');

        const { status } = body || {};
        if (!status) return this.sendError(res, 400, 'VALIDATION_ERROR', 'Status required');

        order.status = status;
        order.updated_at = new Date().toISOString();

        this.logActivity(currentUser.id, 'update_order_status', 'orders', order.id, { status });

        return this.sendJson(res, 200, {
          success: true,
          data: order,
        });
      }

      if (method === 'POST' && pathname.includes('/pos/orders/') && pathname.endsWith('/payments')) {
        const parts = pathname.split('/');
        const orderId = parts[parts.indexOf('orders') + 1];
        const order = this.orders.find(o => o.id === orderId || o.order_code === orderId);
        if (!order) return this.sendError(res, 404, 'NOT_FOUND', 'Order not found');

        const { method: payMethod, amount, reference_no } = body || {};
        const payment = {
          id: `pay-${Date.now()}`,
          order_id: order.id,
          method: payMethod || 'cash',
          amount: amount || order.total,
          status: 'success',
          reference_no: reference_no || '',
          paid_at: new Date().toISOString(),
        };
        this.payments.push(payment);

        if (order.status !== 'paid' && order.status !== 'completed') {
          order.status = 'paid';
          // Stock deduction if not already done
          const items = this.orderItems.filter(i => i.order_id === order.id);
          for (const item of items) {
            const prod = this.products.find(p => p.id === item.product_id);
            if (prod) {
              prod.stock_qty = Math.max(0, prod.stock_qty - item.qty);
              this.stockMovements.push({
                id: `sm-${Date.now()}-${Math.random()}`,
                product_id: prod.id,
                type: 'out',
                qty: item.qty,
                note: `POS Payment ${order.order_code}`,
                created_by_id: currentUser.id,
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        this.logActivity(currentUser.id, 'record_payment', 'payments', payment.id, { method: payMethod, amount });

        return this.sendJson(res, 200, {
          success: true,
          data: payment,
        });
      }

      if (method === 'POST' && pathname === '/api/v1/pos/products') {
        const { name, category_id, price, description, sku } = body || {};
        if (!name || !category_id || price === undefined) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'name, category_id, price are required');
        }

        const newProd = {
          id: `prod-${Date.now()}`,
          category_id,
          created_by_id: currentUser.id,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: description || '',
          sku: sku || `SKU-${Date.now()}`,
          price: Number(price),
          stock_qty: 0, // Default stock 0
          is_available: true,
          image_url: body.image_url || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        this.products.push(newProd);
        this.logActivity(currentUser.id, 'create_product', 'products', newProd.id, { name: newProd.name });

        return this.sendJson(res, 201, {
          success: true,
          data: newProd,
        });
      }

      if (method === 'PATCH' && pathname.includes('/pos/products/') && pathname.endsWith('/stock')) {
        const parts = pathname.split('/');
        const prodId = parts[parts.indexOf('products') + 1];
        const prod = this.products.find(p => p.id === prodId || p.slug === prodId);
        if (!prod) return this.sendError(res, 404, 'NOT_FOUND', 'Product not found');

        const { qty, note } = body || {};
        if (qty === undefined || typeof qty !== 'number' || qty <= 0) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'qty must be a positive number');
        }

        prod.stock_qty += qty;
        prod.updated_at = new Date().toISOString();

        const sm = {
          id: `sm-${Date.now()}`,
          product_id: prod.id,
          type: 'in',
          qty,
          note: note || 'Restock',
          created_by_id: currentUser.id,
          created_at: new Date().toISOString(),
        };
        this.stockMovements.push(sm);

        this.logActivity(currentUser.id, 'restock_product', 'products', prod.id, { qty, new_stock: prod.stock_qty });

        return this.sendJson(res, 200, {
          success: true,
          data: { product: prod, stock_movement: sm },
        });
      }
    }

    // 5. ADMIN-ONLY ENDPOINTS
    if (pathname.startsWith('/api/v1/admin/')) {
      const currentUser = this.authenticate(req);
      if (!currentUser) return this.sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
      if (currentUser.role !== 'admin') {
        return this.sendError(res, 403, 'FORBIDDEN', 'Access denied. Admin role required');
      }

      if (method === 'GET' && pathname === '/api/v1/admin/dashboard/stats') {
        const revenueToday = this.orders
          .filter(o => o.status === 'paid' || o.status === 'completed')
          .reduce((acc, o) => acc + o.total, 0);

        const ordersToday = this.orders.length;
        const topProducts = this.products.map(p => ({ name: p.name, sold_qty: 10 }));
        const lowStockProducts = this.products.filter(p => p.stock_qty <= 5);

        return this.sendJson(res, 200, {
          success: true,
          data: {
            revenue_today: revenueToday,
            revenue_this_month: revenueToday * 15,
            orders_today: ordersToday,
            top_products: topProducts,
            low_stock_products: lowStockProducts,
          },
        });
      }

      if (method === 'GET' && pathname === '/api/v1/admin/logs') {
        return this.sendJson(res, 200, {
          success: true,
          data: this.activityLogs,
          meta: { page: 1, limit: 20, total: this.activityLogs.length },
        });
      }

      if (method === 'GET' && pathname === '/api/v1/admin/settings') {
        return this.sendJson(res, 200, {
          success: true,
          data: this.storeSettings,
        });
      }

      if (method === 'PATCH' && pathname === '/api/v1/admin/settings') {
        Object.assign(this.storeSettings, body || {});
        this.logActivity(currentUser.id, 'update_settings', 'store_settings', 'settings', body);
        return this.sendJson(res, 200, {
          success: true,
          data: this.storeSettings,
        });
      }

      if (method === 'GET' && pathname === '/api/v1/admin/users') {
        const role = params.get('role');
        let filtered = this.users;
        if (role) filtered = filtered.filter(u => u.role === role);
        return this.sendJson(res, 200, { success: true, data: filtered });
      }

      if (method === 'POST' && pathname === '/api/v1/admin/users') {
        const { name, email, phone, password, role } = body || {};
        if (!name || !email || !password || !role) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'name, email, password, role are required');
        }
        if (this.users.some(u => u.email === email)) {
          return this.sendError(res, 409, 'CONFLICT', 'Email already registered');
        }
        const newUser = {
          id: `usr-${Date.now()}`,
          name,
          email,
          phone: phone || '',
          password_hash: password,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        this.users.push(newUser);
        this.logActivity(currentUser.id, 'create_user', 'users', newUser.id, { email, role });
        return this.sendJson(res, 201, { success: true, data: newUser });
      }

      if (method === 'PATCH' && pathname.startsWith('/api/v1/admin/users/')) {
        const userId = pathname.replace('/api/v1/admin/users/', '');
        const user = this.users.find(u => u.id === userId);
        if (!user) return this.sendError(res, 404, 'NOT_FOUND', 'User not found');

        if (body.is_active !== undefined) user.is_active = body.is_active;
        if (body.name) user.name = body.name;

        this.logActivity(currentUser.id, 'update_user', 'users', user.id, body);
        return this.sendJson(res, 200, { success: true, data: user });
      }

      if (method === 'PATCH' && pathname.startsWith('/api/v1/admin/products/')) {
        const prodId = pathname.replace('/api/v1/admin/products/', '');
        const prod = this.products.find(p => p.id === prodId || p.slug === prodId);
        if (!prod) return this.sendError(res, 404, 'NOT_FOUND', 'Product not found');

        if (body.price !== undefined) prod.price = Number(body.price);
        if (body.name !== undefined) prod.name = body.name;
        if (body.is_available !== undefined) prod.is_available = body.is_available;

        this.logActivity(currentUser.id, 'update_product_admin', 'products', prod.id, body);
        return this.sendJson(res, 200, { success: true, data: prod });
      }

      if (method === 'DELETE' && pathname.startsWith('/api/v1/admin/products/')) {
        const prodId = pathname.replace('/api/v1/admin/products/', '');
        const prod = this.products.find(p => p.id === prodId || p.slug === prodId);
        if (!prod) return this.sendError(res, 404, 'NOT_FOUND', 'Product not found');

        prod.is_available = false; // soft delete
        this.logActivity(currentUser.id, 'deactivate_product', 'products', prod.id, {});
        return this.sendJson(res, 200, { success: true, data: { message: 'Product deactivated' } });
      }
    }

    // Default 404
    return this.sendError(res, 404, 'NOT_FOUND', `Endpoint ${method} ${pathname} not found`);
  }
}

module.exports = { MockBackendServer };
