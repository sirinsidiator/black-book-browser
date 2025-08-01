// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import adapter from '@sveltejs/adapter-static';
import { sveltePreprocess } from 'svelte-preprocess';
import { importAssets } from 'svelte-preprocess-import-assets';

let version = process.env.npm_package_version || '0.0.0';
if (process.env.NODE_ENV === 'development') {
    version = `${version}-dev`;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [
        importAssets(),
        sveltePreprocess({
            replace: [['@version', version]]
        })
    ],

    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'index.html',
            precompress: false
        }),
        typescript: {
            config: (tsconfig) => {
                tsconfig.exclude.push('../src-tauri/**');
                return tsconfig;
            }
        }
    },

    onwarn: (warning) => {
        if (warning.code.startsWith('a11y')) {
            return false;
        }
        return true;
    }
};
export default config;
