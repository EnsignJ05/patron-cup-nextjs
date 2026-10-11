import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // e2e/ holds Playwright specs (also *.spec.ts), which Jest's default testMatch would
  // otherwise also pick up and try to run under jsdom.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx,js,jsx}',
    'src/utils/**/*.{ts,tsx,js,jsx}',
    'src/context/**/*.{ts,tsx,js,jsx}',
    'src/components/shared/**/*.{ts,tsx,js,jsx}',
    'src/components/layout/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/styles/**',
    '!src/data/**',
    '!src/lib/supabaseAdmin.ts',
    '!src/lib/supabaseBrowser.ts',
    '!src/lib/supabaseClient.ts',
    '!src/lib/supabaseServer.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default createJestConfig(customJestConfig);
