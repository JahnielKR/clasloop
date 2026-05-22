// ESLint flat config (PR 168, H22 part 3).
//
// Scope: src/ JS + JSX. The primary goal is to make
// `react-hooks/exhaustive-deps` live — the repo had ~30 decorative
// `// eslint-disable-next-line react-hooks/exhaustive-deps` comments that
// nothing processed (no ESLint existed). With this config they finally do
// something, which is the prerequisite PR 143 (M9) was waiting on.
//
// exhaustive-deps is `warn` (not `error`) on purpose: those ~30 live
// suppressions sit in realtime/quiz core (SessionFlow, StudentJoin); flipping
// to `error` now would red CI before PR 143 can triage them. PR 143 converts
// the suppressions to useEffectEvent and then tightens this to `error`.
//
// .ts/.tsx are not linted here (no typescript-eslint parser installed — see
// the devDeps). `tsc --noEmit` (npm run typecheck) already covers TS; full
// type-aware linting is a documented follow-up. All exhaustive-deps
// suppressions live in .jsx, so JS/JSX coverage is sufficient for the M9 goal.

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'src/lib/noto-sans-kr-data.js', // generated, multi-MB subset font data
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...js.configs.recommended.rules,
      // The codebase predates linting; unused vars are cleanup, not a build
      // blocker. Keep as a warning so the signal is visible without redding CI.
      'no-unused-vars': 'warn',
      // Empty catch blocks are an intentional "ignore" pattern here; allow them.
      // Other empty blocks stay a (non-blocking) warning.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // The Vite/React 17+ automatic JSX runtime means React need not be in scope.
      'react/react-in-jsx-scope': 'off',
      // The two rules this PR exists to enable:
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
