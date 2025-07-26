<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import SavePreviewButton from '$lib/frontend/preview/SavePreviewButton.svelte';
    import type { ContentPreviewLoader } from '$lib/frontend/preview/loader/ContentPreviewLoader';
    import { dirname } from '$lib/util/FileUtil';
    import { openPath } from '@tauri-apps/plugin-opener';
    import { folderOpenOutline, folderOutline, refreshOutline } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';
    import FolderDetails from './FolderDetails.svelte';

    interface Props {
        archive: MnfArchiveEntry;
    }

    let { archive }: Props = $props();
    let loaded = $derived(archive.loaded);
    let busy = $derived(archive.busy);
    let root = $derived(archive.root);
    let preview: Promise<ContentPreviewLoader> | undefined = $derived(
        $loaded ? archive.getPreviewLoader() : undefined
    );

    function onLoad() {
        archive.loadChildren().catch(console.error);
    }

    async function explore() {
        const path = await dirname(archive.path);
        await openPath(path);
    }
</script>

<ContentLayout {preview}>
    {#snippet buttons()}
        {#if $loaded && $root && preview}
            <ExtractDialog target={$root} />
            <SavePreviewButton {preview}>save filelist</SavePreviewButton>
            <SavePreviewButton {preview} options={['.dds', 'texturelist.txt']}
                >save texturelist</SavePreviewButton
            >
        {:else}
            <ion-button color="primary" onclick={onLoad} disabled={$busy}>
                <ion-icon slot="start" icon={refreshOutline}></ion-icon>load</ion-button
            >
        {/if}

        <ion-button color="primary" onclick={explore}>
            <ion-icon slot="start" icon={folderOpenOutline}></ion-icon>
            open folder
        </ion-button>
    {/snippet}

    {#snippet details()}
        <DetailEntry icon={$loaded ? folderOpenOutline : folderOutline} label="archive path"
            >{archive.path}</DetailEntry
        >
        {#if $busy}
            <ion-progress-bar type="indeterminate"></ion-progress-bar>
        {/if}
        {#if $loaded && $root}
            <FolderDetails folder={$root} />
        {/if}
    {/snippet}
</ContentLayout>
