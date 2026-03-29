module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'n', 'promise'],
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
    },
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  rules: {
    // TypeScript rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-only', fixStyle: 'inline-type-imports' }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    
    // Import rules
    'import/order': ['warn', { 'newlines-between': 'always' }],
    'import/no-unresolved': 'error',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    
    // Node rules
    'n/no-unpublished-import': 'error',
    'n/no-missing-require': 'error',
    'n/no-extraneous-import': 'error',
    'n/no-extraneous-require': 'error',
    
    // Promise rules
    'promise/catch-or-return': 'warn',
    'promise/no-return-in-finally': 'warn',
    
    // General rules
    'eqeqeq': ['warn', 'smart'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off',
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-useless-escape': 'warn',
  },
};