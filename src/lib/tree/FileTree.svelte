<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
    import { onDestroy, onMount, tick } from 'svelte';
    import { get, type Unsubscriber } from 'svelte/store';
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
    const DEFAULT_HEIGHT = 27;

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

    let flattenedEntries: FileTreeEntryData<FileTreeEntryDataProvider>[] = $state([]);
    let selectedIndex = $derived(
        selectedContent ? flattenedEntries.findIndex((entry) => entry.data === selectedContent) : -1
    );
    let selected: FileTreeEntryData<FileTreeEntryDataProvider> | undefined = $derived(
        selectedIndex >= 0 ? flattenedEntries[selectedIndex] : undefined
    );
    let fileTreeContainer: HTMLElement | null = $state(null);
    let virtualList: SvelteVirtualList<FileTreeEntryData<FileTreeEntryDataProvider>> | null =
        $state(null);
    let treeSubscriptions: Unsubscriber[] = [];

    function flattenTreeRecursive(
        entry: FileTreeEntryData<FileTreeEntryDataProvider>
    ): FileTreeEntryData<FileTreeEntryDataProvider>[] {
        if (!get(entry.opened)) return [entry];
        const children = get(entry.children);
        return [entry, ...children.flatMap(flattenTreeRecursive)];
    }

    function refreshFlattenedEntries() {
        flattenedEntries = entries.flatMap(flattenTreeRecursive);
    }

    function clearTreeSubscriptions() {
        treeSubscriptions.forEach((unsubscribe) => {
            unsubscribe();
        });
        treeSubscriptions = [];
    }

    function setupTreeSubscriptions(nextEntries: FileTreeEntryData<FileTreeEntryDataProvider>[]) {
        clearTreeSubscriptions();
        treeSubscriptions = nextEntries.map((entry) => {
            return entry.onTreeChange(refreshFlattenedEntries);
        });
        refreshFlattenedEntries();
    }

    $effect(() => {
        setupTreeSubscriptions(entries);
    });

    function toggleOpen(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        entry.toggleOpen().then(() => {
            refreshFlattenedEntries();
        }, console.error);
    }

    function toggleChecked(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        entry.toggleChecked();
        onchange();
    }

    function scrollToCurrent(targetIndex = selectedIndex, smoothScroll = true) {
        const containerHeight = fileTreeContainer?.clientHeight ?? window.innerHeight;
        const visibleItems = Math.floor(containerHeight / DEFAULT_HEIGHT);
        const offset = Math.floor(visibleItems / 2) - 1;
        const index = Math.max(0, targetIndex - offset);
        virtualList?.scroll({ index, align: 'top', smoothScroll }).catch((e: unknown) => {
            console.error('Error scrolling to current index:', e);
        });
    }

    async function focusSelectedEntry() {
        await tick();
        fileTreeContainer
            ?.querySelector<HTMLElement>('.content.selected')
            ?.focus({ preventScroll: true });
    }

    function handleSelect(
        entry: FileTreeEntryData<FileTreeEntryDataProvider>,
        focusSelection = false
    ) {
        onselect(entry);
        const index = flattenedEntries.findIndex((e) => e === entry);
        if (index >= 0) {
            scrollToCurrent(index);
        }
        if (focusSelection) {
            focusSelectedEntry().catch(console.error);
        }
    }

    function onKeyNavigation(event: KeyboardEvent) {
        const currentFocus = document.querySelector(':focus');
        if (currentFocus && currentFocus.scrollHeight > currentFocus.clientHeight) {
            return;
        }

        if (
            event.key === 'Tab' ||
            !keyboardNavigationTarget ||
            !event.composedPath().includes(keyboardNavigationTarget)
        ) {
            return;
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const nextIndex = event.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
            if (nextIndex >= 0 && nextIndex < flattenedEntries.length) {
                handleSelect(flattenedEntries[nextIndex], true);
            }
        } else if (event.key === 'ArrowRight') {
            if (selected) {
                if (!get(selected.opened)) {
                    toggleOpen(selected);
                } else if (get(selected.children).length > 0) {
                    handleSelect(get(selected.children)[0], true);
                }
            }
        } else if (event.key === 'ArrowLeft') {
            if (selected) {
                if (get(selected.opened)) {
                    toggleOpen(selected);
                } else if (selected.parent) {
                    handleSelect(selected.parent, true);
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
        setTimeout(() => {
            scrollToCurrent(selectedIndex, false);
        }, 0);
    });

    onDestroy(() => {
        clearTreeSubscriptions();
        document.removeEventListener('keydown', onKeyNavigation);
    });
</script>

<div class="filetree" bind:this={fileTreeContainer}>
    <SvelteVirtualList
        bind:this={virtualList}
        items={flattenedEntries}
        defaultEstimatedItemHeight={DEFAULT_HEIGHT}
        bufferSize={30}
    >
        {#snippet renderItem(item)}
            <FileTreeEntry
                data={item}
                {selected}
                {checkable}
                {levelOffset}
                {ignorePattern}
                onopen={toggleOpen}
                onchange={toggleChecked}
                onselect={handleSelect}
            />
        {/snippet}
    </SvelteVirtualList>
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
