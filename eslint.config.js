// ESLint flat config (PR 168, H22 part 3; exhaustive-deps tightened in PR 143 / M9).
//
// Scope: src/ JS + JSX. PR 168 made `react-hooks/exhaustive-deps` live (the repo
// had ~30 decorative disable comments that nothing processed). PR 143 then
// triaged every violation and flipped the rule to `error` (see below).
//
// exhaustive-deps is `error` (M9 enforcement): every violation is either fixed
// (the clean fetch-on-mount/dep effects were converted to useEffectEvent, see
// src/hooks/useEffectEvent.js) or carries an explicit, reasoned
// `// eslint-disable-next-line` — the realtime/quiz-core effects in SessionFlow/
// StudentJoin whose useEffectEvent conversion is deferred until a live session
// can smoke-test them. Any NEW unsuppressed violation now fails CI.
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
      // react-hooks enforcement (rules-of-hooks since PR 168; exhaustive-deps
      // tightened to error in PR 143 once all violations were triaged):
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
