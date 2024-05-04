<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    const dispatch = createEventDispatcher();

    export let entries: FileTreeEntryData<FileTreeEntryDataProvider>[];

    let selected: FileTreeEntryData<FileTreeEntryDataProvider>;

    function select(event: CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>) {
        selected = event.detail;
        dispatch('select', selected);
    }
</script>

<div class="filetree">
    {#each entries as data}
        <FileTreeEntry {data} {selected} on:select={select} />
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
