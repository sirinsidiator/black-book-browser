<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import SavePreviewButton from '$lib/frontend/preview/SavePreviewButton.svelte';
    import { folderOpenOutline } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';
    import ExtractDialog from './ExtractDialog.svelte';
    import FolderDetails from './FolderDetails.svelte';

    export let folder: FolderEntry;

    $: preview = folder.getPreviewLoader();
</script>

<ContentLayout {preview}>
    <svelte:fragment slot="buttons">
        <ExtractDialog target={folder} />
        <SavePreviewButton {preview}>save filelist</SavePreviewButton>
    </svelte:fragment>

    <svelte:fragment slot="details">
        <DetailEntry icon={folderOpenOutline} label="archive path"
            >{folder.archive.path}</DetailEntry
        >
        <FolderDetails {folder} />
    </svelte:fragment>
</ContentLayout>
