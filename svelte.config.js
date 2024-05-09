import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import { importAssets } from 'svelte-preprocess-import-assets';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [importAssets(), preprocess()],

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

    onwarn: (warning, handler) => {
        if (!warning.code.startsWith('a11y-')) {
            handler(warning);
        }
    }
};
export default config;
