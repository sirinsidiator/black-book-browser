// SPDX-FileCopyrightText: 2025 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const extraFileExtensions = ['.svelte'];
const svelteFilePattern = ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'];
export default ts.config(
    globalIgnores(['**', '!src/**']),
    js.configs.recommended,
    ts.configs.strictTypeChecked,
    ts.configs.stylisticTypeChecked,
    ...svelte.configs.recommended,
    ...svelte.configs.prettier,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2025
            }
        }
    },
    {
        ignores: svelteFilePattern,
        languageOptions: {
            parser: ts.parser,
            parserOptions: {
                projectService: true,
                extraFileExtensions: extraFileExtensions
            }
        }
    },
    {
        files: svelteFilePattern,
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: extraFileExtensions,
                parser: ts.parser,
                svelteConfig
            }
        }
    },
    {
        rules: {
            'no-undef': 'off',
            '@typescript-eslint/no-unnecessary-type-parameters': 'off',
            'svelte/valid-compile': [
                'error',
                {
                    ignoreWarnings: false
                }
            ],
            'svelte/no-target-blank': 'error'
        }
    }
);
