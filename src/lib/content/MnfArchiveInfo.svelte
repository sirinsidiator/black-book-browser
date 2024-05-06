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
    import FolderDetails from './FolderDetails.svelte';
    import ExtractDialog from './ExtractDialog.svelte';

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
{/if}
<!-- eslint-disable-next-line svelte/valid-compile -->
<ion-button color="primary" on:click={onLoad} disabled={$busy}>
    <ion-icon slot="start" icon={refreshOutline} />
    {#if $loaded}reload{:else}load{/if}
</ion-button>
<ion-list>
    <ion-item>
        <ion-icon icon={$loaded ? folderOpenOutline : folderOutline} />
        <ion-label class="label">archive path</ion-label>
        <ion-label>{archive.path}</ion-label>
    </ion-item>
    {#if $busy}
        <ion-progress-bar type="indeterminate" />
    {/if}
    {#if $loaded && $root}
        <FolderDetails folder={$root} />
    {/if}
</ion-list>
{#if $loaded && $root}
    <div class="filelist">
        <CodeBlock language="ini">{$root.fileList}</CodeBlock>
    </div>
{/if}

<style>
    .label {
        margin-left: 15px;
        flex: 0 0 200px;
        font-weight: bold;
    }

    .filelist {
        margin: 15px 10px;
        overflow: auto;
        max-height: calc(100vh - 447px);
    }
</style>
