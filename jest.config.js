export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['./src/__tests__/helpers/envSetup.js'],
    setupFilesAfterEnv: ['./src/__tests__/helpers/dbSetup.js'],
    testTimeout: 30000,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/database/**',
    ],
    coverageReporters: ['text', 'lcov'],
};
