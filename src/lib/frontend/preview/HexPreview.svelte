<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { informationCircleOutline } from 'ionicons/icons';
    import HexViewer from '../component/HexViewer.svelte';
    import ContentPreview from './ContentPreview.svelte';
    import ContentPreviewText from './ContentPreviewText.svelte';
    import type { HexPreviewLoader } from './loader/HexPreviewLoader';

    export let loader: HexPreviewLoader;

    let showHex = false;
</script>

{#if loader.view}
    <HexViewer view={loader.view} />
{:else if showHex}
    <ContentPreview preview={loader.load()} />
{:else}
    <ContentPreviewText icon={informationCircleOutline}>
        no preview available<br />
        <a on:click={() => (showHex = true)}>click to view as hex</a>
    </ContentPreviewText>
{/if}

<style>
    a {
        cursor: pointer;
        color: var(--ion-color-primary);
    }
</style>
