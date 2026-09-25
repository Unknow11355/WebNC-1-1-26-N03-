import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/controllers/**/*.js', 'src/routes/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['mysql2', 'mysql2/*', '**/repositories/**', '**/config/database.js'],
              message:
                'Controller và route phải gọi service, không truy cập database/repository trực tiếp.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.js', 'src/repositories/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['express', 'express/*', '**/controllers/**', '**/routes/**'],
              message: 'Service và repository không phụ thuộc tầng HTTP.',
            },
          ],
        },
      ],
    },
  },
];
