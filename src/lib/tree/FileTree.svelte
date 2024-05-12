<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';
    import { get } from 'svelte/store';
    import VirtualList from '@sveltejs/svelte-virtual-list';

    const dispatch = createEventDispatcher();

    export let entries: FileTreeEntryData<FileTreeEntryDataProvider>[];
    export let checkable = false;
    export let levelOffset = 0;

    let flattenedEntries: FileTreeEntryData<FileTreeEntryDataProvider>[] = [];
    let selected: FileTreeEntryData<FileTreeEntryDataProvider>;

    function onRefresh(entries: FileTreeEntryData<FileTreeEntryDataProvider>[]) {
        flattenedEntries = entries.flatMap(flattenTreeRecursive);
    }

    function flattenTreeRecursive(
        entry: FileTreeEntryData<FileTreeEntryDataProvider>
    ): FileTreeEntryData<FileTreeEntryDataProvider>[] {
        if (get(entry.opened) === false) return [entry];
        const children = get(entry.children);
        return [entry, ...children.flatMap(flattenTreeRecursive)];
    }

    function select(event: CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>) {
        selected = event.detail;
        dispatch('select', selected);
    }

    $: onRefresh(entries);
</script>

<div class="filetree">
    <VirtualList items={flattenedEntries} itemHeight={27} let:item>
        <FileTreeEntry
            data={item}
            {selected}
            {checkable}
            {levelOffset}
            on:refresh={() => onRefresh(entries)}
            on:select={select}
            on:change
        />
    </VirtualList>
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
