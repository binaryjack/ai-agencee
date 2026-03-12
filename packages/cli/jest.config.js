/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  forceExit: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@ai-agencee/core$': '<rootDir>/../core/src/index.ts',
    '^@ai-agencee/engine$': '<rootDir>/../agent-executor/src/index.ts',
    '^@ai-agencee/engine/code-assistant$': '<rootDir>/../agent-executor/src/code-assistant/index.ts',
    '^@ai-agencee/engine/code-assistant/storage$': '<rootDir>/../agent-executor/src/code-assistant/storage/index.ts',
    '^@ai-agencee/engine/code-assistant/parsers$': '<rootDir>/../agent-executor/src/code-assistant/parsers/index.ts',
  },
};
