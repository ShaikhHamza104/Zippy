import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Parse root .env safely without external dependencies
try {
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore if .env is missing
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node server/src/server.js',
      url: 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 30000,
      env: {
        PORT: '5000',
        NODE_ENV: 'development',
      },
    },
    {
      command: 'node ./node_modules/vite/bin/vite.js --port 5173',
      cwd: 'client',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
