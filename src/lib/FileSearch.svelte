<script lang="ts">
    import type { SearchbarInputEventDetail } from '@ionic/core';
    import VirtualList from '@sveltejs/svelte-virtual-list';
    import fuzzysort from 'fuzzysort';
    import { onMount } from 'svelte';
    import type FileSearchEntry from './FileSearchEntry';
    import type StateManager from './StateManager';

    export let manager: StateManager;

    const gameInstallManager = manager.gameInstallManager;
    const searchTerm = gameInstallManager.searchTerm;
    const searchResults = gameInstallManager.searchResults;
    const searchDuration = gameInstallManager.searchDuration;
    const searching = gameInstallManager.searching;

    let searchRequest: NodeJS.Timeout | undefined = undefined;
    let statsHidden = false;

    function doSearch(input: string) {
        gameInstallManager.submitFileSearch(input).catch(console.error);
    }

    function requestSearch(input: string) {
        clearSearchRequest();
        searchRequest = setTimeout(() => doSearch(input), 200);
    }

    function clearSearchRequest() {
        if (searchRequest) {
            clearTimeout(searchRequest);
            searchRequest = undefined;
        }
    }

    function onSearch(event: CustomEvent<SearchbarInputEventDetail>) {
        const input = event.detail.value ?? '';

        if (input === '') {
            onClear();
        } else {
            requestSearch(input);
        }
    }

    function onClear() {
        gameInstallManager.clearFileSearch();
        clearSearchRequest();
    }

    function highlight(item: unknown) {
        const result = item as Fuzzysort.KeysResult<FileSearchEntry>;
        return fuzzysort.highlight(result[0]);
    }

    async function onSelect(item: unknown) {
        const result = item as Fuzzysort.KeysResult<FileSearchEntry>;
        // manager.selectedContent.set(result.obj);
        const gameInstall = gameInstallManager.getGameInstallForArchive(result.obj.archive);
        if (!gameInstall)
            return console.warn('GameInstall not found for search result', result.obj);
        const archiveEntry = gameInstall.getMnfArchiveEntry(result.obj.archive);
        if (!archiveEntry)
            return console.warn('Archive entry not found for search result', result.obj);
        const fileEntry = await archiveEntry.getFileEntry(result.obj.file);
        if (!fileEntry) return console.warn('File entry not found for search result', result.obj);
        manager.selectedContent.set(fileEntry);
    }

    function showStats(results: Fuzzysort.KeysResults<FileSearchEntry> | null) {
        if (results) {
            statsHidden = false;
        }
    }
    $: showStats($searchResults);

    onMount(() => doSearch($searchTerm));
</script>

<ion-header>
    <ion-toolbar>
        <ion-searchbar
            color="light"
            on:ionInput={onSearch}
            on:ionClear={onClear}
            value={$searchTerm}
        ></ion-searchbar>
        {#if $searching}
            <ion-progress-bar type="indeterminate" />
        {/if}
    </ion-toolbar>
</ion-header>
<ion-content>
    {#if $searchResults}
        <VirtualList items={$searchResults} let:item>
            <!-- eslint-disable-next-line svelte/valid-compile, eslint-disable-next-line svelte/no-at-html-tags -->
            <div class="result" on:click={() => onSelect(item)}>{@html highlight(item)}</div>
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
                {$searchResults.length.toLocaleString()} results found in {$searchDuration.toLocaleString()}ms
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
