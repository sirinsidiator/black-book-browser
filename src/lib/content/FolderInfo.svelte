<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import CodeBlock from '$lib/content/CodeBlock.svelte';
    import { formatFileSize } from '$lib/util/FileUtil';

    export let folder: FolderEntry;
</script>

<ion-grid>
    <ion-row>
        <ion-col size={'2'}>
            <ion-label>path:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{folder.path}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size={'2'}>
            <ion-label>folders:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{folder.folderCount.toLocaleString()}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size={'2'}>
            <ion-label>files:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{folder.fileCount.toLocaleString()}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size={'2'}>
            <ion-label>compressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(folder.compressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size={'2'}>
            <ion-label>decompressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(folder.decompressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row class="filelist">
        <ion-col>
            <CodeBlock language="ini">{folder.fileList}</CodeBlock>
        </ion-col>
    </ion-row>
</ion-grid>

<style>
    ion-grid {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .filelist > ion-col {
        flex-grow: 1;
    }

    .filelist {
        flex-grow: 1;
        overflow: auto;
    }
</style>
