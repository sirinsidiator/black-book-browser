<script lang="ts">
    import { FileEntry, ImageFilePreview, TextFilePreview } from '$lib/FileEntry';
    import CodeBlock from '$lib/content/CodeBlock.svelte';
    import ImageViewer from '$lib/content/ImageViewer.svelte';
    import { formatFileSize } from '$lib/util/FileUtil';
    import { archiveOutline, documentOutline, downloadOutline, scaleOutline } from 'ionicons/icons';
    import ExtractDialog from './ExtractDialog.svelte';

    export let file: FileEntry;

    function onSavePreview(preview: ImageFilePreview) {
        const url = preview.getDataUrl();
        const a = document.createElement('a');
        a.href = url;
        a.download = file.label + '.png';
        a.click();
    }

    $: previewLoader = file.getPreviewLoader();
</script>

<ion-button color="primary" id="open-extract-dialog">
    <ion-icon slot="start" icon={archiveOutline} />
    extract file
</ion-button>
<ExtractDialog target={file} />
{#await previewLoader then preview}
    {#if preview instanceof ImageFilePreview}
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button color="primary" on:click={() => onSavePreview(preview)}>
            <ion-icon slot="start" icon={downloadOutline} />
            save preview
        </ion-button>
    {/if}
{/await}

<ion-list>
    <ion-item>
        <ion-icon icon={documentOutline} />
        <ion-label class="label">file path</ion-label>
        <ion-label>{file.path}</ion-label>
    </ion-item>
    <ion-item>
        <ion-icon icon={scaleOutline} />
        <ion-label class="label">compressed size</ion-label>
        <ion-label>{formatFileSize(file.compressedSize)}</ion-label>
    </ion-item>
    <ion-item>
        <ion-icon icon={scaleOutline} />
        <ion-label class="label">decompressed size</ion-label>
        <ion-label>{formatFileSize(file.decompressedSize)}</ion-label>
    </ion-item>
</ion-list>

<div class="preview">
    {#await previewLoader}
        <ion-progress-bar type="indeterminate" />
        <div class="no-preview loading">loading...</div>
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
</div>

<style>
    .label {
        margin-left: 15px;
        flex: 0 0 200px;
        font-weight: bold;
    }

    .preview {
        margin: 15px 10px;
        overflow: auto;
        height: calc(100vh - 303px);
        background: var(--ion-background-color);
    }

    .no-preview {
        display: flex;
        justify-content: center;
        align-items: center;
        height: calc(100vh - 303px);
    }

    .no-preview.loading {
        height: calc(100vh - 307px);
    }
</style>
