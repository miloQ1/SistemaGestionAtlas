// Análisis estático (SAST) del backend con reglas de seguridad
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  security.configs.recommended,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: globals.node },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
];
