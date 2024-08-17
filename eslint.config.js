import js from '@eslint/js'
import ts from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        T: 'readonly',
        S: 'readonly'
      }
    }
  },
  {
    ignores: [
      '.vscode/',
      '.idea/',
      'build/',
      'dist/',
      '.DS_Store',
      'node_modules/',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'test-results/',
      'logs/',
      '*.logs',
      '*.log'
    ]
  }
]
