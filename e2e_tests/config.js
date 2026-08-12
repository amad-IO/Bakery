/**
 * E2E Test Suite Configuration & HTTP Client Utilities
 * KAYA Bakery System
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

class TestHttpClient {
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  request(method, endpoint, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const fullUrl = new URL(this.baseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint));
      const isHttps = fullUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const reqHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      };

      if (this.token && !reqHeaders['Authorization']) {
        reqHeaders['Authorization'] = `Bearer ${this.token}`;
      }

      let payload = null;
      if (body !== null && body !== undefined) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || (isHttps ? 443 : 80),
        path: fullUrl.pathname + fullUrl.search,
        method: method.toUpperCase(),
        headers: reqHeaders,
      };

      const req = transport.request(options, (res) => {
        let rawData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          let parsedData = null;
          try {
            parsedData = rawData ? JSON.parse(rawData) : null;
          } catch (e) {
            parsedData = rawData;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
            raw: rawData,
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  get(endpoint, headers = {}) {
    return this.request('GET', endpoint, null, headers);
  }

  post(endpoint, body, headers = {}) {
    return this.request('POST', endpoint, body, headers);
  }

  put(endpoint, body, headers = {}) {
    return this.request('PUT', endpoint, body, headers);
  }

  patch(endpoint, body, headers = {}) {
    return this.request('PATCH', endpoint, body, headers);
  }

  delete(endpoint, headers = {}) {
    return this.request('DELETE', endpoint, null, headers);
  }
}

class TestContext {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.currentSuite = '';
  }

  assert(condition, message) {
    if (!condition) {
      const err = new Error(`Assertion Failed: ${message}`);
      err.suite = this.currentSuite;
      throw err;
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      const err = new Error(`Assertion Failed: ${message || ''} | Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
      err.suite = this.currentSuite;
      throw err;
    }
  }

  assertMatches(actual, regex, message) {
    if (typeof actual !== 'string' || !regex.test(actual)) {
      const err = new Error(`Assertion Failed: ${message || ''} | Expected "${actual}" to match ${regex}`);
      err.suite = this.currentSuite;
      throw err;
    }
  }

  recordPass(testName) {
    this.passed++;
  }

  recordFail(testName, error) {
    this.failed++;
    this.failures.push({
      suite: this.currentSuite,
      name: testName,
      error: error.message || String(error),
      stack: error.stack,
    });
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  TestHttpClient,
  TestContext,
};
