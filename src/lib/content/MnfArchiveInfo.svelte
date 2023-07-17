<script lang="ts">
    import type MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import { formatFileSize } from '$lib/util/FileUtil';
    import CodeBlock from '$lib/content/CodeBlock.svelte';

    export let archive: MnfArchiveEntry;
</script>

<ion-grid>
    <ion-row>
        <ion-col size="2">
            <ion-label>archive path:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{archive.path}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>path:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>/</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>folders:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{archive.folderCount.toLocaleString()}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>files:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{archive.fileCount.toLocaleString()}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>compressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(archive.compressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>decompressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(archive.decompressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row class="filelist">
        <ion-col>
            <CodeBlock language="ini">{archive.fileList}</CodeBlock>
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
