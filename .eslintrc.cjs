// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:svelte/recommended',
        'prettier'
    ],
    rules: {
        // these rules produce false positives in svelte files
        'no-inner-declarations': 'off',
        'no-undef': 'off'
    },
    plugins: ['@typescript-eslint'],
    ignorePatterns: ['*.cjs'],
    overrides: [
        {
            files: ['*.svelte'],
            parser: 'svelte-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser'
            }
        }
    ],
    parserOptions: {
        project: 'tsconfig.json',
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        ecmaVersion: 2023
    },
    env: {
        browser: true,
        es2023: true
    }
};
