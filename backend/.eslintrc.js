module.exports = {
  // Environment settings
  env: {
    browser: true,
    es2021: true,
    node: true,
  },

  // Extend existing configurations
  extends: [
    'eslint:recommended',
  ],

  // Parser options
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  // Rules configuration
  rules: {
    // Add custom rules here
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
  },
};