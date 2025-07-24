<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type FontPreviewLoader from './loader/FontPreviewLoader';

    export let loader: FontPreviewLoader;
</script>

<div>abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890.:,;'"(!=)+-*/=</div>

{#each [12, 18, 24, 36, 48] as size (size)}
    <div style="font-size: {size}px">The quick brown fox jumps over the lazy dog. 1234567890</div>
{/each}

<style>
    div {
        font-family: 'FontPreview';
        font-size: 1.5em;
        padding: 10px;
    }
</style>
