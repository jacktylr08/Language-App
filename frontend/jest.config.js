const nextJest = require('next/jest');

// next/jest loads next.config.js + .env files and wires up the SWC compiler,
// so tests can import the same TS/TSX modules the app ships with no extra
// transform config. It does NOT, however, map the @/ path alias from
// tsconfig.json (it only auto-mocks assets/fonts/css) — that has to be added
// explicitly or any test importing via @/... fails to resolve.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
