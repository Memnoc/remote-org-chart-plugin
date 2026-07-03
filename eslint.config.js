/**
 * ESLint flat config. Purpose #1 is the react-hooks plugin — rules-of-hooks
 * and exhaustive-deps guard effect dependency correctness, per
 * react.dev/learn/lifecycle-of-reactive-effects ("let the linter verify
 * dependencies"). TypeScript recommended rules ride along; type-AWARE rules
 * are deliberately off to keep `npm run lint` fast.
 */
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist/**', 'dist-server/**', 'website/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error', // deps mistakes are bugs, not warnings
    },
  },
  {
    rules: {
      // `_`-prefixed params are the codebase idiom for intentionally unused
      // (Express handlers: _req, _next).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
