<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from 'svelte';
    import VirtualList from 'svelte-virtual-list-ce';
    import { get } from 'svelte/store';
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    const dispatch = createEventDispatcher();

    export let entries: FileTreeEntryData<FileTreeEntryDataProvider>[];
    export let selectedContent: FileTreeEntryDataProvider | null = null;
    export let checkable = false;
    export let levelOffset = 0;
    export let keyboardNavigationTarget: HTMLElement | null = null;
    export let ignorePattern: string | undefined = undefined;

    let scrollToIndex: (index: number) => void;
    let start: number;
    let end: number;
    let selectedIndex = -1;
    let selected: FileTreeEntryData<FileTreeEntryDataProvider> | undefined;
    let flattenedEntries: FileTreeEntryData<FileTreeEntryDataProvider>[] = [];

    function onRefresh(
        entries: FileTreeEntryData<FileTreeEntryDataProvider>[],
        selectedContent: FileTreeEntryDataProvider | null
    ) {
        flattenedEntries = entries.flatMap(flattenTreeRecursive);
        if (selectedContent) {
            selectedIndex = flattenedEntries.findIndex((entry) => entry.data === selectedContent);
            selected = flattenedEntries[selectedIndex];
        } else {
            selectedIndex = -1;
            selected = undefined;
        }
    }

    function flattenTreeRecursive(
        entry: FileTreeEntryData<FileTreeEntryDataProvider>
    ): FileTreeEntryData<FileTreeEntryDataProvider>[] {
        if (get(entry.opened) === false) return [entry];
        const children = get(entry.children);
        return [entry, ...children.flatMap(flattenTreeRecursive)];
    }

    function toggleOpen(
        entry:
            | CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>
            | FileTreeEntryData<FileTreeEntryDataProvider>
    ) {
        if (entry instanceof CustomEvent) entry = entry.detail;
        entry.toggleOpen().then(() => onRefresh(entries, selectedContent), console.error);
    }

    function toggleChecked(
        entry:
            | CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>
            | FileTreeEntryData<FileTreeEntryDataProvider>
    ) {
        if (entry instanceof CustomEvent) entry = entry.detail;
        entry.toggleChecked();
        dispatch('change');
    }

    function select(
        entry:
            | CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>
            | FileTreeEntryData<FileTreeEntryDataProvider>
    ) {
        if (entry instanceof CustomEvent) entry = entry.detail;
        dispatch('select', entry);
    }

    $: onRefresh(entries, selectedContent);

    function scrollToCurrent(index = selectedIndex) {
        const offset = Math.floor((end - start) / 2);
        scrollToIndex(index - offset);
    }

    function onKeyNavigation(event: KeyboardEvent) {
        if (!keyboardNavigationTarget || event.target !== keyboardNavigationTarget) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const nextIndex = event.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
            if (nextIndex >= 0 && nextIndex < flattenedEntries.length) {
                select(flattenedEntries[nextIndex]);
                scrollToCurrent(nextIndex);
            }
        } else if (event.key === 'ArrowRight') {
            if (selected) {
                if (!get(selected.opened)) {
                    toggleOpen(selected);
                } else if (get(selected.children).length > 0) {
                    select(get(selected.children)[0]);
                    scrollToCurrent();
                }
            }
        } else if (event.key === 'ArrowLeft') {
            if (selected) {
                if (get(selected.opened)) {
                    toggleOpen(selected);
                } else if (selected.parent) {
                    select(selected.parent);
                    scrollToCurrent();
                }
            }
        } else if (checkable && (event.key === 'Enter' || event.key === ' ')) {
            if (selected) {
                toggleChecked(selected);
            }
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    onMount(() => {
        document.addEventListener('keydown', onKeyNavigation);
    });

    onDestroy(() => {
        document.removeEventListener('keydown', onKeyNavigation);
    });
</script>

<div class="filetree">
    <VirtualList
        bind:scrollToIndex
        bind:start
        bind:end
        items={flattenedEntries}
        itemHeight={27}
        let:item
    >
        <FileTreeEntry
            data={item}
            {selected}
            {checkable}
            {levelOffset}
            {ignorePattern}
            on:open={toggleOpen}
            on:change={toggleChecked}
            on:select={select}
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
