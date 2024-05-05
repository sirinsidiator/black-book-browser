<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import { formatFileSize } from '$lib/util/FileUtil';
    import {
        documentOutline,
        folderOpenOutline,
        folderOutline,
        scaleOutline
    } from 'ionicons/icons';

    export let folder: FolderEntry;
</script>

<ion-item>
    <ion-icon icon={folderOpenOutline} />
    <ion-label class="label">folder path</ion-label>
    <ion-label>{folder.path}</ion-label>
</ion-item>
<ion-item>
    <ion-icon icon={folderOutline} />
    <ion-label class="label">folders</ion-label>
    <ion-label>{folder.folderCount.toLocaleString()}</ion-label>
</ion-item>
<ion-item>
    <ion-icon icon={documentOutline} />
    <ion-label class="label">files</ion-label>
    <ion-label>{folder.fileCount.toLocaleString()}</ion-label>
</ion-item>
<ion-item>
    <ion-icon icon={scaleOutline} />
    <ion-label class="label">compressed size</ion-label>
    <ion-label>{formatFileSize(folder.compressedSize)}</ion-label>
</ion-item>
<ion-item>
    <ion-icon icon={scaleOutline} />
    <ion-label class="label">decompressed size</ion-label>
    <ion-label>{formatFileSize(folder.decompressedSize)}</ion-label>
</ion-item>

<style>
    .label {
        margin-left: 15px;
        flex: 0 0 200px;
        font-weight: bold;
    }
</style>
