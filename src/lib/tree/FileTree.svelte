<script lang="ts">
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    export let entries: FileTreeEntryData<FileTreeEntryDataProvider>[];
</script>

<div class="filetree">
    {#each entries as data}
        <FileTreeEntry {data} on:select />
    {/each}
</div>

<style>
    .filetree {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        height: 100%;
        padding: 0.5rem;
    }
</style>
