<script lang="ts">
    import { FileEntry, ImageFilePreview, TextFilePreview } from '$lib/FileEntry';
    import CodeBlock from '$lib/content/CodeBlock.svelte';
    import ImageViewer from '$lib/content/ImageViewer.svelte';
    import { formatFileSize } from '$lib/util/FileUtil';
    import {
        documentOutline,
        downloadOutline,
        folderOpenOutline,
        scaleOutline
    } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';

    export let file: FileEntry;

    let loading = false;
    let hasPreview = false;
    let hasPreviewFailed = false;

    function onSavePreview(preview: ImageFilePreview) {
        const url = preview.getDataUrl();
        const a = document.createElement('a');
        a.href = url;
        a.download = file.label + '.png';
        a.click();
    }

    function refresh(file: FileEntry) {
        loading = true;
        return file.getPreviewLoader().then(
            (preview) => {
                loading = false;
                hasPreview =
                    preview instanceof ImageFilePreview || preview instanceof TextFilePreview;
                hasPreviewFailed = false;
                return preview;
            },
            () => {
                loading = false;
                hasPreview = false;
                hasPreviewFailed = true;
                return null;
            }
        );
    }

    $: previewLoader = refresh(file);
</script>

<ContentLayout {loading} {hasPreview} {hasPreviewFailed}>
    <svelte:fragment slot="buttons">
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
    </svelte:fragment>

    <svelte:fragment slot="details">
        <DetailEntry icon={folderOpenOutline} label="archive path"
            >{file.parent.archive.path}</DetailEntry
        >
        <DetailEntry icon={documentOutline} label="file path">{file.path}</DetailEntry>
        <DetailEntry icon={scaleOutline} label="compressed size"
            >{formatFileSize(file.compressedSize)}</DetailEntry
        >
        <DetailEntry icon={scaleOutline} label="decompressed size"
            >{formatFileSize(file.decompressedSize)}</DetailEntry
        >
    </svelte:fragment>

    <svelte:fragment slot="preview">
        {#await previewLoader then preview}
            {#if preview instanceof ImageFilePreview}
                <ImageViewer image={preview} />
            {:else if preview instanceof TextFilePreview}
                <!-- eslint-disable svelte/no-at-html-tags -->
                <CodeBlock language={preview.language}>{@html preview.getText()}</CodeBlock>
            {/if}
        {/await}
    </svelte:fragment>
</ContentLayout>
