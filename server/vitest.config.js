import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['src/server.js', 'src/database/seed.js', 'src/database/verify.js'],
    },
  },
});
