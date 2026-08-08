process.env.MOCK_LLM = 'true';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['server/test/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    sequence: {
      concurrent: false
    },
    testTimeout: 120000,
    hookTimeout: 30000,
    env: {
      MOCK_LLM: 'true'
    }
  }
});
