# TEST_READY.md — KAYA Bakery E2E Test Suite Status & Coverage Report

## 1. Test Suite Status
- **Status**: READY ✅
- **Total Test Cases**: 50 tests across 4 Tiers
- **Test Runner**: `node e2e_tests/runner.js`
- **Execution Mode**: Dual-Mode (Live Go Backend API & Standalone High-Fidelity Mock Server)

## 2. Command to Run Tests
```bash
node e2e_tests/runner.js
```

To run explicitly against live server or mock mode:
```bash
# Explicit mock mode
node e2e_tests/runner.js --mock

# Custom API base URL
node e2e_tests/runner.js --base-url http://localhost:8080/api/v1
```

## 3. Feature Coverage Checklist & Verification

| Tier | Feature Area | Tests | Status |
|---|---|:---:|:---:|
| **Tier 1** | API Endpoints (Auth, Products, Categories) | 6 | PASS ✅ |
| **Tier 1** | Public Pre-Orders (`KYA-YYYYMMDD-XXXX`, Price Snapshot, Mock Pay) | 5 | PASS ✅ |
| **Tier 1** | POS Cashier Operations (Walk-in, Barcode Scan, Stock Restock) | 6 | PASS ✅ |
| **Tier 1** | Admin Operations (Stats, Activity Logs, Settings, User Management) | 8 | PASS ✅ |
| **Tier 1** | Landing Page Data & Contract (Catalog, Zero-Stock Badge, Search, Barcode) | 5 | PASS ✅ |
| **Tier 1** | Order Status Lookup (`GET /orders/:code`, Non-sensitive data, Lifecycle) | 5 | PASS ✅ |
| **Tier 2** | Boundary & Corner Cases (400 validation, 401 unauth, 403 forbidden, 404 missing, 409 conflict, price tamper rejection) | 10 | PASS ✅ |
| **Tier 3** | Cross-Feature Workflows (Pre-order -> Pay -> Stock -> Scan -> Admin; POS entry -> Restock -> POS Sale -> Stock) | 3 | PASS ✅ |
| **Tier 4** | Real-World Application Scenarios (POS Walk-in Journey, Full Pre-order to Pickup Journey) | 2 | PASS ✅ |

## 4. Key Requirement Validations
- `order_code` format enforcement: `KYA-YYYYMMDD-XXXX` pattern verified.
- Server-side price snapshot calculation: Client price manipulation rejected.
- Automated stock decrement: Triggered on order payment (`paid`), inserting `stock_movements` with `type: out`.
- Role-based Access Control (RBAC): Admin JWT vs Cashier JWT strictly checked (403 FORBIDDEN for cashier on admin routes).
- Zero-stock product handling: `is_available` remains true while `stock_qty === 0` to render visually disabled overlay.
- Code128 compatibility: Barcode data payload tested for `jsbarcode` rendering.
- Audit trail: Mutating admin/cashier actions verify `activity_logs` creation.

## 5. Artifact Index
- `e2e_tests/runner.js` — Test runner CLI script
- `e2e_tests/config.js` — Configuration & HTTP client
- `e2e_tests/mock_server.js` — In-memory mock API server
- `e2e_tests/suites/tier1_feature_coverage.test.js` — Tier 1 suite
- `e2e_tests/suites/tier2_boundary_corner.test.js` — Tier 2 suite
- `e2e_tests/suites/tier3_cross_feature.test.js` — Tier 3 suite
- `e2e_tests/suites/tier4_real_world.test.js` — Tier 4 suite
- `TEST_INFRA.md` — Infrastructure & methodology documentation
