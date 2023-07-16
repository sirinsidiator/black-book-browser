import adapter from '@sveltejs/adapter-static';
import preprocess from "svelte-preprocess";
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
        })
    }
};

export default config;
