<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import {
        archiveOutline,
        downloadOutline,
        folderOpenOutline,
        folderOutline,
        refreshOutline
    } from 'ionicons/icons';
    import CodeBlock from './CodeBlock.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';
    import FolderDetails from './FolderDetails.svelte';
    import ContentLayout from './ContentLayout.svelte';

    export let archive: MnfArchiveEntry;

    $: loaded = archive.loaded;
    $: busy = archive.busy;
    $: root = archive.root;

    function onLoad() {
        archive.loadChildren().catch(console.error);
    }

    function onSaveFilelist() {
        const folder = $root;
        if (!folder) {
            return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([folder.fileList], { type: 'text/plain' }));
        const archivePrefix = folder.archive.label.split('\\').pop()?.split('.').shift();
        a.download = archivePrefix + folder.path.replaceAll('/', '_') + 'filelist.txt';
        a.click();
    }
</script>

<ContentLayout hasPreview={$loaded && $root !== null}>
    <svelte:fragment slot="buttons">
        {#if $loaded && $root}
            <ion-button color="primary" id="open-extract-dialog">
                <ion-icon slot="start" icon={archiveOutline} />
                extract files
            </ion-button>
            <ExtractDialog target={$root} />
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-button color="primary" on:click={onSaveFilelist}>
                <ion-icon slot="start" icon={downloadOutline} />
                save filelist
            </ion-button>
        {:else}
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-button color="primary" on:click={onLoad} disabled={$busy}>
                <ion-icon slot="start" icon={refreshOutline} />load</ion-button>
        {/if}
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

    <svelte:fragment slot="preview">
        {#if $loaded && $root}
            <CodeBlock language="ini">{$root.fileList}</CodeBlock>
        {/if}
    </svelte:fragment>
</ContentLayout>
