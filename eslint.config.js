const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends('airbnb-base'),
  {
    rules: {
      'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: true }],
      'arrow-parens': ['error', 'always'],
      'class-methods-use-this': 'off',
      'function-paren-newline': 'off',
      'function-call-argument-newline': 'off',
      'max-len': ['error', 120, 2, {
        ignoreUrls: true,
        ignoreComments: false,
      }],
      'no-param-reassign': ['error', { props: false }],
      'no-restricted-syntax': 'off',
      'no-underscore-dangle': 'off',
    },
    languageOptions: {
      globals: {
        baseURL: 'readonly',
        Nuxeo: 'readonly',
        window: 'readonly',
      },
    },
  },
  // Test files: mocha environment + additional globals
  ...compat.env({ mocha: true }).map((config) => ({ ...config, files: ['test/**/*.js'] })),
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        expect: 'readonly',
        isBrowser: 'readonly',
        support: 'readonly',
      },
    },
  },
];
