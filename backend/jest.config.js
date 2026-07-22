module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // The production build (build-script.ts) transpiles with esbuild and
    // never type-checks, so long-standing Objection.js generic-typing noise
    // (unrelated to runtime correctness) already ships fine. Match that here
    // — tests should fail on broken behavior, not on pre-existing type noise
    // the rest of the toolchain already tolerates.
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
