<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import { formatFileSize } from '$lib/util/FileUtil';
    import {
        documentOutline,
        folderOpenOutline,
        folderOutline,
        scaleOutline
    } from 'ionicons/icons';
    import DetailEntry from './DetailEntry.svelte';

    interface Props {
        folder: FolderEntry;
    }

    let { folder }: Props = $props();

    let statsInit = $derived(folder.initStats());
</script>

{#await statsInit}
    <DetailEntry icon={folderOpenOutline} label="folder path">{folder.path}</DetailEntry>
    <DetailEntry icon={folderOutline} label="folders"
        ><ion-skeleton-text animated={true}></ion-skeleton-text></DetailEntry
    >
    <DetailEntry icon={documentOutline} label="files"
        ><ion-skeleton-text animated={true}></ion-skeleton-text></DetailEntry
    >
    <DetailEntry icon={scaleOutline} label="compressed size"
        ><ion-skeleton-text animated={true}></ion-skeleton-text></DetailEntry
    >
    <DetailEntry icon={scaleOutline} label="decompressed size"
        ><ion-skeleton-text animated={true}></ion-skeleton-text></DetailEntry
    >
{:then folder}
    <DetailEntry icon={folderOpenOutline} label="folder path">{folder.path}</DetailEntry>
    <DetailEntry icon={folderOutline} label="folders"
        >{folder.folderCount.toLocaleString()}</DetailEntry
    >
    <DetailEntry icon={documentOutline} label="files"
        >{folder.fileCount.toLocaleString()}</DetailEntry
    >
    <DetailEntry icon={scaleOutline} label="compressed size"
        >{formatFileSize(folder.compressedSize)}</DetailEntry
    >
    <DetailEntry icon={scaleOutline} label="decompressed size"
        >{formatFileSize(folder.decompressedSize)}</DetailEntry
    >
{/await}

<style>
    ion-skeleton-text {
        width: 100px;
    }
</style>
