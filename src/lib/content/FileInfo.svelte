<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';
    import SavePreviewButton from '$lib/frontend/preview/SavePreviewButton.svelte';
    import { formatFileSize } from '$lib/util/FileUtil';
    import { documentOutline, folderOpenOutline, scaleOutline } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';

    interface Props {
        file: FileEntry;
    }

    let { file }: Props = $props();
    let preview = $derived(file.getPreviewLoader());
</script>

<ContentLayout {preview}>
    {#snippet buttons()}
        <ExtractDialog target={file} />
        <SavePreviewButton {preview}>save preview</SavePreviewButton>
    {/snippet}

    {#snippet details()}
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
    {/snippet}
</ContentLayout>
