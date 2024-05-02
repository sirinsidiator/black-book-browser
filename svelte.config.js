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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                tsconfig.exclude.push('../src-tauri/**');
                return tsconfig;
            }
        }
    }
};

export default config;
