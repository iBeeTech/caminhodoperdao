module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testMatch: [
        '<rootDir>/tests/frontend/units/**/*.test.ts?(x)',
        '<rootDir>/tests/backend/**/*.test.ts?(x)',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/build/',
        '/dist/',
        '/cypress/',
        'tests/frontend/components/',
        '.cy.ts'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    globals: {
        'ts-jest': {
            isolatedModules: true,
            tsconfig: 'tsconfig.jest.json',
        },
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.ts',
        '!src/index.tsx',
        '!src/reportWebVitals.ts',
    ],
};
