<script lang="ts">
    import type FontPreviewLoader from './loader/FontPreviewLoader';

    // eslint-disable-next-line svelte/valid-compile
    export let loader: FontPreviewLoader;
</script>

<div>abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890.:,;'"(!=)+-*/=</div>

{#each [12, 18, 24, 36, 48] as size}
    <div style="font-size: {size}px">The quick brown fox jumps over the lazy dog. 1234567890</div>
{/each}

<style>
    div {
        font-family: 'FontPreview';
        font-size: 1.5em;
        padding: 10px;
    }
</style>
