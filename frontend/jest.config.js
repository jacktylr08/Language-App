const nextJest = require('next/jest');

// next/jest loads next.config.js + .env files and wires up the SWC compiler,
// so tests can import the same TS/TSX modules the app ships (including the
// @/ path alias from tsconfig.json) with no extra transform config.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};

module.exports = createJestConfig(customJestConfig);
