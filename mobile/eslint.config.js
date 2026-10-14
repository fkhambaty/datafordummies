const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'coverage/*', 'node_modules/*', 'ios/*', 'android/*']),
  expoConfig,
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
]);
