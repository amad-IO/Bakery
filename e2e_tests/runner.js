/**
 * KAYA Bakery System - Dual Track E2E Test Suite Runner
 * Executes Tiers 1-4 methodology against live backend API or embedded mock server.
 * Usage:
 *   node e2e_tests/runner.js
 *   node e2e_tests/runner.js --mock
 *   node e2e_tests/runner.js --base-url http://localhost:8080/api/v1
 */

const http = require('http');
const { DEFAULT_BASE_URL, TestHttpClient, TestContext } = require('./config');
const { MockBackendServer } = require('./mock_server');
const { runTier1Tests } = require('./suites/tier1_feature_coverage.test');
const { runTier2Tests } = require('./suites/tier2_boundary_corner.test');
const { runTier3Tests } = require('./suites/tier3_cross_feature.test');
const { runTier4Tests } = require('./suites/tier4_real_world.test');

async function checkLiveServer(baseUrl) {
  return new Promise((resolve) => {
    try {
      const url = new URL(baseUrl + '/health');
      const req = http.get({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        timeout: 1000,
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch (e) {
      resolve(false);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const forceMock = args.includes('--mock');
  let customBaseUrl = null;
  
  const urlIdx = args.indexOf('--base-url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    customBaseUrl = args[urlIdx + 1];
  }

  let targetUrl = customBaseUrl || DEFAULT_BASE_URL;
  let mockServer = null;

  console.log('====================================================');
  console.log('         KAYA Bakery - E2E Test Runner              ');
  console.log('====================================================');

  let useMock = forceMock;
  if (!forceMock) {
    const isLive = await checkLiveServer(targetUrl);
    if (!isLive) {
      console.log(`[INFO] Live API server at ${targetUrl} not detected.`);
      console.log('[INFO] Launching embedded mock backend server on port 8088...');
      useMock = true;
    } else {
      console.log(`[INFO] Connected to live API server at ${targetUrl}`);
    }
  }

  if (useMock) {
    mockServer = new MockBackendServer(8088);
    await mockServer.start();
    targetUrl = 'http://localhost:8088/api/v1';
    console.log(`[INFO] Mock backend server running at ${targetUrl}`);
  }

  const client = new TestHttpClient(targetUrl);
  const ctx = new TestContext();
  const startTime = Date.now();

  try {
    console.log('\n--- Running Tier 1: Feature Coverage Suite ---');
    await runTier1Tests(client, ctx);

    console.log('\n--- Running Tier 2: Boundary & Corner Cases Suite ---');
    await runTier2Tests(client, ctx);

    console.log('\n--- Running Tier 3: Cross-Feature Combinations Suite ---');
    await runTier3Tests(client, ctx);

    console.log('\n--- Running Tier 4: Real-World Scenarios Suite ---');
    await runTier4Tests(client, ctx);

  } catch (err) {
    console.error('\n[ERROR] Unexpected error during test execution:', err);
  } finally {
    if (mockServer) {
      await mockServer.stop();
      console.log('\n[INFO] Embedded mock server stopped.');
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n====================================================');
  console.log('                 E2E TEST SUMMARY                   ');
  console.log('====================================================');
  console.log(`Total Tests Executed : ${ctx.passed + ctx.failed}`);
  console.log(`Passed               : ${ctx.passed} ✅`);
  console.log(`Failed               : ${ctx.failed} ❌`);
  console.log(`Execution Time       : ${duration}s`);

  if (ctx.failed > 0) {
    console.log('\n--- Failure Details ---');
    ctx.failures.forEach((f, idx) => {
      console.log(`\n${idx + 1}) [${f.suite}] ${f.name}`);
      console.log(`   Error: ${f.error}`);
    });
    console.log('====================================================\n');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL E2E TEST TIERS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
