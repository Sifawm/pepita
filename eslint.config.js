import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', '.claude'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The domain core is pure: no UI, no persistence, no implicit clock.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-*', 'dexie', 'dexie-*', 'i18next', '@/*', '../*'] },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Take `now` as a parameter.' },
        { selector: 'NewExpression[callee.name="Date"][arguments.length=0]', message: 'Take `now` as a parameter.' },
      ],
    },
  },
)
