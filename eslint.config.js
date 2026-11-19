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
    // El núcleo de dominio es puro: nada de interfaz, persistencia ni reloj implícito.
    files: ['src/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-*', 'dexie', 'dexie-*', 'i18next', '@/*', '../*'] },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Recibe `ahora` como parámetro.' },
        { selector: 'NewExpression[callee.name="Date"][arguments.length=0]', message: 'Recibe `ahora` como parámetro.' },
      ],
    },
  },
)
