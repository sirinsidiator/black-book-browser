<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import SavePreviewButton from '$lib/frontend/preview/SavePreviewButton.svelte';
    import type { ContentPreviewLoader } from '$lib/frontend/preview/loader/ContentPreviewLoader';
    import { dirname } from '$lib/util/FileUtil';
    import { open } from '@tauri-apps/plugin-shell';
    import { folderOpenOutline, folderOutline, refreshOutline } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';
    import FolderDetails from './FolderDetails.svelte';

    export let archive: MnfArchiveEntry;
    let preview: Promise<ContentPreviewLoader> | undefined;

    $: loaded = archive.loaded;
    $: busy = archive.busy;
    $: root = archive.root;

    function onLoad() {
        archive.loadChildren().catch(console.error);
    }

    async function explore() {
        const path = await dirname(archive.path);
        await open(path);
    }

    function refresh(loaded: boolean) {
        if (loaded) {
            preview = archive.getPreviewLoader();
        } else {
            preview = undefined;
        }
    }

    $: refresh($loaded);
</script>

<ContentLayout {preview}>
    <svelte:fragment slot="buttons">
        {#if $loaded && $root && preview}
            <ExtractDialog target={$root} />
            <SavePreviewButton {preview}>save filelist</SavePreviewButton>
            <SavePreviewButton {preview} options={['.dds', 'texturelist.txt']}>save texturelist</SavePreviewButton>
        {:else}
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-button color="primary" on:click={onLoad} disabled={$busy}>
                <ion-icon slot="start" icon={refreshOutline} />load</ion-button
            >
        {/if}

        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button color="primary" on:click={explore}>
            <ion-icon slot="start" icon={folderOpenOutline} />
            open folder
        </ion-button>
    </svelte:fragment>

    <svelte:fragment slot="details">
        <DetailEntry icon={$loaded ? folderOpenOutline : folderOutline} label="archive path"
            >{archive.path}</DetailEntry
        >
        {#if $busy}
            <ion-progress-bar type="indeterminate" />
        {/if}
        {#if $loaded && $root}
            <FolderDetails folder={$root} />
        {/if}
    </svelte:fragment>
</ContentLayout>
