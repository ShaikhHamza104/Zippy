import autocannon from 'autocannon';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const DURATION_SECONDS = parseInt(process.env.BENCHMARK_DURATION || '5', 10);
const CONNECTIONS = parseInt(process.env.BENCHMARK_CONNECTIONS || '10', 10);

const TARGET_ENDPOINTS = [
  { name: 'Health Check', path: '/health' },
  { name: 'Home Layout & Banners', path: '/api/v1/home' },
  { name: 'Category Listing', path: '/api/v1/categories' },
  { name: 'Product Catalog Listing', path: '/api/v1/products' },
  { name: 'Live Search Query (milk)', path: '/api/v1/search?q=milk' },
];

function isServerHealthy(url) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/health`, { timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerHealthy(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function runBenchmark(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  console.log(`\n======================================================`);
  console.log(` Running Load Benchmark: ${endpoint.name}`);
  console.log(` Target URL: ${url}`);
  console.log(` Concurrency: ${CONNECTIONS} connections | Duration: ${DURATION_SECONDS}s`);
  console.log(`======================================================`);

  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections: CONNECTIONS,
        duration: DURATION_SECONDS,
        headers: {
          'x-zippy-client': 'load-tester',
        },
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      }
    );
  });
}

export async function runAllBenchmarks() {
  let serverProcess = null;
  const alreadyRunning = await isServerHealthy(BASE_URL);

  if (!alreadyRunning) {
    console.log('[Load Test] Starting backend server in benchmark mode...');
    serverProcess = spawn('node', ['server/src/server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        BENCHMARK_MODE: 'true',
        PORT: '5000',
      },
      stdio: 'ignore',
      detached: false,
    });

    const isUp = await waitForServer(BASE_URL, 30);
    if (!isUp) {
      if (serverProcess) serverProcess.kill();
      throw new Error(`Failed to start backend server at ${BASE_URL} within timeout.`);
    }
    console.log('[Load Test] Backend server successfully online for benchmarks.');
  } else {
    console.log('[Load Test] Reusing existing running backend server at ' + BASE_URL);
  }

  const summary = [];

  try {
    for (const endpoint of TARGET_ENDPOINTS) {
      try {
        const result = await runBenchmark(endpoint);
        const row = {
          name: endpoint.name,
          path: endpoint.path,
          requests: result.requests.total,
          rps: Math.round(result.requests.average),
          p50_ms: result.latency.p50,
          p90_ms: result.latency.p90,
          p97_5_ms: result.latency.p97_5,
          p99_ms: result.latency.p99,
          max_ms: result.latency.max,
          errors: result.errors,
          timeouts: result.timeouts,
          errorRate: ((result.errors / (result.requests.total || 1)) * 100).toFixed(2) + '%',
        };
        summary.push(row);
      } catch (err) {
        console.error(`Failed benchmark on ${endpoint.path}:`, err.message);
      }
    }

    console.log(
      '\n\n========================================================================================'
    );
    console.log(
      '                          ZIPPY API LOAD TEST BENCHMARK SUMMARY                         '
    );
    console.log(
      '========================================================================================'
    );
    console.table(summary);
    console.log(
      '========================================================================================\n'
    );
  } finally {
    if (serverProcess) {
      console.log('[Load Test] Cleanly terminating spawned benchmark server process...');
      serverProcess.kill('SIGTERM');
      // Wait a moment for graceful shutdown
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return summary;
}

// Direct execution CLI runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllBenchmarks()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Load testing error:', err);
      process.exit(1);
    });
}
