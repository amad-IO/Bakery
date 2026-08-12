# TEST_INFRA.md — KAYA Bakery E2E Test Infrastructure & Methodology

## 1. Overview
The **KAYA Bakery E2E Test Suite** is an opaque-box, requirement-driven end-to-end testing system built following **Dual Track E2E** principles. It verifies the complete software behavior — REST API, business logic rules, role authorization (RBAC), stock movement lifecycle, POS operations, public pre-orders, and order status tracking.

## 2. Test Architecture
```
e:\work\shoop\
├── e2e_tests/
│   ├── runner.js                         # Main CLI entrypoint for test execution
│   ├── config.js                         # HTTP client & assertion framework configuration
│   ├── mock_server.js                    # In-memory Gin-compliant API mock server (for standalone/dry-run mode)
│   └── suites/
│       ├── tier1_feature_coverage.test.js    # Tier 1: 35 tests covering all 6 feature areas
│       ├── tier2_boundary_corner.test.js     # Tier 2: 10 boundary, edge-case & 401/403 security tests
│       ├── tier3_cross_feature.test.js       # Tier 3: 3 multi-step cross-module workflow tests
│       └── tier4_real_world.test.js          # Tier 4: 2 real-world user journey scenario tests
├── TEST_INFRA.md                         # Test infrastructure documentation (this file)
└── TEST_READY.md                         # Test status & execution report
```

## 3. 4-Tier Test Methodology Breakdown

### Tier 1: Feature Coverage (>=5 tests per feature)
- **API Endpoints (Auth & Catalog Core)**: Admin login, Cashier login, `/auth/me`, `/categories`, `/products`, `/products/:slug`.
- **Public Pre-Orders**: Order creation (`POST /orders`), `KYA-YYYYMMDD-XXXX` format check, master price calculation, mock payment (`/pay_mock`), automatic stock decrement.
- **POS Operations**: Cashier walk-in order, order code barcode scan, order status update to `completed`, payment recording (cash/QRIS), quick product addition, quick restock (`/stock`).
- **Admin Management**: Dashboard stats (`/admin/dashboard/stats`), activity audit logs (`/admin/logs`), store settings read/write (`/admin/settings`), cashier account CRUD & activation toggle (`/admin/users`), admin product edit.
- **Landing Page Data & Contract**: Product list live fetch structure (`stock_qty`, `is_available`), zero-stock visual flag (`stock_qty === 0`), category filtering, keyword searching, Code128 barcode format.
- **Order Status Lookup**: Public `/orders/:order_code` lookup, non-sensitive data filtering, status lifecycle transitions, item array details.

### Tier 2: Boundary & Corner Cases
- Empty input validation on `POST /orders` (`400 VALIDATION_ERROR`).
- Invalid order code lookup (`404 NOT_FOUND`).
- Unauthenticated request to protected endpoints (`401 UNAUTHORIZED`).
- Role-based authorization enforcement (Cashier token accessing admin endpoints -> `403 FORBIDDEN`).
- Inactive cashier login rejection (`403 FORBIDDEN`).
- Price manipulation rejection (Client price ignored, backend calculates from DB master).
- Negative/zero quantity restock rejection (`400 VALIDATION_ERROR`).
- Non-existent product UUID rejection (`400 VALIDATION_ERROR`).
- Duplicate email user creation rejection (`409 CONFLICT`).
- Unauthorized user creation attempt by cashier (`403 FORBIDDEN`).

### Tier 3: Cross-Feature Combinations
- **Workflow 1**: Pre-order -> Mock Payment -> Stock Decrement -> Cashier Barcode Scan -> Status Update -> Admin Stats & Audit Log Update.
- **Workflow 2**: Cashier Product Entry -> Zero-Stock Catalog Display -> Fast Restock -> POS Walk-in Sale -> Automated Inventory Deduction & Movement Log.
- **Workflow 3**: Admin User Lifecycle & Access Control (Create cashier -> cashier login -> cashier forbidden admin access -> admin deactivates -> login blocked).

### Tier 4: Real-World Application Scenarios
- **Scenario 1**: Complete Walk-In POS Transaction Flow (Cashier login, product catalog grid, cart selection, POS order submission, QRIS payment recording, order status `paid`, stock deduction, 1D barcode receipt generation).
- **Scenario 2**: Full Landing Page Pre-Order to Store Pickup Flow (Customer catalog browsing, pre-order placement, mock payment gateway execution, live status check on `order-status.html`, physical store arrival & camera scan of Code128 barcode, cashier handover & status update to `completed`, customer re-verification).

## 4. Execution & Usage

### Prerequisites
- Node.js v18+ installed.
- Zero external package dependencies required (uses native Node HTTP & standard libraries).

### Commands
```bash
# Run full E2E test suite (auto-detects live API at http://localhost:8080/api/v1 or starts mock server)
node e2e_tests/runner.js

# Force standalone execution using embedded high-fidelity mock server
node e2e_tests/runner.js --mock

# Run against custom API base URL
node e2e_tests/runner.js --base-url http://localhost:8080/api/v1
```
