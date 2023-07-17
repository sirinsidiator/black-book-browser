<script lang="ts">
    import { FileEntry, ImageFilePreview, TextFilePreview } from '$lib/FileEntry';
    import { formatFileSize } from '$lib/util/FileUtil';
    import ImageViewer from '$lib/content/ImageViewer.svelte';
    import CodeBlock from '$lib/content/CodeBlock.svelte';

    export let file: FileEntry;

    $: previewLoader = file.getPreviewLoader();
</script>

<ion-grid>
    <ion-row>
        <ion-col size="2">
            <ion-label>path:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{file.path}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>compressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(file.compressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row>
        <ion-col size="2">
            <ion-label>decompressed size:</ion-label>
        </ion-col>
        <ion-col>
            <ion-label>{formatFileSize(file.decompressedSize)}</ion-label>
        </ion-col>
    </ion-row>
    <ion-row class="preview">
        <ion-col>
            {#await previewLoader}
                loading...
            {:then preview}
                {#if preview instanceof ImageFilePreview}
                    <ImageViewer image={preview} />
                {:else if preview instanceof TextFilePreview}
                    <!-- eslint-disable svelte/no-at-html-tags -->
                    <CodeBlock language={preview.language}>{@html preview.getText()}</CodeBlock>
                {:else}
                    <div class="no-preview">no preview available</div>
                {/if}
            {/await}
        </ion-col>
    </ion-row>
</ion-grid>

<style>
    ion-grid {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .preview > ion-col {
        flex-grow: 1;
    }

    .preview {
        flex-grow: 1;
        overflow: auto;
    }

    .no-preview {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }
</style>
