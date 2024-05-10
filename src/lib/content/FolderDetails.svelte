<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import { formatFileSize } from '$lib/util/FileUtil';
    import {
        documentOutline,
        folderOpenOutline,
        folderOutline,
        scaleOutline
    } from 'ionicons/icons';
    import DetailEntry from './DetailEntry.svelte';

    export let folder: FolderEntry;
</script>

<DetailEntry icon={folderOpenOutline} label="folder path">{folder.path}</DetailEntry>
<DetailEntry icon={folderOutline} label="folders">{folder.folderCount.toLocaleString()}</DetailEntry
>
<DetailEntry icon={documentOutline} label="files">{folder.fileCount.toLocaleString()}</DetailEntry>
<DetailEntry icon={scaleOutline} label="compressed size"
    >{formatFileSize(folder.compressedSize)}</DetailEntry
>
<DetailEntry icon={scaleOutline} label="decompressed size"
    >{formatFileSize(folder.decompressedSize)}</DetailEntry
>
