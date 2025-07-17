const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
    '!src/app/layout.tsx',
    '!src/app/api/**/*',
    '!src/components/TagExtension.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-|rehype-|unified|bail|is-plain-obj|trough|vfile|unist-util-|mdast-util-|micromark|decode-named-character-reference|character-entities|property-information|hast-util-|space-separated-tokens|comma-separated-tokens|zwitch|html-void-elements|ccount|escape-string-regexp|markdown-table)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)