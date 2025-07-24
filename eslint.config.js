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
export default ts.config(
    globalIgnores(['**', '!src/**']),
    js.configs.recommended,
    ...ts.configs.recommendedTypeChecked,
    ...svelte.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2025
            }
        }
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: ts.parser,
            parserOptions: {
                projectService: true,
                project: ['./tsconfig.json'],
                extraFileExtensions: extraFileExtensions
            }
        }
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
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
            'no-undef': 'off'
        }
    }
);
