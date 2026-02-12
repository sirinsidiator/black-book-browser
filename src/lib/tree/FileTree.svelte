<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import VirtualList from '$lib/frontend/component/VirtualList.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get } from 'svelte/store';
    import FileTreeEntry from './FileTreeEntry.svelte';
    import type FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    interface Props {
        entries: FileTreeEntryData<FileTreeEntryDataProvider>[];
        selectedContent?: FileTreeEntryDataProvider | null;
        checkable?: boolean;
        levelOffset?: number;
        keyboardNavigationTarget?: HTMLElement | null;
        ignorePattern?: string | undefined;
        onchange?: () => void;
        onselect?: (data: FileTreeEntryData<FileTreeEntryDataProvider>) => void;
    }

    const noop = () => {
        // do nothing
    };

    let {
        entries,
        selectedContent = null,
        checkable = false,
        levelOffset = 0,
        keyboardNavigationTarget = null,
        ignorePattern,
        onchange = noop,
        onselect = noop
    }: Props = $props();

    let flattenedEntries: FileTreeEntryData<FileTreeEntryDataProvider>[] = $derived(
        entries.flatMap(flattenTreeRecursive)
    );
    let selectedIndex = $derived(
        selectedContent ? flattenedEntries.findIndex((entry) => entry.data === selectedContent) : -1
    );
    let selected: FileTreeEntryData<FileTreeEntryDataProvider> | undefined = $derived(
        selectedIndex >= 0 ? flattenedEntries[selectedIndex] : undefined
    );
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    let virtualList: VirtualList<FileTreeEntryData<FileTreeEntryDataProvider>> | null =
        $state(null);

    function flattenTreeRecursive(
        entry: FileTreeEntryData<FileTreeEntryDataProvider>
    ): FileTreeEntryData<FileTreeEntryDataProvider>[] {
        if (!get(entry.opened)) return [entry];
        const children = get(entry.children);
        return [entry, ...children.flatMap(flattenTreeRecursive)];
    }

    function toggleOpen(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        entry.toggleOpen().then(() => {
            flattenedEntries = entries.flatMap(flattenTreeRecursive);
        }, console.error);
    }

    function toggleChecked(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        entry.toggleChecked();
        onchange();
    }

    function scrollToCurrent(index = selectedIndex) {
        try {
            if (virtualList) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                virtualList.scrollToIndex(index);
            }
        } catch (e) {
            console.error('Error scrolling to current index:', e);
        }
    }

    function onKeyNavigation(event: KeyboardEvent) {
        if (!keyboardNavigationTarget || event.target !== keyboardNavigationTarget) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const nextIndex = event.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
            if (nextIndex >= 0 && nextIndex < flattenedEntries.length) {
                onselect(flattenedEntries[nextIndex]);
                scrollToCurrent(nextIndex);
            }
        } else if (event.key === 'ArrowRight') {
            if (selected) {
                if (!get(selected.opened)) {
                    toggleOpen(selected);
                } else if (get(selected.children).length > 0) {
                    onselect(get(selected.children)[0]);
                    scrollToCurrent();
                }
            }
        } else if (event.key === 'ArrowLeft') {
            if (selected) {
                if (get(selected.opened)) {
                    toggleOpen(selected);
                } else if (selected.parent) {
                    onselect(selected.parent);
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
    <VirtualList bind:this={virtualList} items={flattenedEntries} itemHeight={27}>
        {#snippet children(data)}
            <FileTreeEntry
                {data}
                {selected}
                {checkable}
                {levelOffset}
                {ignorePattern}
                onopen={toggleOpen}
                onchange={toggleChecked}
                {onselect}
            />
        {/snippet}
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
