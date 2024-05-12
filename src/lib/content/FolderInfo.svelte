<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import { downloadOutline, folderOpenOutline } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';
    import FileListPreview from './FileListPreview.svelte';
    import FolderDetails from './FolderDetails.svelte';

    export let folder: FolderEntry;

    function onSaveFilelist() {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([folder.fileList], { type: 'text/plain' }));
        const archivePrefix = folder.archive.label.split('\\').pop()?.split('.').shift();
        a.download = archivePrefix + folder.path.replaceAll('/', '_') + 'filelist.txt';
        a.click();
    }
</script>

<ContentLayout hasPreview={true}>
    <svelte:fragment slot="buttons">
        <ExtractDialog target={folder} />
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button color="primary" on:click={onSaveFilelist}>
            <ion-icon slot="start" icon={downloadOutline} />
            save filelist
        </ion-button>
    </svelte:fragment>

    <svelte:fragment slot="details">
        <DetailEntry icon={folderOpenOutline} label="archive path"
            >{folder.archive.path}</DetailEntry
        >
        <FolderDetails {folder} />
    </svelte:fragment>

    <svelte:fragment slot="preview">
        <FileListPreview {folder} />
    </svelte:fragment>
</ContentLayout>
