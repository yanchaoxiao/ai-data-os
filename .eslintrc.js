module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/app-portal/**', '**/app-aidata/**', '**/app-growth/**', '**/app-ideaforge/**', '**/app-dealflow/**'],
            message: '禁止跨 app 直接 import，请通过 HTTP API 或事件总线通信。',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['node_modules/', '.next/', 'dist/'],
}
