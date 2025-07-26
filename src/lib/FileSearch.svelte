<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { SearchbarInputEventDetail } from '@ionic/core';
    import fuzzysort from 'fuzzysort';
    import { onDestroy, onMount } from 'svelte';
    import { FileEntry } from './FileEntry';
    import type FileSearchEntry from './FileSearchEntry';
    import VirtualList from './frontend/component/VirtualList.svelte';
    import type StateManager from './StateManager';
    import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

    interface Props {
        manager: StateManager;
    }

    let { manager }: Props = $props();

    const gameInstallManager = manager.gameInstallManager;
    const selectedContent = manager.selectedContent;
    const searchTerm = gameInstallManager.searchTerm;
    const searchResults = gameInstallManager.searchResults;
    const searchDuration = gameInstallManager.searchDuration;
    const searching = gameInstallManager.searching;

    let statsHidden = $derived($searchResults === null || $searchResults.length === 0);
    let searchbar: HTMLIonSearchbarElement | undefined = $state();
    let inputElement: HTMLInputElement | undefined = $state();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-redundant-type-constituents
    let virtualList: VirtualList<Fuzzysort.KeysResult<FileSearchEntry>> | undefined = $state();
    let start = 0;
    let end = 0;
    let { selectedIndex, selectedResult } = $derived(refresh($searchResults, $selectedContent));

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

    // fuzzysort moved the highlight method, but we only get a plain object from the BackgroundService
    // so we need to restore the prototype to get the highlight method back.
    const dummyResult = fuzzysort.go('dummy', ['dummy']);
    function restoreResult(item: unknown): Fuzzysort.KeysResult<FileSearchEntry> {
        let result = item as Fuzzysort.KeysResult<FileSearchEntry>;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!result[0].highlight) {
            result = Object.setPrototypeOf(
                result,
                dummyResult.constructor.prototype as object
            ) as Fuzzysort.KeysResult<FileSearchEntry>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            (result as any)[0] = Object.setPrototypeOf(
                result[0] as unknown,
                dummyResult[0].constructor.prototype as object
            ) as Fuzzysort.Result;
        }
        return result;
    }

    function highlight(item: unknown) {
        const result = restoreResult(item);
        return result[0].highlight();
    }

    async function onSelect(item: unknown) {
        selectedResult = item as Fuzzysort.KeysResult<FileSearchEntry>;
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
        $selectedContent = fileEntry;
    }

    function refresh(
        results: Fuzzysort.KeysResults<FileSearchEntry> | null,
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
        item: unknown,
        selectedResult: Fuzzysort.KeysResult<FileSearchEntry> | undefined
    ) {
        return item === selectedResult;
    }

    function scrollToCurrent(index = selectedIndex) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        virtualList?.scrollToIndex(index);
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
            searchbar?.setFocus().catch(console.error);
        } else if (event.key === 'Enter') {
            inputElement?.blur();
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
<ion-content>
    {#if $searchResults}
        <VirtualList bind:this={virtualList} items={$searchResults}>
            {#snippet children(data)}
                <div
                    class="result"
                    class:selected={isSelected(data, selectedResult)}
                    onclick={() => onSelect(data)}
                >
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html highlight(data)}
                </div>
            {/snippet}
        </VirtualList>
        <ion-chip
            class="result-stats"
            class:hidden={statsHidden}
            onclick={() => (statsHidden = true)}
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
