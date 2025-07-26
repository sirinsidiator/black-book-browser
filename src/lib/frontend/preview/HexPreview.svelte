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

    interface Props {
        loader: HexPreviewLoader;
    }

    let { loader }: Props = $props();

    let showHex = $state(false);
</script>

{#if loader.view}
    <HexViewer view={loader.view} />
{:else if showHex}
    <ContentPreview preview={loader.load()} />
{:else}
    <ContentPreviewText icon={informationCircleOutline}>
        no preview available<br />
        <ion-button fill="clear" size="small" onclick={() => (showHex = true)}
            >click to view as hex</ion-button
        >
    </ContentPreviewText>
{/if}

<style>
    ion-button {
        margin: 0;
        text-transform: none;
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --padding-bottom: 0;
    }
</style>
