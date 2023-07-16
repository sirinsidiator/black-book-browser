module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: [
        'plugin:svelte/recommended',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
    ],
    rules: {
        // these rules produce false positives in svelte files
        'svelte/valid-compile': 'off',
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
    settings: {
        'svelte3/typescript': () => require('typescript')
    },
    parserOptions: {
        project: 'tsconfig.json',
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        ecmaVersion: 2020
    },
    env: {
        browser: true,
        es2017: true,
        node: true
    }
};
