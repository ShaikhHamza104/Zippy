import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
    },
  },
});
