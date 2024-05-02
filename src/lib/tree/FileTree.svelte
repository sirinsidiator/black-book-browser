<script lang="ts">
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntry';

    export let entries: FileTreeEntryData[];
</script>

<div class="filetree">
    {#each entries as data}
        <FileTreeEntry {data} />
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
