<script lang="ts">
    import FileTree from '$lib/tree/FileTree.svelte';
    import { open } from '@tauri-apps/api/dialog';
    import { add } from 'ionicons/icons';
    import type StateManager from './StateManager';
    import FileTreeEntryData from './tree/FileTreeEntryData';
    import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

    export let manager: StateManager;

    const gameInstalls = manager.gameInstallManager.gameInstalls;

    async function addFolder() {
        const selected = await open({
            directory: true
        });

        if (typeof selected === 'string') {
            const gameInstall = await manager.gameInstallManager.add(selected);
            if (gameInstall) {
                manager.selectedContent.set(gameInstall);
            }
        }
    }

    function onSelect(event: CustomEvent<FileTreeEntryData<FileTreeEntryDataProvider>>) {
        manager.selectedContent.set(event.detail.data);
    }

    $: entries = Array.from($gameInstalls.values()).map((install) => install.fileTreeEntry);
</script>

<ion-content>
    {#await manager.gameInstallManager.initialize()}
        <div class="status">
            <p>Loading...</p>
            <ion-progress-bar type="indeterminate" />
        </div>
    {:then}
        {#if entries.length === 0}
            <div class="status">
                <p>No game installs found</p>
            </div>
        {:else}
            <FileTree {entries} on:select={onSelect} />
        {/if}

        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-fab-button on:click={addFolder}>
                <ion-icon icon={add} />
            </ion-fab-button>
        </ion-fab>
    {:catch}
        <div class="status">
            <p>Failed to initialize</p>
        </div>
    {/await}
</ion-content>

<style>
    .status {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .status {
        text-align: center;
    }
</style>
