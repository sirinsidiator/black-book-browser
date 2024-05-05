<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import {
        archiveOutline,
        folderOpenOutline,
        folderOutline,
        refreshOutline
    } from 'ionicons/icons';
    import CodeBlock from './CodeBlock.svelte';
    import FolderDetails from './FolderDetails.svelte';

    export let archive: MnfArchiveEntry;

    $: loaded = archive.loaded;
    $: busy = archive.busy;
    $: root = archive.root;

    function onExtract() {}

    function onLoad() {
        archive.loadChildren().catch(console.error);
    }
</script>

{#if $loaded}
    <!-- eslint-disable-next-line svelte/valid-compile -->
    <ion-button color="primary" on:click={onExtract}>
        <ion-icon slot="start" icon={archiveOutline} />
        extract files
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
