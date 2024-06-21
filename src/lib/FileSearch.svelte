<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { SearchbarInputEventDetail } from '@ionic/core';
    import fuzzysort from 'fuzzysort';
    import { onDestroy, onMount } from 'svelte';
    import VirtualList from 'svelte-virtual-list-ce';
    import { FileEntry } from './FileEntry';
    import type FileSearchEntry from './FileSearchEntry';
    import type StateManager from './StateManager';
    import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

    export let manager: StateManager;

    const gameInstallManager = manager.gameInstallManager;
    const selectedContent = manager.selectedContent;
    const searchTerm = gameInstallManager.searchTerm;
    const searchResults = gameInstallManager.searchResults;
    const searchDuration = gameInstallManager.searchDuration;
    const searching = gameInstallManager.searching;

    let statsHidden = false;
    let searchbar: HTMLIonSearchbarElement;
    let inputElement: HTMLInputElement;
    let scrollToIndex: (index: number) => void;
    let start: number;
    let end: number;
    let selectedIndex = -1;
    let selectedResult: Fuzzysort.KeysResult<FileSearchEntry> | undefined = undefined;

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

    function highlight(item: unknown) {
        const result = item as Fuzzysort.KeysResult<FileSearchEntry>;
        return fuzzysort.highlight(result[0]);
    }

    async function onSelect(item: unknown) {
        selectedResult = item as Fuzzysort.KeysResult<FileSearchEntry>;
        const gameInstall = gameInstallManager.getGameInstallForArchive(selectedResult.obj.archive);
        if (!gameInstall) {
            return console.warn('GameInstall not found for search result', selectedResult.obj);
        }
        const archiveEntry = gameInstall.getMnfArchiveEntry(selectedResult.obj.archive);
        if (!archiveEntry) {
            return console.warn('Archive entry not found for search result', selectedResult.obj);
        }
        const fileEntry = await archiveEntry.getFileEntry(selectedResult.obj.file);
        if (!fileEntry) {
            return console.warn('File entry not found for search result', selectedResult.obj);
        }
        $selectedContent = fileEntry;
    }

    function showStats(results: Fuzzysort.KeysResults<FileSearchEntry> | null) {
        if (results) {
            statsHidden = false;
        }
    }
    $: showStats($searchResults);

    function refresh(
        results: Fuzzysort.KeysResults<FileSearchEntry> | null,
        selected: FileTreeEntryDataProvider | null
    ) {
        if (results && selected instanceof FileEntry) {
            selectedIndex = results.findIndex(
                (result) =>
                    result.obj.archive === selected.file.archivePath &&
                    result.obj.file === selected.path
            );
            selectedResult = results[selectedIndex];
        } else {
            selectedIndex = -1;
            selectedResult = undefined;
        }
    }
    $: refresh($searchResults, $selectedContent);

    function isSelected(
        item: unknown,
        selectedResult: Fuzzysort.KeysResult<FileSearchEntry> | undefined
    ) {
        return item === selectedResult;
    }

    function scrollToCurrent(index = selectedIndex) {
        const offset = Math.floor((end - start) / 2);
        scrollToIndex(index - offset);
    }

    function selectAndScroll(index: number) {
        if ($searchResults) {
            index = Math.max(0, Math.min(index, $searchResults.length - 1));
            onSelect($searchResults[index]).catch(console.error);
            scrollToCurrent(index);
        }
    }
    function onKeyNavigation(event: KeyboardEvent) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const nextIndex = event.key === 'ArrowDown' ? selectedIndex + 1 : selectedIndex - 1;
            selectAndScroll(nextIndex);
        } else if (event.target !== inputElement && event.key === 'Home') {
            selectAndScroll(0);
        } else if (event.target !== inputElement && event.key === 'End') {
            selectAndScroll(($searchResults?.length ?? 0) - 1);
        } else if (event.key === 'PageUp') {
            const visible = end - start;
            selectAndScroll(selectedIndex - visible);
        } else if (event.key === 'PageDown') {
            const visible = end - start;
            selectAndScroll(selectedIndex + visible);
        } else if (event.key === 'f' && event.ctrlKey) {
            searchbar.setFocus().catch(console.error);
        } else if (event.key === 'Enter') {
            inputElement?.blur();
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    onMount(async () => {
        doSearch($searchTerm);
        searchbar.value = $searchTerm;
        inputElement = await searchbar.getInputElement();
        await searchbar.setFocus();
        document.addEventListener('keydown', onKeyNavigation);
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
            on:ionInput={onSearch}
            on:ionClear={onClear}
        ></ion-searchbar>
        {#if $searching}
            <ion-progress-bar type="indeterminate" />
        {/if}
    </ion-toolbar>
</ion-header>
<ion-content>
    {#if $searchResults}
        <VirtualList bind:scrollToIndex bind:start bind:end items={$searchResults} let:item>
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <div
                class="result"
                class:selected={isSelected(item, selectedResult)}
                on:click={() => onSelect(item)}
            >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html highlight(item)}
            </div>
        </VirtualList>
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-chip
            class="result-stats"
            class:hidden={statsHidden}
            on:click={() => (statsHidden = true)}
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
