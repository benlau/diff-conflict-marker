module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  snapshotSerializers: ["jest-specific-snapshot"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.(ts|tsx|js)", "**/*.(test|spec).(ts|tsx|js)"],
  collectCoverageFrom: ["src/**/*.(ts|tsx)", "!src/**/*.d.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/out/"],
};
