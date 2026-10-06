<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
    import type { SearchbarInputEventDetail } from '@ionic/core';
    import fuzzysort, { type KeysResult, type KeysResults } from 'fuzzysort';
    import { onDestroy, onMount, tick } from 'svelte';
    import { FileEntry } from './FileEntry';
    import type FileSearchEntry from './FileSearchEntry';
    import type StateManager from './StateManager.svelte';
    import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
    import { redirectKeydown } from './utils/common';

    interface Props {
        manager: StateManager;
    }

    let { manager }: Props = $props();

    const gameInstallManager = $derived(manager.gameInstallManager);
    const searchTerm = $derived(gameInstallManager.searchTerm);
    const searchResults = $derived(gameInstallManager.searchResults);
    const searchDuration = $derived(gameInstallManager.searchDuration);
    const searching = $derived(gameInstallManager.searching);
    const extractDialogOpen = $derived(manager.extractDialogOpen);
    const DEFAULT_HEIGHT = 36;

    let statsHidden = $derived($searchResults === null || $searchResults.length === 0);
    let searchbar: HTMLIonSearchbarElement | undefined = $state();
    let inputElement: HTMLInputElement | undefined = $state();
    let searchResultsContainer: HTMLElement | undefined = $state();
    let virtualList: SvelteVirtualList<KeysResult<FileSearchEntry>> | undefined = $state();
    let start = 0;
    let end = 0;
    let { selectedIndex, selectedResult } = $derived(
        refresh($searchResults, manager.selectedContent)
    );

    function doSearch(input: string) {
        gameInstallManager.submitFileSearch(input).catch(console.error);
    }

    function onSearch(event: CustomEvent<SearchbarInputEventDetail>) {
        const input = event.detail.value ?? '';

        if (input === '') {
            onClear();
        } else {
            doSearch(input);
        }
    }

    function onClear() {
        gameInstallManager.clearFileSearch();
    }

    function restoreResult(item: unknown): KeysResult<FileSearchEntry> {
        let result = item as KeysResult<FileSearchEntry>;
        return result;
    }

    function highlight(item: unknown) {
        const result = restoreResult(item);
        return fuzzysort.highlight(result[0]);
    }

    async function onSelect(item: KeysResult<FileSearchEntry>, focusSelection = false) {
        selectedResult = item;

        const index = $searchResults?.findIndex((result) => result === item) ?? -1;
        if (index >= 0) {
            scrollToCurrent(index);
        }

        if (focusSelection) {
            focusSelectedResult().catch(console.error);
        }

        const gameInstall = gameInstallManager.getGameInstallForArchive(selectedResult.obj.archive);
        if (!gameInstall) {
            console.warn('GameInstall not found for search result', selectedResult.obj);
            return;
        }
        const archiveEntry = gameInstall.getMnfArchiveEntry(selectedResult.obj.archive);
        if (!archiveEntry) {
            console.warn('Archive entry not found for search result', selectedResult.obj);
            return;
        }
        const fileEntry = await archiveEntry.getFileEntry(selectedResult.obj.file);
        if (!fileEntry) {
            console.warn('File entry not found for search result', selectedResult.obj);
            return;
        }
        manager.selectedContent = fileEntry;
    }

    function refresh(
        results: KeysResults<FileSearchEntry> | null,
        selected: FileTreeEntryDataProvider | null
    ) {
        if (results && selected instanceof FileEntry) {
            const selectedIndex = results.findIndex(
                (result) =>
                    result.obj.archive === selected.file.archivePath &&
                    result.obj.file === selected.path
            );
            return {
                selectedIndex,
                selectedResult: results[selectedIndex]
            };
        } else {
            return {
                selectedIndex: -1,
                selectedResult: undefined
            };
        }
    }

    function isSelected(
        item: KeysResult<FileSearchEntry>,
        selectedResult: KeysResult<FileSearchEntry> | undefined
    ) {
        return item === selectedResult;
    }

    function scrollToCurrent(targetIndex = selectedIndex, smoothScroll = true) {
        const containerHeight = searchResultsContainer?.clientHeight ?? window.innerHeight;
        const visibleItems = Math.floor(containerHeight / DEFAULT_HEIGHT);
        const offset = Math.floor(visibleItems / 2) - 1;
        const index = Math.max(0, targetIndex - offset);
        virtualList?.scroll({ index, align: 'top', smoothScroll }).catch((e: unknown) => {
            console.error('Error scrolling to current index:', e);
        });
    }

    function isFromInput(event: KeyboardEvent) {
        return inputElement ? event.composedPath().includes(inputElement) : false;
    }

    async function focusSelectedResult() {
        await tick();
        searchResultsContainer
            ?.querySelector<HTMLElement>('.result.selected')
            ?.focus({ preventScroll: true });
    }

    function selectByIndex(index: number, focusSelection = false) {
        if ($searchResults) {
            index = Math.max(0, Math.min(index, $searchResults.length - 1));
            onSelect($searchResults[index], focusSelection).catch(console.error);
        }
    }
    function onKeyNavigation(event: KeyboardEvent) {
        const currentFocus = document.querySelector(':focus');
        if (currentFocus && currentFocus.scrollHeight > currentFocus.clientHeight) {
            return;
        }

        const fromInput = isFromInput(event);
        if (event.key === 'Tab' || extractDialogOpen) {
            return;
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const nextIndex = event.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
            selectByIndex(nextIndex, !fromInput);
        } else if (event.key === 'Home' && inputElement && !fromInput) {
            selectByIndex(0, true);
        } else if (event.key === 'End' && inputElement && !fromInput) {
            selectByIndex(($searchResults?.length ?? 0) - 1, true);
        } else if (event.key === 'PageUp') {
            const visible = end - start;
            selectByIndex(selectedIndex - visible, !fromInput);
        } else if (event.key === 'PageDown') {
            const visible = end - start;
            selectByIndex(selectedIndex + visible, !fromInput);
        } else if (event.key === 'f' && event.ctrlKey) {
            searchbar?.setFocus().catch(console.error);
        } else if (event.key === 'Enter') {
            if (fromInput) {
                inputElement?.blur();
            } else if (selectedResult) {
                onSelect(selectedResult).catch(console.error);
            } else {
                return;
            }
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    onMount(async () => {
        if (!searchbar) throw new Error('Searchbar is not defined');
        doSearch($searchTerm);
        searchbar.value = $searchTerm;
        inputElement = await searchbar.getInputElement();
        await searchbar.setFocus();
        document.addEventListener('keydown', onKeyNavigation);
        setTimeout(() => {
            scrollToCurrent(selectedIndex, false);
        }, 0);
    });

    onDestroy(() => {
        document.removeEventListener('keydown', onKeyNavigation);
    });
</script>

<ion-header>
    <ion-toolbar>
        <ion-searchbar
            bind:this={searchbar}
            color="light"
            debounce={100}
            onionInput={onSearch}
            onionClear={onClear}
        ></ion-searchbar>
        {#if $searching}
            <ion-progress-bar type="indeterminate"></ion-progress-bar>
        {/if}
    </ion-toolbar>
</ion-header>
<ion-content bind:this={searchResultsContainer}>
    {#if $searchResults}
        <SvelteVirtualList
            bind:this={virtualList}
            items={$searchResults as unknown as KeysResult<FileSearchEntry>[]}
            defaultEstimatedItemHeight={DEFAULT_HEIGHT}
            bufferSize={30}
        >
            {#snippet renderItem(item)}
                <div
                    class="result"
                    class:selected={isSelected(item as KeysResult<FileSearchEntry>, selectedResult)}
                    role="button"
                    tabindex="-1"
                    onclick={() => onSelect(item as KeysResult<FileSearchEntry>)}
                    onkeydown={redirectKeydown(() => onSelect(item as KeysResult<FileSearchEntry>))}
                >
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html highlight(item)}
                </div>
            {/snippet}
        </SvelteVirtualList>
        <ion-chip
            class="result-stats"
            class:hidden={statsHidden}
            role="button"
            tabindex="0"
            onclick={() => {
                statsHidden = true;
            }}
            onkeydown={redirectKeydown(() => {
                statsHidden = true;
            })}
        >
            {#if $searching}
                Searching...
            {:else}
                found {$searchResults.length.toLocaleString()} results in {$searchDuration.toLocaleString()}ms
            {/if}
        </ion-chip>
    {/if}
</ion-content>

<style>
    ion-content {
        --padding-start: 5px;
        --padding-end: 5px;
    }

    .result {
        margin: 0;
        padding: 0.5em;
        color: var(--ion-color-medium);
        border-bottom: 1px solid var(--ion-color-light);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        cursor: pointer;
    }

    .result.selected {
        background-color: var(--ion-color-light);
    }

    :global(.result b) {
        color: var(--ion-color-primary);
    }

    .result-stats {
        margin: 0 auto;
        position: absolute;
        bottom: 5px;
        left: 50%;
        transform: translateX(-50%);
        --background: var(--ion-background-color-step-150);
    }

    .result-stats.hidden {
        animation: fadeout 0.5s forwards;
    }

    @keyframes fadeout {
        to {
            opacity: 0;
        }
    }
</style>
