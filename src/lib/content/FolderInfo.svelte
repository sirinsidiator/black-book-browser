<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import { archiveOutline, downloadOutline, folderOpenOutline } from 'ionicons/icons';
    import CodeBlock from './CodeBlock.svelte';
    import FolderDetails from './FolderDetails.svelte';

    export let folder: FolderEntry;

    function onExtract() {}

    function onSaveFilelist() {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([folder.fileList], { type: 'text/plain' }));
        const archivePrefix = folder.archive.label.split('\\').pop()?.split('.').shift();
        a.download = archivePrefix + folder.path.replaceAll('/', '_') + 'filelist.txt';
        a.click();
    }
</script>

<!-- eslint-disable-next-line svelte/valid-compile -->
<ion-button color="primary" on:click={onExtract}>
    <ion-icon slot="start" icon={archiveOutline} />
    extract files
</ion-button>
<!-- eslint-disable-next-line svelte/valid-compile -->
<ion-button color="primary" on:click={onSaveFilelist}>
    <ion-icon slot="start" icon={downloadOutline} />
    save filelist
</ion-button>
<ion-list>
    <ion-item>
        <ion-icon icon={folderOpenOutline} />
        <ion-label class="label">archive path</ion-label>
        <ion-label>{folder.archive.path}</ion-label>
    </ion-item>
    <FolderDetails {folder} />
</ion-list>

<div class="filelist">
    <CodeBlock language="ini">{folder.fileList}</CodeBlock>
</div>

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
